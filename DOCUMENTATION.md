# Epscrap - Technical Documentation

**Project**: Epscrap - Developer Job Board Aggregator
**School**: EPSI
**Stack**: Node.js / Express / PostgreSQL / React / TypeScript
**Date**: June 2026

---

## 1. Project Overview

Epscrap is a web application that automatically aggregates developer job offers from multiple public APIs across Europe, with a strong focus on apprenticeship contracts (alternance) in France. The data is stored in a PostgreSQL database and exposed through a REST API, consumed by a React dashboard.

The main goals of the project are:

- Centralise developer job offers from 10 different sources into a single database
- Prioritise French apprenticeship contracts (alternance, professionnalisation)
- Provide a clean, filtered dashboard to browse offers by technology, contract type, and location
- Automate daily scraping via a scheduled cron job

---

## 2. Architecture

The application follows a clear separation of concerns:

```
Public APIs (Remotive, Arbeitnow, France Travail, Adzuna, APEC, HelloWork...)
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

The project uses two types of data sources:

**Public APIs** - documented, stable endpoints:

| Source | Coverage | Authentication |
|--------|----------|----------------|
| Remotive | Remote dev jobs worldwide | None required |
| Arbeitnow | Europe-wide tech jobs | None required |
| Jobicy | Remote engineering jobs | None required |
| RemoteOK | Remote dev jobs | None required |
| The Muse | Software engineering positions | None required |
| France Travail | French job market (all contracts) | OAuth2, free registration |
| Adzuna | 8 European countries | API key, free registration |

**Reverse-engineered APIs** - internal APIs discovered via browser DevTools (see section 4):

| Source | Coverage | Authentication |
|--------|----------|----------------|
| Welcome to the Jungle | France + Europe, curated companies | Algolia key (from browser) |
| APEC | France, cadre positions | None (CORS only) |
| HelloWork | France, all contract types | None (CORS only) |

Each source is implemented as an independent async function in `fetchJobs.js`. All sources run in parallel using `Promise.allSettled`, which ensures that a failure in one source does not block the others.

---

## 4. Reverse-Engineering Internal APIs with DevTools

Some job platforms (Welcome to the Jungle, APEC, HelloWork) do not offer a public API, but they use internal APIs that can be captured directly from the browser. Here is the exact process used to integrate these sources.

### Step 1 - Open DevTools

Open Chrome, navigate to the target job board, then open DevTools:

- Keyboard shortcut: `F12` or `Ctrl + Shift + I`
- Or right-click anywhere on the page > "Inspect"

### Step 2 - Set up the Network tab

1. Click the **Network** tab at the top of DevTools
2. Click the **Fetch/XHR** filter button (shows only API calls, hides images/CSS/JS)
3. Check **Preserve log** to keep requests visible after page navigation
4. Optionally clear the log with the circle-with-slash icon before triggering a search

### Step 3 - Trigger the search

Perform the exact action that loads the job results: type a keyword, apply a filter, or click "Search". Watch new requests appear in the Network panel.

### Step 4 - Identify the API request

Look for a request whose name looks like an API endpoint rather than a page or asset. Signs it is the right one:

- Name contains words like `search`, `jobs`, `offres`, `results`, `query`
- Status is 200
- Type is `fetch` or `xhr`
- Size is a few KB to a few hundred KB

In practice:
- Welcome to the Jungle: request to `*.algolia.net/1/indexes/*/query`
- APEC: request named `rechercheOffre`
- HelloWork: request named `getCandidateProfileSearch`

### Step 5 - Read the request details

Click on the request to open the detail panel, then navigate between tabs:

**Headers tab** - gives you:
- The full request URL (with query parameters for GET requests)
- The HTTP method (GET or POST)
- Any custom headers the browser sent (e.g., `X-Algolia-API-Key`, `Referer`, `Origin`)

**Payload tab** - gives you:
- For POST requests: the exact JSON body sent by the browser
- For GET requests: the decoded query parameters

This is the most important tab. Copy the exact payload structure - field names, data types, nested objects.

**Preview tab** - gives you:
- The parsed JSON response, browsable as a tree
- Find the array of job results and note the field names used for title, company, location, date, URL, contract type

**Response tab** - gives you the raw response text (use Preview instead for JSON).

### Step 6 - Check which headers are required

Some APIs reject requests from outside the browser if specific headers are missing. Common ones to include:

- `Referer`: the URL of the page that made the request (e.g., `https://www.welcometothejungle.com/`)
- `Origin`: the domain (e.g., `https://www.welcometothejungle.com`)
- `User-Agent`: a real browser user agent string
- `X-Requested-With: XMLHttpRequest`: signals an AJAX call

To find which headers the browser sent, go to the **Headers tab** of the request and scroll to the "Request Headers" section. Copy any non-standard headers into your axios call.

### Step 7 - Implement the fetch function

Using the information collected:

```javascript
async function fetchNewSource() {
  const { data } = await http.post(
    "https://api.example.com/search",        // URL from Headers tab
    {                                         // body from Payload tab
      query: "developpeur",
      pagination: { startIndex: 0, range: 20 },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://www.example.com/jobs",   // from Headers tab
        "Origin": "https://www.example.com",
        "User-Agent": "Mozilla/5.0 ...",
      },
    }
  );

  return (data.results || []).map((j) => ({   // field names from Preview tab
    title: j.title,
    company: j.company,
    location: j.city,
    description: j.description,
    date_posted: j.publishedAt,
    source: "newsource",
    url: `https://www.example.com/jobs/${j.slug}`,
  }));
}
```

### Applied example: Welcome to the Jungle (Algolia)

Navigating to WTTJ with DevTools open revealed requests to `csekhvms53-dsn.algolia.net`. The Headers tab showed:

- `X-Algolia-Application-Id: CSEKHVMS53`
- `X-Algolia-API-Key: 4bd8f6215d0cc52b26430765769e65a0`

Without the `Referer: https://www.welcometothejungle.com/` header, the Algolia key returns HTTP 403. Adding it resolved the issue.

### Applied example: APEC

Navigating to `apec.fr/candidat/recherche-emploi.html` and triggering a job search revealed a POST request to `https://www.apec.fr/cms/webservices/rechercheOffre`. The Payload tab showed the exact JSON body format. The Preview tab revealed the response fields (`intitule`, `nomCommercial`, `lieuTexte`, `datePublication`, `numeroOffre`).

The offer URL is reconstructed as:
`https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/{numeroOffre}`

### Applied example: HelloWork

Navigating to `hellowork.com/fr-fr/emploi/recherche.html?c=Alternance` revealed a GET request named `getCandidateProfileSearch`. The Payload tab showed a single parameter `itemsSearchJson` containing a JSON array of contract type checkboxes. Setting `"IsChecked": true` on `"Value": "Alternance"` filters results to apprenticeship contracts only.

---

## 5. Data Pipeline

### 5.1 Fetching

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

Sources that have native contract type information (France Travail, WTTJ, APEC) also include:

```json
{
  "contract_type": "alternance"
}
```

### 5.2 France Travail specifics

France Travail uses OAuth2 client credentials. A token is obtained before each scraping session using the `client_credentials` grant type. The API is then queried with ROME codes (French occupational classification) specific to software development:

- M1805: Systems and network studies and development
- M1801: Administration of computing resources
- M1802: IT audit and consulting
- M1810: Production and IT exploitation
- M1811: IT support and user assistance

The API response includes a native `alternance` boolean field and a `typeContratLibelle` field which are used to accurately classify contract types, avoiding the need for keyword-only detection.

French job locations use department codes (e.g., "92 - Levallois-Perret"). To ensure location-based filtering works correctly, the string ", France" is appended to all France Travail locations that do not already contain it.

### 5.3 APEC specifics

APEC (Association Pour l'Emploi des Cadres) is a French platform specialised in managerial and technical positions.

The endpoint `POST https://www.apec.fr/cms/webservices/rechercheOffre` accepts a JSON body with pagination (`startIndex`, `range`), keywords (`motsCles`), and optional filters. The project fetches 5 pages of 20 results each (100 total per scraping run).

Contract type is detected first from the offer title (e.g., "Alternance - Developpeur WEB" -> `alternance`), then from the numeric `typeContrat` field using a known mapping:

```javascript
const APEC_CONTRACT_MAP = {
  597138: "alternance",
  101888: "cdi",
  101889: "cdd",
};
```

### 5.4 Welcome to the Jungle specifics

WTTJ uses Algolia as its search backend. The project posts to the Algolia query endpoint using the application ID and API key captured from the browser. Multiple queries are run in sequence (`developpeur`, `developer`, `fullstack`, etc.) to maximise coverage. Duplicates are filtered client-side using a `Set` of slugs.

The `contract_type` field in the Algolia hit uses uppercase codes which are mapped to the project's internal contract type values.

### 5.5 Processing

The `processJobs.js` module handles:

- **Encoding fix**: some sources return mojibake (UTF-8 data misread as Latin-1, producing strings like "Ã©" instead of "e"). This is corrected using `Buffer.from(str, 'latin1').toString('utf8')`.
- **HTML stripping**: descriptions from some APIs contain HTML tags and entities, which are removed.
- **Technology extraction**: the job title and description are scanned against a predefined list of technologies (React, Node.js, Python, Docker, TypeScript, etc.).
- **Contract type detection**: a keyword-matching system scans the title and description for contract indicators. Sources that already provide a `contract_type` field bypass keyword detection entirely.

### 5.6 Storage

Jobs are stored in PostgreSQL using `ON CONFLICT (url) DO NOTHING`. The `url` field is unique, which provides automatic deduplication across scraping runs. This means the scraping can be run multiple times without creating duplicate entries.

---

## 6. Database Schema

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

## 7. REST API

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

## 8. Automated Scheduling (Cron)

The application includes an automated daily scraping job using the `node-cron` library. The cron job is configured to run every day at midnight:

```javascript
cron.schedule("0 0 * * *", () => {
  runPipeline().catch((err) => console.error("[cron] error:", err));
});
```

This ensures the database stays up to date without manual intervention. The job uses the same pipeline as the manual trigger (`POST /api/run`), meaning it fetches, processes, and inserts new offers while skipping duplicates.

---

## 9. Frontend Dashboard

The React frontend is built with Vite, TypeScript, and Tailwind CSS. It communicates with the backend API through a Vite proxy (all `/api/*` requests are forwarded to `localhost:3001`).

Key features:

- **Metric cards**: results from the last scraping run (+N inserted), number of active sources
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

## 10. Environment Variables

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

APEC and HelloWork do not require API keys - they are accessed as internal APIs.

---

## 11. Setup and Running

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

## 12. Project Limitations and Possible Improvements

- France Travail API pagination via Range header does not support offset, limiting results to the first 150 unique jobs per scraping run.
- Reverse-engineered API keys (WTTJ/Algolia) may rotate without notice and would need to be recaptured via DevTools.
- Salary data is not available from most sources and is not stored.
- Pagination is handled client-side; backend pagination via `limit/offset` exists but is not yet wired to the frontend scroll.
- Possible future additions: email alerts for new alternance offers, CSV export, deployment on Railway and Vercel.
