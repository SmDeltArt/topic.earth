(async () => {
  const {
    buildTopicSummary,
    translateTextToFrench
  } = await import("../api/mcp.js");

  const summary = buildTopicSummary({
    title: "AMOC slowdown",
    text: "The Atlantic Meridional Overturning Circulation moves heat through the Atlantic. A weakening circulation can affect European weather, sea level, rainfall, and food systems.",
    region: "North Atlantic",
    source: "topic.earth local topic"
  });

  const translation = translateTextToFrench("Settings language topic summary");

  if (!summary.includes("AMOC slowdown")) {
    throw new Error("topic_summary helper did not include the topic title.");
  }

  if (!translation.includes("Parametres") || !translation.includes("Langue")) {
    throw new Error("translate_to_french helper did not translate expected UI words.");
  }

  console.log("MCP helper checks passed.");
})();
