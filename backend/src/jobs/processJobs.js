const { TECHS, CONTRACT_KEYWORDS } = require("../constants");

function fixEncoding(str) {
  if (!str) return "";
  if (str.includes("Ã")) {
    try {
      const fixed = Buffer.from(str, "latin1").toString("utf8");
      if (fixed.split("Ã").length < str.split("Ã").length) return fixed;
    } catch {}
  }
  return str;
}

function stripHtml(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(str) {
  return fixEncoding(stripHtml(str || ""));
}

function extractTechs(text) {
  const lower = text.toLowerCase();
  return TECHS.filter((t) => lower.includes(t.toLowerCase()));
}

function detectContractType(job) {
  if (job.contract_type) return job.contract_type;

  const haystack = `${job.title} ${job.description}`.toLowerCase();
  for (const [type, keywords] of Object.entries(CONTRACT_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw))) return type;
  }
  return "other";
}

function processJobs(rawJobs) {
  return rawJobs
    .filter((job) => job.url && job.title)
    .map((job) => ({
      title: clean(job.title),
      company: clean(job.company || ""),
      location: clean(job.location || ""),
      tech_stack: extractTechs(clean(`${job.title} ${job.description}`)),
      contract_type: detectContractType(job),
      date_posted: job.date_posted,
      source: job.source,
      url: job.url,
    }));
}

module.exports = { processJobs };
