const axios = require("axios");

const http = axios.create({ timeout: 15_000 });

async function fetchRemotive() {
  const { data } = await http.get(
    "https://remotive.com/api/remote-jobs?category=software-dev&limit=100"
  );
  return data.jobs.map((j) => ({
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    description: j.description || "",
    date_posted: j.publication_date,
    source: "remotive",
    url: j.url,
  }));
}

async function fetchArbeitnow() {
  const { data } = await http.get("https://arbeitnow.com/api/job-board-api");
  return (data.data || []).map((j) => ({
    title: j.title,
    company: j.company_name,
    location: j.location || "Europe",
    description: j.description || "",
    date_posted: new Date(j.created_at * 1000).toISOString(),
    source: "arbeitnow",
    url: j.url,
  }));
}

async function fetchJobicy() {
  const { data } = await http.get(
    "https://jobicy.com/api/v2/remote-jobs?count=50&industry=engineering"
  );
  return (data.jobs || []).map((j) => ({
    title: j.jobTitle,
    company: j.companyName,
    location: j.jobGeo || "Remote",
    description: j.jobDescription || "",
    date_posted: j.pubDate,
    source: "jobicy",
    url: j.url,
  }));
}

async function fetchRemoteOK() {
  const { data } = await http.get("https://remoteok.com/api?tag=dev", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EpscrapBot/1.0)" },
  });
  return (Array.isArray(data) ? data.slice(1) : [])
    .filter((j) => j.url && (j.position || j.title))
    .map((j) => ({
      title: j.position || j.title,
      company: j.company || "Unknown",
      location: j.location || "Remote",
      description: (j.tags || []).join(" "),
      date_posted: j.date || new Date().toISOString(),
      source: "remoteok",
      url: j.url,
    }));
}

async function fetchTheMuse() {
  const { data } = await http.get(
    "https://www.themuse.com/api/public/jobs?category=Software+Engineer&page=1"
  );
  return (data.results || [])
    .map((j) => ({
      title: j.name,
      company: j.company?.name || "Unknown",
      location: j.locations?.map((l) => l.name).join(", ") || "Remote",
      description: j.contents || "",
      date_posted: j.publication_date,
      source: "themuse",
      url: j.refs?.landing_page || "",
    }))
    .filter((j) => j.url);
}

async function getFranceTravailToken() {
  const res = await http.post(
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID,
      client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
      scope: "api_offresdemploiv2 o2dsoffre",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data.access_token;
}

function contractTypeFromFT(j) {
  if (j.alternance === true) return "alternance";
  const libelle = (j.typeContratLibelle || "").toLowerCase();
  if (libelle.includes("apprentissage") || libelle.includes("professionnalisation")) return "alternance";
  const code = (j.typeContrat || "").toUpperCase();
  if (code === "CA" || code === "PRO") return "alternance";
  if (code === "CDI" || libelle.includes("indeterminee")) return "cdi";
  if (code === "CDD" || libelle.includes("determinee")) return "cdd";
  const titre = (j.intitule || "").toLowerCase();
  if (titre.includes("alternance") || titre.includes("apprentissage")) return "alternance";
  return "other";
}

async function fetchFranceTravailPage(token, start) {
  const end = start + 149;

  const qs = new URLSearchParams();
  ["M1805", "M1801", "M1802", "M1810", "M1811"].forEach((c) => qs.append("codeROME", c));
  qs.append("sort", "1");

  const url = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${qs.toString()}`;

  const { data, headers: resHeaders } = await http.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      Range: `offres=${start}-${end}`,
    },
  });

  const count = data.resultats?.length ?? 0;
  console.log(`[francetravail] page ${start / 150 + 1} -> ${count} resultats | ${resHeaders["content-range"] || ""}`);

  return (data.resultats || []).map((j) => {
    const libelle = j.lieuTravail?.libelle || "";
    const location = libelle
      ? (libelle.toLowerCase().includes("france") ? libelle : `${libelle}, France`)
      : "France";
    return {
      title: j.intitule,
      company: j.entreprise?.nom || "Non communique",
      location,
      description: `${j.description || ""} ${j.typeContratLibelle || ""}`.trim(),
      date_posted: j.dateCreation || new Date().toISOString(),
      source: "francetravail",
      contract_type: contractTypeFromFT(j),
      url: `https://candidat.francetravail.fr/offres/recherche/detail/${j.id}`,
    };
  });
}

