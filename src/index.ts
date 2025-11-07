import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: CloudflareBindings }>();

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

    // Free Hugging Face Inference API
    const HF_TOKEN = c.env.HF_TOKEN; // Add this to your wrangler.toml secrets
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `${imagePrompt}, postcard style, scenic, beautiful`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status}`);
    }

    // Response is binary image
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return c.json({
      success: true,
      image: base64Image,
      city: city || "Unknown",
      name: name || "Anonymous",
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Error:", error);
    return c.json({ 
      error: "Failed to generate image",
      message: error.message
    }, 500);
  }
});

// Favicon
app.get("/favicon.ico", (c) => {
  return new Response(null, { status: 204 });
});

export default app;