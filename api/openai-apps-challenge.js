const TOKEN = "CioVK7UMxqGHgH3vHMDnn3Z7Pe1ZdVDM5Rd0aJXQS1I";

module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 200;
  res.end(TOKEN);
};
