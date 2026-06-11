# Epscrap - Technical Documentation

**Project**: Epscrap - Developer Job Board Aggregator
**School**: EPSI
**Stack**: Node.js / Express / PostgreSQL / React / TypeScript
**Date**: June 2025

---

## 1. Project Overview

Epscrap is a web application that automatically aggregates developer job offers from multiple public APIs across Europe, with a strong focus on apprenticeship contracts (alternance) in France. The data is stored in a PostgreSQL database and exposed through a REST API, consumed by a React dashboard.

The main goals of the project are:

- Centralise developer job offers from 7 different sources into a single database
- Prioritise French apprenticeship contracts (alternance, professionnalisation)
- Provide a clean, filtered dashboard to browse offers by technology, contract type, and location
- Automate daily scraping via a scheduled cron job

---

## 2. Architecture

The application follows a clear separation of concerns:

```
Public APIs (Remotive, Arbeitnow, France Travail, Adzuna...)
        |
        v
  fetchJobs.js       <- HTTP calls to each source, raw data mapping
        |
        v
  processJobs.js     <- normalisation, encoding fix, tech extraction, contract detection
        |
        v
  jobService.js      <- INSERT into PostgreSQL, URL-based deduplication
        |
        v
  PostgreSQL (table: jobs)
        |
        v
  Express REST API   <- GET /api/jobs, GET /api/stats/*, POST /api/run
        |
        v
  React Dashboard    <- filters, job table, metric cards, pagination
```

---

## 3. Data Sources

The following public APIs are integrated:

| Source | Coverage | Authentication |
|--------|----------|----------------|
| Remotive | Remote dev jobs worldwide | None required |
| Arbeitnow | Europe-wide tech jobs | None required |
| Jobicy | Remote engineering jobs | None required |
| RemoteOK | Remote dev jobs | None required |
| The Muse | Software engineering positions | None required |
| France Travail | French job market (all contracts) | OAuth2, free registration |
| Adzuna | 8 European countries | API key, free registration |

Each source is implemented as an independent async function in `fetchJobs.js`. All sources run in parallel using `Promise.allSettled`, which ensures that a failure in one source does not block the others.

---

## 4. Data Pipeline

### 4.1 Fetching

Each source function (`fetchRemotive`, `fetchArbeitnow`, etc.) calls the relevant API and maps the raw response into a normalised job object with the following shape:

```json
{
  "title": "...",
  "company": "...",
  "location": "...",
  "description": "...",
  "date_posted": "...",
  "source": "remotive",
  "url": "https://..."
}
```

### 4.2 France Travail specifics

France Travail uses OAuth2 client credentials. A token is obtained before each scraping session using the `client_credentials` grant type. The API is then queried with ROME codes (French occupational classification) specific to software development:

- M1805: Systems and network studies and development
- M1801: Administration of computing resources
- M1802: IT audit and consulting
- M1810: Production and IT exploitation
- M1811: IT support and user assistance

The API response includes a native `alternance` boolean field and a `typeContratLibelle` field which are used to accurately classify contract types, avoiding the need for keyword-only detection.

French job locations use department codes (e.g., "92 - Levallois-Perret"). To ensure location-based filtering works correctly, the string ", France" is appended to all France Travail locations that do not already contain it.

### 4.3 Processing

The `processJobs.js` module handles:

- **Encoding fix**: some sources return mojibake (UTF-8 data misread as Latin-1, producing strings like "Ã©" instead of "e"). This is corrected using `Buffer.from(str, 'latin1').toString('utf8')`.
- **HTML stripping**: descriptions from some APIs contain HTML tags and entities, which are removed.
- **Technology extraction**: the job title and description are scanned against a predefined list of technologies (React, Node.js, Python, Docker, TypeScript, etc.).
- **Contract type detection**: a keyword-matching system scans the title and description for contract indicators. France Travail jobs bypass this and use their native fields directly.

### 4.4 Storage

Jobs are stored in PostgreSQL using `ON CONFLICT (url) DO NOTHING`. The `url` field is unique, which provides automatic deduplication across scraping runs. This means the scraping can be run multiple times without creating duplicate entries.

---

## 5. Database Schema

```sql
CREATE TABLE jobs (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  company       TEXT,
  location      TEXT,
  tech_stack    TEXT[],
  contract_type TEXT,
  date_posted   TIMESTAMP,
  source        TEXT,
  url           TEXT UNIQUE
);
```

