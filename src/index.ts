import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Add CORS
app.use("/*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.get("/", async (c) => {
  // Serve your HTML file here
  const html = await fetch(new URL('./index.html', import.meta.url));
  return c.html(await html.text());
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

// Images list endpoint
app.get("/api/images", (c) => {
  return c.json({ images: [] });
});

app.post("/api/image/prompt", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Prompt request:", body);
    
    const { city } = body;

    if (!city) {
      return c.json({ error: "City is required" }, 400);
    }

    console.log("Generating prompt for:", city);

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

    console.log("AI Response structure:", JSON.stringify(response, null, 2));

    let imagePrompt = "";
    
    // Try multiple response formats
    if (response?.response) {
      imagePrompt = response.response;
    } else if (response?.result?.response) {
      imagePrompt = response.result.response;
    } else if (typeof response === 'string') {
      imagePrompt = response;
    } else {
      console.error("Unexpected response format:", response);
      imagePrompt = `A beautiful scenic postcard view of ${city}, featuring iconic landmarks, vibrant colors, vintage postcard style, high quality`;
    }

    console.log("Generated prompt:", imagePrompt);

    return c.json({ 
      city, 
      imagePrompt: imagePrompt.trim() 
    });

  } catch (error: any) {
    console.error("Error in /api/image/prompt:", error);
    console.error("Error stack:", error.stack);
    return c.json({ 
      error: "Failed to generate prompt",
      message: error.message,
      details: error.stack
    }, 500);
  }
});

app.post("/api/image/generation", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Image generation request:", body);

    const { imagePrompt, city, name } = body;

    if (!imagePrompt) {
      console.error("No imagePrompt provided");
      return c.json({ error: "Image prompt is required" }, 400);
    }

    console.log("Generating image with prompt:", imagePrompt);

    // Retry logic
    const maxRetries = 3;
    const baseDelay = 2000;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt + 1}/${maxRetries}`);

        const generateImage = await c.env.AI.run(
          "@cf/stabilityai/stable-diffusion-xl-base-1.0",
          {
            prompt: `${imagePrompt}, postcard style, high quality, scenic view, professional photography`,
          }
        );

        console.log("Image generation response received");

        if (!generateImage) {
          throw new Error("No response from AI model");
        }

        if (!generateImage.image) {
          console.error("Response structure:", JSON.stringify(generateImage, null, 2));
          throw new Error("No image in response");
        }

        console.log("Image generated successfully, size:", generateImage.image.length);

        // Return JSON with base64 image
        return c.json({
          success: true,
          image: generateImage.image,
          city: city || "Unknown",
          name: name || "Anonymous",
          timestamp: new Date().toISOString()
        });

      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        console.error("Error details:", error);

        // Check if it's a capacity error
        const isCapacityError = 
          error.message?.includes("Capacity") || 
          error.message?.includes("3040") ||
          error.message?.includes("temporarily exceeded");

        if (isCapacityError && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Capacity issue detected. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If it's not a capacity error or last attempt, break
        if (!isCapacityError || attempt === maxRetries - 1) {
          break;
        }
      }
    }

    // All retries failed
    console.error("All retry attempts failed. Last error:", lastError);
    
    return c.json({ 
      error: lastError?.message?.includes("Capacity") 
        ? "AI service is at capacity. Please try again in a moment."
        : "Failed to generate image",
      message: lastError?.message || "Unknown error",
      code: lastError?.message?.includes("Capacity") ? "CAPACITY_EXCEEDED" : "GENERATION_FAILED"
    }, 503);

  } catch (error: any) {
    console.error("Error in /api/image/generation:", error);
    console.error("Error stack:", error.stack);
    return c.json({ 
      error: "Failed to generate image",
      message: error.message,
      details: error.stack
    }, 500);
  }
});

// Favicon
app.get("/favicon.ico", (c) => {
  return new Response(null, { status: 204 });
});

export default app;