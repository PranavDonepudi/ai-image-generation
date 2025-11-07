import { Hono } from "hono";
import { cors } from "hono/cors";
import { Buffer } from "buffer";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Add CORS
app.use("/*", cors());

app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>... your HTML here ...</html>
  `);
});

// Colo info endpoint
app.get("/api/colo", (c) => {
  const cf = c.req.raw.cf;
  return c.json({
    city: cf?.city || "Unknown",
    country: cf?.country || "Unknown",
    colo: cf?.colo || "Unknown"
  });
});

// Images list endpoint (returns empty for now since we're not using R2)
app.get("/api/images", (c) => {
  // Since you're not storing images, return empty array
  // The frontend will show "No postcards yet"
  return c.json({
    images: []
  });
});

app.post("/api/image/prompt", async (c) => {
  try {
    const { city } = await c.req.json();

    if (!city) {
      return c.json({ error: "City is required" }, 400);
    }

    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are an expert prompt engineer. Create detailed prompts for generating postcard-style images. Return ONLY the prompt text, nothing else."
        },
        {
          role: "user",
          content: `Create a detailed image generation prompt for a postcard of ${city}. The image should capture the essence and beauty of this location in a classic postcard style.`
        }
      ]
    });

    let imagePrompt = "";
    if (response && response.response) {
      imagePrompt = response.response;
    }

    return c.json({ 
      city, 
      imagePrompt: imagePrompt.trim() 
    });

  } catch (error: any) {
    console.error("Error in /api/image/prompt:", error);
    return c.json({ 
      error: "Failed to generate prompt",
      message: error.message
    }, 500);
  }
});

// IMPORTANT: This endpoint needs to return JSON with base64 image
// NOT binary data, because your frontend expects JSON
app.post("/api/image/generation", async (c) => {
  try {
    const { imagePrompt, city, name } = await c.req.json();

    if (!imagePrompt) {
      return c.json({ error: "Image prompt is required" }, 400);
    }

    // Retry logic for capacity issues
    const maxRetries = 3;
    const baseDelay = 1000;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const generateImage = await c.env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
          prompt: `${imagePrompt}, postcard style, high quality, scenic view`,
        });

        if (!generateImage || !generateImage.image) {
          throw new Error("No image in response");
        }

        // Return JSON with base64 image and metadata
        // This is what your frontend expects!
        return c.json({
          success: true,
          image: generateImage.image, // base64 string
          city,
          name,
          timestamp: new Date().toISOString()
        });

      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);

        if (error.message?.includes("Capacity") || error.message?.includes("3040")) {
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          throw error;
        }
      }
    }

    return c.json({ 
      error: "Service temporarily unavailable",
      code: "CAPACITY_EXCEEDED"
    }, 503);

  } catch (error: any) {
    console.error("Error in /api/image/generation:", error);
    return c.json({ 
      error: "Failed to generate image",
      message: error.message
    }, 500);
  }
});

// Favicon handler
app.get("/favicon.ico", (c) => {
  return new Response(null, { status: 204 });
});

export default app;