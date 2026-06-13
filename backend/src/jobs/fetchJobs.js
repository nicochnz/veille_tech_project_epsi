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

const WTTJ_APP_ID = "CSEKHVMS53";
const WTTJ_API_KEY = "4bd8f6215d0cc52b26430765769e65a0";
const WTTJ_INDEX = "wk_cms_jobs_production";

const WTTJ_HEADERS = {
  "X-Algolia-Application-Id": WTTJ_APP_ID,
  "X-Algolia-API-Key": WTTJ_API_KEY,
  "Content-Type": "application/json",
  "Referer": "https://www.welcometothejungle.com/",
  "Origin": "https://www.welcometothejungle.com",
};

async function fetchWTTJPage(query, page) {
  const { data } = await http.post(
    `https://${WTTJ_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${WTTJ_INDEX}/query`,
    { query, hitsPerPage: 50, page },
    { headers: WTTJ_HEADERS }
  );
  return data.hits || [];
}

function mapWTTJHit(h) {
  const city = h.offices?.[0]?.city || h.office?.city || "France";
  const country = h.offices?.[0]?.country || "";
  const location = country && country !== "France" ? `${city}, ${country}` : city;
  const orgSlug = h.organization?.slug || "";
  return {
    title: h.name || "",
    company: h.organization?.name || "Unknown",
    location,
    description: `${h.profile || ""}`.trim(),
    date_posted: h.published_at || new Date().toISOString(),
    source: "welcometothejungle",
    contract_type: detectWTTJContract(h.contract_type),
    url: `https://www.welcometothejungle.com/fr/companies/${orgSlug}/jobs/${h.slug}`,
  };
}

const WTTJ_CONTRACT_MAP = {
  APPRENTICESHIP: "alternance",
  INTERNSHIP:     "internship",
  CDI:            "cdi",
  CDD:            "cdd",
  FULL_TIME:      "cdi",
  PART_TIME:      "cdd",
  FREELANCE:      "freelance",
  VIE:            "alternance",
};

function detectWTTJContract(ct) {
  if (!ct) return null;
  return WTTJ_CONTRACT_MAP[ct.toUpperCase()] || null;
}

async function fetchWelcomeToTheJungle() {
  try {
    const queries = ["developpeur", "developer", "ingenieur logiciel", "fullstack", "backend", "frontend"];
    const seen = new Set();
    const jobs = [];

    for (const query of queries) {
      const hits = await fetchWTTJPage(query, 0);
      hits
        .filter((h) => h.slug && !seen.has(h.slug))
        .forEach((h) => {
          seen.add(h.slug);
          jobs.push(mapWTTJHit(h));
        });
    }

    console.log(`[welcometothejungle] ${jobs.length} offres`);
    return jobs;
  } catch (err) {
    console.error(`[welcometothejungle] echec:`, err.response?.status, err.message);
    return [];
  }
}

const APEC_CONTRACT_MAP = {
  597138: "alternance",
  101888: "cdi",
  101889: "cdd",
};

function contractTypeFromAPEC(j) {
  const titre = (j.intitule || "").toLowerCase();
  if (titre.includes("alternance") || titre.includes("apprentissage")) return "alternance";
  if (titre.includes("stage")) return "internship";
  return APEC_CONTRACT_MAP[j.typeContrat] || "other";
}

async function fetchAPECPage(startIndex) {
  const { data } = await http.post(
    "https://www.apec.fr/cms/webservices/rechercheOffre",
    {
      lieux: [],
      fonctions: [],
      statutPoste: [],
      typesContrat: [],
      activeFiltre: true,
      idNomZonesDeplacement: [],
      idsEtablissement: [],
      motsCles: "Developpeur",
      niveauxExperience: [],
      pagination: { range: 20, startIndex },
      pointGeolocDeReference: { distance: 0 },
      positionNumbersExcluded: [],
      secteursActivite: [],
      sorts: [{ type: "SCORE", direction: "DESCENDING" }],
      typeClient: "CADRE",
      typesConvention: [],
      typesTeletravail: [],
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://www.apec.fr/candidat/recherche-emploi.html",
        "Origin": "https://www.apec.fr",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  );
  return (data.resultats || []).map((j) => {
    const ville = (j.lieuTexte || "").split(" - ")[0] || "France";
    return {
      title: j.intitule,
      company: j.nomCommercial || "Non communique",
      location: `${ville}, France`,
      description: j.texteOffre || "",
      date_posted: j.datePublication || new Date().toISOString(),
      source: "apec",
      contract_type: contractTypeFromAPEC(j),
      url: `https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/${j.numeroOffre}`,
    };
  });
}

async function fetchAPEC() {
  try {
    const pages = await Promise.allSettled([
      fetchAPECPage(0),
      fetchAPECPage(20),
      fetchAPECPage(40),
      fetchAPECPage(60),
      fetchAPECPage(80),
    ]);
    const jobs = [];
    pages.forEach((p, i) => {
      if (p.status === "fulfilled") jobs.push(...p.value);
      else console.error(`[apec] page ${i} echec:`, p.reason?.response?.status);
    });
    console.log(`[apec] ${jobs.length} offres`);
    return jobs;
  } catch (err) {
    console.error("[apec] erreur:", err.message);
    return [];
  }
}

async function fetchHelloWork() {
  try {
    const itemsSearchJson = JSON.stringify([
      { Label: "CDI",        IsChecked: false, Value: "CDI"        },
      { Label: "CDD",        IsChecked: false, Value: "CDD"        },
      { Label: "Alternance", IsChecked: true,  Value: "Alternance" },
      { Label: "Stage",      IsChecked: false, Value: "Stage"      },
    ]);

    const keywords = ["developpeur", "developer", "fullstack", "backend", "frontend"];
    const seen = new Set();
    const jobs = [];

    for (const k of keywords) {
      const { data } = await http.get(
        "https://www.hellowork.com/fr-fr/emploi/getCandidateProfileSearch",
        {
          params: { k, l: "France", itemsSearchJson },
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.hellowork.com/fr-fr/emploi/recherche.html",
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );

      const items = data.results || data.jobs || data.data || data.Items || [];
      items
        .filter((j) => {
          const url = j.Url || j.url || j.Link || "";
          return url && !seen.has(url);
        })
        .forEach((j) => {
          const url = j.Url || j.url || j.Link || "";
          seen.add(url);
          jobs.push({
            title: j.Title || j.title || j.intitule || "",
            company: j.Company || j.company || j.entreprise || "Unknown",
            location: j.Location || j.location || j.lieu || "France",
            description: j.Description || j.description || "",
            date_posted: j.PublicationDate || j.datePosted || j.date || new Date().toISOString(),
            source: "hellowork",
            contract_type: "alternance",
            url: url.startsWith("http") ? url : `https://www.hellowork.com${url}`,
          });
        });
    }

    console.log(`[hellowork] ${jobs.length} offres`);
    return jobs;
  } catch (err) {
    console.error("[hellowork] erreur:", err.response?.status, err.message);
    return [];
  }
}

const SOURCES = [
  { name: "remotive",           fn: fetchRemotive           },
  { name: "arbeitnow",          fn: fetchArbeitnow          },
  { name: "jobicy",             fn: fetchJobicy             },
  { name: "remoteok",           fn: fetchRemoteOK           },
  { name: "themuse",            fn: fetchTheMuse            },
  { name: "francetravail",      fn: fetchFranceTravail      },
  { name: "adzuna",             fn: fetchAdzuna             },
  { name: "welcometothejungle", fn: fetchWelcomeToTheJungle },
  { name: "apec",               fn: fetchAPEC               },
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
