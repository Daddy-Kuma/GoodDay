module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.status(200).json({
    ok: true,
    runtime: "vercel-function",
    buildId: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    upstream: "sporttery-football-crs",
    now: new Date().toISOString(),
  });
};
