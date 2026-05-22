const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { z } = require("zod");

const SERVER_NAME = "topic.earth";
const SERVER_VERSION = "0.1.0";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentences(text, maxLength) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";

  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  let result = "";

  for (const sentence of sentences) {
    const next = cleanText(`${result} ${sentence}`);
    if (next.length > maxLength && result) break;
    result = next;
    if (result.length >= maxLength) break;
  }

  if (result.length <= maxLength) return result;
  return `${result.slice(0, maxLength - 1).trim()}...`;
}

function buildTopicSummary(input) {
  const title = cleanText(input.title) || "Untitled topic";
  const body = firstSentences(input.text || input.summary || input.description, 700);
  const location = cleanText([input.region, input.country].filter(Boolean).join(", "));
  const source = cleanText(input.source || input.url);
  const date = cleanText(input.date);

  const lines = [
    `Topic: ${title}`,
    body ? `Summary: ${body}` : "Summary: No topic text was provided yet.",
    location ? `Location: ${location}` : "",
    date ? `Date: ${date}` : "",
    source ? `Source: ${source}` : "",
    "Why it matters: This topic can help users connect Earth-scale climate signals with regional action and sustainable initiatives."
  ];

  return lines.filter(Boolean).join("\n");
}

const FRENCH_GLOSSARY = new Map([
  ["settings", "Parametres"],
  ["language", "Langue"],
  ["auto-detect from browser", "Detection automatique depuis le navigateur"],
  ["detected", "Detecte"],
  ["text-to-speech", "Lecture vocale"],
  ["enable text-to-speech", "Activer la lecture vocale"],
  ["browser voice", "Voix du navigateur"],
  ["translate", "Traduire"],
  ["read aloud", "Lire a voix haute"],
  ["topic", "Sujet"],
  ["layer", "Couche"],
  ["admin mode", "Mode admin"],
  ["regional mode", "Mode regional"],
  ["map search", "Recherche sur la carte"],
  ["submit", "Soumettre"],
  ["remove", "Supprimer"],
  ["source", "Source"],
  ["summary", "Resume"],
  ["climate", "Climat"],
  ["global warming", "Rechauffement climatique"],
  ["sustainable initiative", "Initiative durable"]
]);

function translateTextToFrench(text) {
  const original = cleanText(text);
  if (!original) return "Aucun texte a traduire.";

  const exact = FRENCH_GLOSSARY.get(original.toLowerCase());
  if (exact) return exact;

  let translated = original;
  for (const [english, french] of FRENCH_GLOSSARY.entries()) {
    const pattern = new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    translated = translated.replace(pattern, french);
  }

  if (translated !== original) return translated;

  return [
    "Traduction francaise a finaliser:",
    original,
    "",
    "Note: connect OPENAI_API_KEY on the deployed MCP server to replace this safe starter translation with full AI translation."
  ].join("\n");
}

function createTopicEarthMcpServer() {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  server.registerTool(
    "topic_summary",
    {
      title: "Topic Summary",
      description: "Summarizes a topic.earth item with concise context and why it matters.",
      inputSchema: {
        title: z.string().optional().describe("Topic title."),
        text: z.string().optional().describe("Main topic text."),
        summary: z.string().optional().describe("Existing summary, when available."),
        description: z.string().optional().describe("Longer topic description, when available."),
        region: z.string().optional().describe("Region related to the topic."),
        country: z.string().optional().describe("Country related to the topic."),
        date: z.string().optional().describe("Topic date or publication date."),
        source: z.string().optional().describe("Source title or reference."),
        url: z.string().url().optional().describe("Source URL, when available.")
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        "openai/toolInvocation/invoking": "Summarizing topic...",
        "openai/toolInvocation/invoked": "Topic summary ready"
      }
    },
    async (input) => ({
      content: [
        {
          type: "text",
          text: buildTopicSummary(input)
        }
      ]
    })
  );

  server.registerTool(
    "translate_to_french",
    {
      title: "Translate to French",
      description: "Translates selected topic.earth UI or topic text to French while preserving names, numbers, dates, and source titles.",
      inputSchema: {
        text: z.string().min(1).describe("Selected text to translate."),
        context: z.string().optional().describe("Optional UI or topic context.")
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        "openai/toolInvocation/invoking": "Translating to French...",
        "openai/toolInvocation/invoked": "French translation ready"
      }
    },
    async ({ text }) => ({
      content: [
        {
          type: "text",
          text: translateTextToFrench(text)
        }
      ]
    })
  );

  return server;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.setHeader("Cache-Control", "no-store");
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : undefined;

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET,POST,DELETE,OPTIONS");
    res.end("Method not allowed");
    return;
  }

  const server = createTopicEarthMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  await server.connect(transport);
  const parsedBody = req.method === "POST" ? await readJsonBody(req) : undefined;
  await transport.handleRequest(req, res, parsedBody);
};

module.exports.createTopicEarthMcpServer = createTopicEarthMcpServer;
module.exports.buildTopicSummary = buildTopicSummary;
module.exports.translateTextToFrench = translateTextToFrench;
