import { Hono } from "hono";
import { type Env } from "../db";

export const aiRoutes = new Hono<{ Bindings: Env }>();

aiRoutes.post("/insights", async (c) => {
  try {
    const body = await c.req.json();
    const apiKey = c.env.GEMINI_API_KEY;

    if (!apiKey) {
      return c.json({ ok: false, error: "AI not configured" }, 500);
    }

    const prompt = `You are an elite fitness and nutrition coach. You are giving a user a brief, punchy, actionable piece of advice or encouragement based on their current stats.
Keep it extremely concise (1-2 sentences maximum, under 20 words if possible).
Do not use formatting like bold or italics.
Use a single emoji at the start if appropriate.

User's current data context:
${JSON.stringify(body, null, 2)}

Provide the insight now:`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Gemini API error response:", errorText);
      return c.json({ ok: false, error: "AI API error" }, 500);
    }

    const data = (await res.json()) as any;
    const insight = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Keep pushing, you're doing great!";

    return c.json({ ok: true, insight: insight.trim() });
  } catch (err: any) {
    console.error("Gemini AI error:", err);
    return c.json({ ok: false, error: "Failed to generate insight" }, 500);
  }
});
