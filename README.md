# Epscrap — Veille offres dev Europe

Dashboard de veille des offres d'emploi développeur en Europe, avec focus **alternance France**.

Pipeline : APIs publiques → normalisation → PostgreSQL → API REST → Dashboard React

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js 18+, Express, node-cron |
| Base de données | PostgreSQL 14+ |
| Scraping | axios (7 sources) |
| Frontend | React 18, Vite, TypeScript strict |
| Style | Tailwind CSS, CSS custom properties |
| Polices | Syne (titres), DM Sans (corps) |

---

## Sources de données

| Source | Couverture | Clé requise |
|--------|-----------|-------------|
| [Remotive](https://remotive.com/api/remote-jobs) | Remote mondial | Non |
| [Arbeitnow](https://arbeitnow.com/api/job-board-api) | Europe | Non |
| [Jobicy](https://jobicy.com/api/v2/remote-jobs) | Remote mondial | Non |
| [RemoteOK](https://remoteok.com/api) | Remote mondial | Non |
| [The Muse](https://www.themuse.com/api/public/jobs) | US/Europe | Non |
| [France Travail](https://francetravail.io/data/api/offres-emploi) | France | Oui (gratuite) |
| [Adzuna](https://developer.adzuna.com) | Europe 8 pays | Oui (gratuite) |

---

## Prérequis

- Node.js v18+
- PostgreSQL v14+
- Git

---

## Installation

### 1. Cloner le repo

```bash
git clone git@github.com:nicochnz/veille_tech_project_epsi.git
cd veille_tech_project_epsi
```

### 2. Base de données

```bash
# Windows — adapter le chemin si nécessaire
"C:\Program Files\PostgreSQL\18\bin\psql" -U postgres -c "CREATE DATABASE jobsdb;"
"C:\Program Files\PostgreSQL\18\bin\psql" -U postgres -d jobsdb -f backend/schema.sql
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Remplir les variables d'environnement (voir section ci-dessous)
npm install
npm run dev
# API disponible sur http://localhost:3001
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard sur http://localhost:5173
```

---

## Variables d'environnement

Fichier `backend/.env` (non versionné) :

```env
DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/jobsdb
PORT=3001

# France Travail — inscription gratuite sur https://francetravail.io/data/api/offres-emploi
# Scopes nécessaires : api_offresdemploiv2 o2dsoffre
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=

# Adzuna — inscription gratuite sur https://developer.adzuna.com
# Créer un compte > "Create App" > copier App ID et App Key
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
```

---

## Architecture

```
APIs publiques (Remotive, Arbeitnow, France Travail, Adzuna...)
        |
        v
  fetchJobs.js       <- appels HTTP vers chaque source
        |
        v
  processJobs.js     <- normalise, corrige encodage, extrait techs + contrat
        |
        v
  jobService.js      <- INSERT avec deduplication par URL UNIQUE
        |
        v
   PostgreSQL (table jobs)
        |
        v
   routes Express    <- GET /api/jobs, GET /api/stats/*, POST /api/run
        |
        v
  Dashboard React    <- filtres + tableau paginé
```

---

## Structure du projet

```
epscrap/
|
+-- backend/
|   +-- .env.example
|   +-- schema.sql
|   +-- package.json
|   +-- src/
|       +-- index.js          <- serveur Express + cron minuit
|       +-- db.js             <- pool PostgreSQL
|       +-- constants.js      <- TECHS, CONTRACT_KEYWORDS
|       +-- jobs/
|           +-- fetchJobs.js  <- fetch toutes les sources
|           +-- processJobs.js<- normalisation + detection
|           +-- jobService.js <- lecture/ecriture BDD
|
+-- frontend/
    +-- index.html            <- Google Fonts (Syne + DM Sans)
    +-- vite.config.ts        <- proxy /api -> localhost:3001
    +-- src/
        +-- main.tsx
        +-- App.tsx           <- etat global, metriques, pagination
        +-- api.ts            <- fonctions fetch vers le backend
        +-- types.ts          <- interfaces Job, Filters
        +-- constants.ts      <- TECHS, CONTRACT_TYPES
        +-- index.css         <- variables CSS palette de couleurs
        +-- components/
            +-- Filters.tsx   <- filtres tech/contrat/lieu
            +-- JobList.tsx   <- tableau avec grille CSS fixe
```

---

## API REST

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/run` | Lance le scraping manuellement |
| `GET` | `/api/jobs` | Liste des offres (filtres en query params) |
| `GET` | `/api/jobs/count` | Nombre d'offres correspondantes |
| `GET` | `/api/stats/sources` | Offres par source |
| `GET` | `/api/stats/tech` | Top technologies |
| `GET` | `/api/stats/location` | Repartition geographique |

### Filtres sur `GET /api/jobs`

```
?tech=React          <- technologie (ex: React, Python, Node)
?contract=alternance <- type contrat (alternance / cdi / cdd / freelance / internship)
?location=France     <- localisation (recherche partielle ILIKE)
?source=francetravail
?limit=500
?offset=0
```

### Schema PostgreSQL

```sql
CREATE TABLE jobs (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  company       TEXT,
  location      TEXT,
  tech_stack    TEXT[],
  contract_type TEXT,        -- alternance | cdi | cdd | freelance | internship | other
  date_posted   TIMESTAMP,
  source        TEXT,
  url           TEXT UNIQUE  -- cle de deduplication
);
```

---

## Detection des contrats

Le `contract_type` est détecté dans cet ordre de priorité :

1. **France Travail** : champ natif `j.alternance` (boolean) + `j.typeContratLibelle`
2. **Toutes sources** : mots-clés dans titre + description (voir `constants.js`)

Mots-clés alternance : `alternance`, `apprentissage`, `alternant`, `contrat pro`, `professionnalisation`, `werkstudent`, `work-study`...

---

## Démarrage rapide

```bash
# Vider la base et relancer un scraping propre
psql -U postgres -d jobsdb -c "TRUNCATE TABLE jobs;"
curl -X POST http://localhost:3001/api/run

# Ou depuis le dashboard : bouton "Lancer le scraping"
```

---

## Palette de couleurs

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--c-dark` | `#222222` | Textes, header colonnes |
| `--c-primary` | `#1c5d99` | Bleu principal, boutons |
| `--c-secondary` | `#639fab` | Bleu secondaire, labels |
| `--c-light` | `#bbcde5` | Bordures, accents légers |
| `--c-bg` | `#f0f5f9` | Fond de page |

---

## Améliorations possibles

- Pagination côté backend (offset/limit) au lieu de charger 500 offres
- Salaire quand disponible dans l'API
- Export CSV
- Déploiement : Railway (backend + PostgreSQL) + Vercel (frontend)
- Notifications mail pour les nouvelles alternances
