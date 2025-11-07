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

    if (!city) {
      return c.json({ error: "City is required" }, 400);
    }

    console.log(`Fetching photo for: ${city}`);

    // Unsplash API - completely free, very reliable
    const UNSPLASH_ACCESS_KEY = c.env.UNSPLASH_ACCESS_KEY || 'YOUR_KEY_HERE';
    
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(city + ' landmark postcard')}&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.urls.regular;

    // Fetch the actual image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    console.log("Photo fetched successfully!");

    return c.json({
      success: true,
      image: base64Image,
      city: city || "Unknown",
      name: name || "Anonymous",
      timestamp: new Date().toISOString(),
      photographer: data.user.name,
      service: "Unsplash"
    });

  } catch (error: any) {
    console.error("Error generating image:", error);
    return c.json({ 
      error: "Failed to fetch image",
      message: error.message
    }, 500);
  }
});

// Favicon
app.get("/favicon.ico", (c) => {
  return new Response(null, { status: 204 });
});

export default app;