async function fetchFranceTravail() {
  if (!process.env.FRANCE_TRAVAIL_CLIENT_ID || !process.env.FRANCE_TRAVAIL_CLIENT_SECRET) {
    console.log("[francetravail] credentials absents -- source ignoree");
    return [];
  }

  try {
    const token = await getFranceTravailToken();
    console.log("[francetravail] token OK");

    const pages = await Promise.allSettled([
      fetchFranceTravailPage(token, 0),
      fetchFranceTravailPage(token, 150),
      fetchFranceTravailPage(token, 300),
      fetchFranceTravailPage(token, 450),
    ]);

    const jobs = [];
    pages.forEach((p, i) => {
      if (p.status === "fulfilled") jobs.push(...p.value);
      else console.error(`[francetravail] page ${i} failed: HTTP ${p.reason?.response?.status}`);
    });

    const altCount = jobs.filter(j => j.contract_type === "alternance").length;
    console.log(`[francetravail] ${jobs.length} offres dont ${altCount} alternance`);
    return jobs;
  } catch (err) {
    console.error(`[francetravail] erreur: HTTP ${err.response?.status} -- ${err.message}`);
    return [];
  }
}

const ADZUNA_COUNTRIES = [
  { code: "fr", label: "France"      },
  { code: "gb", label: "UK"          },
  { code: "de", label: "Germany"     },
  { code: "nl", label: "Netherlands" },
  { code: "be", label: "Belgium"     },
  { code: "es", label: "Spain"       },
  { code: "pl", label: "Poland"      },
  { code: "at", label: "Austria"     },
];

async function fetchAdzunaCountry(appId, appKey, country) {
  const { data } = await http.get(
    `https://api.adzuna.com/v1/api/jobs/${country.code}/search/1`,
    {
      params: {
        app_id: appId,
        app_key: appKey,
        results_per_page: 50,
        what: "developer",
        "content-type": "application/json",
      },
    }
  );
  return (data.results || [])
    .filter((j) => j.redirect_url)
    .map((j) => ({
      title: j.title,
      company: j.company?.display_name || "Unknown",
      location: j.location?.display_name || country.label,
      description: j.description || "",
      date_posted: j.created || new Date().toISOString(),
      source: "adzuna",
      url: j.redirect_url,
    }));
}

async function fetchAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log("[adzuna] credentials absents -- source ignoree");
    return [];
  }

  const results = await Promise.allSettled(
    ADZUNA_COUNTRIES.map((c) => fetchAdzunaCountry(appId, appKey, c))
  );

  const jobs = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`[adzuna] ${ADZUNA_COUNTRIES[i].label}: ${r.value.length} offres`);
      jobs.push(...r.value);
    } else {
      console.error(`[adzuna] ${ADZUNA_COUNTRIES[i].label} echec:`, r.reason?.response?.status);
    }
  });

  console.log(`[adzuna] ${jobs.length} offres total`);
  return jobs;
}

const SOURCES = [
  { name: "remotive",      fn: fetchRemotive      },
  { name: "arbeitnow",     fn: fetchArbeitnow     },
  { name: "jobicy",        fn: fetchJobicy        },
  { name: "remoteok",      fn: fetchRemoteOK      },
  { name: "themuse",       fn: fetchTheMuse       },
  { name: "francetravail", fn: fetchFranceTravail },
  { name: "adzuna",        fn: fetchAdzuna        },
];

async function fetchAll() {
  const results = await Promise.allSettled(SOURCES.map((s) => s.fn()));
  const jobs = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`[${SOURCES[i].name}] ${r.value.length} offres`);
      jobs.push(...r.value);
    } else {
      console.error(`[${SOURCES[i].name}] echec:`, r.reason?.message);
    }
  });
  console.log(`[pipeline] total brut: ${jobs.length}`);
  return jobs;
}

module.exports = { fetchAll };
