import { preparePublicRequest, sendJson } from "./_security.js";

export default function handler(req, res) {
  if (!preparePublicRequest(req, res, ["GET"])) return;
  return sendJson(res, 200, {
    status: "ok",
    services: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      moonshot: Boolean(process.env.MOONSHOT_API_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    },
  });
}
