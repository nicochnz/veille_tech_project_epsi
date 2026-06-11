require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const { fetchAll } = require("./jobs/fetchJobs");
const { processJobs } = require("./jobs/processJobs");
const { saveJobs, getJobs, countJobs, getStatsByTech, getStatsByLocation, getStatsBySources } = require("./jobs/jobService");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function runPipeline() {
  console.log("[pipeline] start");
  const raw = await fetchAll();
  const processed = processJobs(raw);
  const result = await saveJobs(processed);
  console.log(`[pipeline] done: +${result.inserted} nouvelles, ${result.skipped} ignorees`);
  return result;
}

app.post("/api/run", async (req, res) => {
  try {
    const result = await runPipeline();
    res.json({ data: result, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Pipeline failed" });
  }
});

app.get("/api/jobs", async (req, res) => {
  try {
    const { tech, location, contract, source, limit, offset } = req.query;
    const jobs = await getJobs({
      tech,
      location,
      contract,
      source,
      limit: limit ? parseInt(limit) : 500,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ data: jobs, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Failed to fetch jobs" });
  }
});

app.get("/api/jobs/count", async (req, res) => {
  try {
    const { tech, location, contract, source } = req.query;
    const total = await countJobs({ tech, location, contract, source });
    res.json({ data: { total }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Failed to count jobs" });
  }
});

app.get("/api/stats/sources", async (req, res) => {
  try {
    res.json({ data: await getStatsBySources(), error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Failed" });
  }
});

app.get("/api/stats/tech", async (req, res) => {
  try {
    res.json({ data: await getStatsByTech(), error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Failed" });
  }
});

app.get("/api/stats/location", async (req, res) => {
  try {
    res.json({ data: await getStatsByLocation(), error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Failed" });
  }
});

cron.schedule("0 0 * * *", () => {
  runPipeline().catch((err) => console.error("[cron] error:", err));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