The `tech_stack` column uses a PostgreSQL array type, allowing direct filtering with `= ANY(tech_stack)`.

Contract types stored: `alternance`, `cdi`, `cdd`, `freelance`, `internship`, `other`.

---

## 6. REST API

The Express server exposes the following endpoints:

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/run | Triggers the full scraping pipeline |
| GET | /api/jobs | Returns job listings with optional filters |
| GET | /api/jobs/count | Returns the total count matching the filters |
| GET | /api/stats/sources | Returns job count grouped by source |
| GET | /api/stats/tech | Returns top technologies detected |
| GET | /api/stats/location | Returns job count grouped by location |

Available query parameters for `/api/jobs`:

- `tech` - filter by technology name (e.g., React)
- `contract` - filter by contract type (e.g., alternance)
- `location` - partial match on location field (e.g., France)
- `source` - filter by data source
- `limit` - maximum number of results (default: 500)
- `offset` - pagination offset (default: 0)

---

## 7. Automated Scheduling (Cron)

The application includes an automated daily scraping job using the `node-cron` library. The cron job is configured to run every day at midnight:

```javascript
cron.schedule("0 0 * * *", () => {
  runPipeline().catch((err) => console.error("[cron] error:", err));
});
```

This ensures the database stays up to date without manual intervention. The job uses the same pipeline as the manual trigger (`POST /api/run`), meaning it fetches, processes, and inserts new offers while skipping duplicates.

---

## 8. Frontend Dashboard

The React frontend is built with Vite, TypeScript, and Tailwind CSS. It communicates with the backend API through a Vite proxy (all `/api/*` requests are forwarded to `localhost:3001`).

Key features:

- **Metric cards**: total job count, alternance count, French job count, active sources count
- **Filter bar**: dropdowns for technology and contract type, text input for location. Filters are applied only when "Lancer le scraping" is clicked, not on each keystroke.
- **Job table**: fixed CSS grid layout with 6 columns (title, location, contract, source, stack, link). Titles are truncated with ellipsis to maintain column alignment.
- **Pagination**: 50 results are shown at a time, with a "Voir plus" button to load the next batch client-side.
- **Toast notifications**: brief feedback messages on scraping completion or errors.

The colour palette used throughout the UI:

| Variable | Hex | Usage |
|----------|-----|-------|
| --c-dark | #222222 | Column headers, text |
| --c-primary | #1c5d99 | Blue accent, buttons, alternance badge |
| --c-secondary | #639fab | Labels, subtitles |
| --c-light | #bbcde5 | Borders, muted accents |
| --c-bg | #f0f5f9 | Page background |

---

## 9. Environment Variables

The backend reads configuration from a `.env` file (not committed to version control):

```
DATABASE_URL=postgres://user:password@localhost:5432/jobsdb
PORT=3001
FRANCE_TRAVAIL_CLIENT_ID=...
FRANCE_TRAVAIL_CLIENT_SECRET=...
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
```

France Travail credentials are obtained by registering at francetravail.io and creating an application with the `api_offresdemploiv2` scope.

Adzuna credentials are obtained by registering at developer.adzuna.com and creating a free application.

---

## 10. Setup and Running

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone git@github.com:nicochnz/veille_tech_project_epsi.git
cd veille_tech_project_epsi

# Create the database and table
psql -U postgres -c "CREATE DATABASE jobsdb;"
psql -U postgres -d jobsdb -f backend/schema.sql

# Install backend dependencies and start
cd backend
cp .env.example .env
npm install
npm run dev

# Install frontend dependencies and start (new terminal)
cd frontend
npm install
npm run dev
```

The dashboard is available at `http://localhost:5173`. The API runs on `http://localhost:3001`.

### First scrape

Click the "Lancer le scraping" button in the dashboard, or send a POST request:

```bash
curl -X POST http://localhost:3001/api/run
```

---

## 11. Project Limitations and Possible Improvements

- France Travail API pagination via Range header does not support offset, limiting results to the first 150 unique jobs per scraping run.
- La Bonne Alternance API (a specialised French apprenticeship platform) is currently disabled due to an unreachable endpoint.
- Salary data is not available from most sources and is not stored.
- Pagination is handled client-side; backend pagination via `limit/offset` exists but is not yet wired to the frontend scroll.
- Possible future additions: email alerts for new alternance offers, CSV export, deployment on Railway and Vercel.
