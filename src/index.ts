import { Hono } from "hono";
import { cors } from "hono/cors";
import { Buffer } from "buffer";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Add CORS for frontend access
app.use("/*", cors());

app.get("/", (c) => {
  return c.text("Postcard Generator API - Running");
});

app.post("/api/image/prompt", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Request body:", body);
    
    const { city } = body;

    if (!city) {
      return c.json({ error: "City is required" }, 400);
    }

    console.log("Calling AI for city:", city);

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

    console.log("AI Response:", JSON.stringify(response, null, 2));

    let imagePrompt = "";

    // Parse response based on actual structure
    if (response && response.response) {
      imagePrompt = response.response;
    } else if (response && typeof response === 'string') {
      imagePrompt = response;
    } else {
      console.error("Unexpected response format:", response);
      return c.json({ 
        error: "Unexpected AI response format",
        debug: response 
      }, 500);
    }

    return c.json({ 
      city, 
      imagePrompt: imagePrompt.trim() 
    });

  } catch (error: any) {
    console.error("Error in /api/image/prompt:", error);
    return c.json({ 
      error: "Failed to generate prompt",
      message: error.message,
      stack: error.stack
    }, 500);
  }
});

app.post("/api/image/generation", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Image generation request:", body);

    const { imagePrompt, city } = body;

    if (!imagePrompt) {
      return c.json({ error: "Image prompt is required" }, 400);
    }

    // Retry logic for capacity issues
    const maxRetries = 3;
    const baseDelay = 1000;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Attempting image generation (attempt ${attempt + 1}/${maxRetries})`);

        const generateImage = await c.env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
          prompt: `${imagePrompt}, postcard style, high quality, scenic view`,
        });

        if (!generateImage || !generateImage.image) {
          throw new Error("No image in response");
        }

        const base64Image = generateImage.image;
        const buffer = Buffer.from(base64Image, "base64");

        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `inline; filename="postcard-${city || 'image'}.png"`,
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);

        if (error.message?.includes("Capacity") || error.message?.includes("3040")) {
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Waiting ${delay}ms before retry...`);
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

// Favicon handler to stop 404 errors
app.get("/favicon.ico", (c) => {
  return new Response(null, { status: 204 });
});

export default app;