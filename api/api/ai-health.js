/**
 * /api/ai-health — Returns boolean availability of each configured AI service
 *
 * Ported from private/streaming-studio/app/api/ai-health/route.ts
 * Adapted to Vercel Serverless Function (req/res) format used by widgets.
 *
 * SECURITY:
 * - Returns ONLY boolean flags — never returns actual key values
 * - Safe to call from browser code
 *
 * Usage: GET /api/ai-health
 * Response: { openai: boolean, elevenlabs: boolean, cloudinary: boolean }
 */

export default function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Content-Type", "application/json");
    res.status(405).end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).end(
    JSON.stringify({
      openai: Boolean(process.env.OPENAI_API_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
      cloudinary: Boolean(process.env.CLOUDINARY_API_SECRET),
    }),
  );
}
