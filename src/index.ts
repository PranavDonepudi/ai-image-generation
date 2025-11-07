import { Hono } from "hono";
import { cors } from "hono/cors";
import {Buffer} from 'buffer';
const app = new Hono<{ Bindings: CloudflareBindings }>();

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests
// Add CORS
app.use("/*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.get("/", (c) => {
  return c.text("Postcard Generator API");
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
    if (response?.response) {
      imagePrompt = response.response;
    } else if (typeof response === 'string') {
      imagePrompt = response;
    } else {
      imagePrompt = `A beautiful scenic postcard view of ${city}, featuring iconic landmarks, vibrant colors, vintage postcard style, high quality`;
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

app.post("/api/image/generation", async (c) => {
  try {
    const { imagePrompt, city, name } = await c.req.json();

    if (!imagePrompt) {
      return c.json({ error: "Image prompt is required" }, 400);
    }

    // Rate limiting protection
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limit protection: waiting ${waitTime}ms`);
      await new Promise(r => setTimeout(r, waitTime));
    }
    
    lastRequestTime = Date.now();

    console.log("Generating image with Pollinations.ai...");

    const encodedPrompt = encodeURIComponent(imagePrompt);
    // Add random seed to avoid cache issues
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

    console.log("Fetching image from:", imageUrl);

    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    console.log("Image generated successfully!");

        return c.json({
          success: true,
          image: base64Image,
          city: city || "Unknown",
          name: name || "Anonymous",
          timestamp: new Date().toISOString(),
          modelUsed: model
        });

      } catch (error: any) {
        console.error(`Model ${model} error:`, error.message);
        lastError = error;
        continue;
      }
    }

    // All models failed
    console.error("All models failed. Last error:", lastError);
    
    return c.json({ 
      error: "Failed to generate image. The AI models may be loading or temporarily unavailable.",
      message: lastError?.message || "Unknown error",
      code: "GENERATION_FAILED"
    }, 500);

  } catch (error: any) {
    console.error("Error in /api/image/generation:", error);
    return c.json({ 
      error: "Failed to generate image. Please wait a moment and try again.",
      message: error.message
    }, 500);
  }
});

// Favicon
app.get("/favicon.ico", (c) => {
  return new Response(null, { status: 204 });
});

export default app;