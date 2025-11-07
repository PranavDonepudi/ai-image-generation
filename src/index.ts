import { Hono } from "hono";
import { Buffer} from "buffer";
const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

app.post("/api/image/prompt", async (c) => {
  const { city } = await c.req.json();
  let imagePrompt: string = "";
  const response = await c.env.AI.run("@cf/openai/gpt-oss-20b", {
    input: city,
    instructions:
      "You are an expert prompt engineer. You help the user write prompts that can be used to generate high quality images using AI image generation models.  The style of the image should always be similar to a Postcard. If the user's prompt is not related to image generation, you politely inform them that you can only help with image generation prompts. You only return the detailed prompt. No other text should be returned.",
  });
  // Extracting the AI's message from the response
  if (response && response.output) {
    // Find the AI message in the response
    let aiMessage = response.output.find(
      (item) => item.type === "message" && item.role === "assistant"
    );
    // Extract the text output from the AI message
    if (aiMessage && Array.isArray(aiMessage.content)) {
      imagePrompt =
        aiMessage.content.find((c) => c.type === "output_text")?.text ?? "";
    }
  }
  return c.json({ city, imagePrompt });
});

app.post("/api/image/generation", async (c) => {
  const { imagePrompt, city, name } = await c.req.json();

  // Call the Leonardo model to generate an image based on the prompt
  const generateImage = await c.env.AI.run("@cf/leonardo/lucid-origin", {
    prompt: imagePrompt,
    num_steps: 3,
  });

  if (!generateImage || !generateImage.image) {
    return c.json({ message: `Failed to generate image` }, 500);
  }

  // The image is returned as a base64-encoded string
  const base64Image = generateImage.image;

  // Use the image property from the response
  const buffer = Buffer.from(base64Image, "base64");
  return new Response(buffer, {
    status: 200,
  });
});

export default app;