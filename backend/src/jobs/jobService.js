const pool = require("../db");

async function saveJobs(jobs) {
  let inserted = 0;
  let skipped = 0;

  for (const job of jobs) {
    const result = await pool.query(
      `INSERT INTO jobs (title, company, location, tech_stack, contract_type, date_posted, source, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (url) DO NOTHING`,
      [job.title, job.company, job.location, job.tech_stack, job.contract_type, job.date_posted, job.source, job.url]
    );
    if (result.rowCount > 0) inserted++;
    else skipped++;
  }

  return { inserted, skipped };
}

async function getJobs({ tech, location, contract, source, limit = 500, offset = 0 }) {
  const conditions = [];
  const params = [];

  if (tech) {
    params.push(tech);
    conditions.push(`$${params.length} = ANY(tech_stack)`);
  }
  if (location) {
    params.push(`%${location}%`);
    conditions.push(`location ILIKE $${params.length}`);
  }
  if (contract) {
    params.push(contract);
    conditions.push(`contract_type = $${params.length}`);
  }
  if (source) {
    params.push(source);
    conditions.push(`source = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT id, title, company, location, tech_stack, contract_type, date_posted, source, url
     FROM jobs
     ${where}
     ORDER BY date_posted DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function countJobs({ tech, location, contract, source }) {
  const conditions = [];
  const params = [];

  if (tech) { params.push(tech); conditions.push(`$${params.length} = ANY(tech_stack)`); }
  if (location) { params.push(`%${location}%`); conditions.push(`location ILIKE $${params.length}`); }
  if (contract) { params.push(contract); conditions.push(`contract_type = $${params.length}`); }
  if (source) { params.push(source); conditions.push(`source = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(`SELECT COUNT(*) FROM jobs ${where}`, params);
  return parseInt(rows[0].count);
}

async function getStatsBySources() {
  const { rows } = await pool.query(`
    SELECT source, COUNT(*) AS count
    FROM jobs GROUP BY source ORDER BY count DESC
  `);
  return rows;
}

async function getStatsByTech() {
  const { rows } = await pool.query(`
    SELECT unnest(tech_stack) AS tech, COUNT(*) AS count
    FROM jobs GROUP BY tech ORDER BY count DESC LIMIT 20
  `);
  return rows;
}

async function getStatsByLocation() {
  const { rows } = await pool.query(`
    SELECT location, COUNT(*) AS count
    FROM jobs GROUP BY location ORDER BY count DESC LIMIT 20
  `);
  return rows;
}

module.exports = { saveJobs, getJobs, countJobs, getStatsByTech, getStatsByLocation, getStatsBySources };
