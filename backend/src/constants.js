const TECHS = [
  "React", "Vue", "Angular", "Next.js", "Nuxt",
  "Node.js", "Express", "NestJS",
  "Python", "Django", "FastAPI",
  "TypeScript", "JavaScript",
  "PostgreSQL", "MySQL", "MongoDB",
  "Docker", "Kubernetes", "AWS", "Azure",
  "GraphQL", "REST",
];

const CONTRACT_KEYWORDS = {
  alternance: [
    "alternance", "apprentissage", "alternant", "apprenti",
    "en alternance", "par alternance", "contrat d'apprentissage",
    "professionnalisation", "contrat pro", "pro-a",
    "work-study", "dual study", "werkstudent",
  ],
  cdi: ["cdi", "permanent", "full-time", "temps plein", "indeterminee", "unbefristet"],
  cdd: ["cdd", "fixed-term", "temporary", "determinee", "befristet"],
  freelance: ["freelance", "contractor", "independent", "auto-entrepreneur", "mission"],
  internship: ["stage", "internship", "intern", "stagiaire", "praktikum"],
};

module.exports = { TECHS, CONTRACT_KEYWORDS };
