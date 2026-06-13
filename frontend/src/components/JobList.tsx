import type { Job } from "../types";

interface Props {
  jobs: Job[];
  loading: boolean;
}

const CONTRACT_STYLE: Record<string, { bg: string; color: string }> = {
  alternance: { bg: "#1c5d99",  color: "#fff" },
  cdi:        { bg: "#222222",  color: "#fff" },
  cdd:        { bg: "#639fab",  color: "#fff" },
  freelance:  { bg: "#bbcde5",  color: "#1c5d99" },
  internship: { bg: "#e8f0f8",  color: "#1c5d99" },
  other:      { bg: "#f0f0f0",  color: "#888" },
};

const SOURCE_ACCENT: Record<string, string> = {
  francetravail:      "#1c5d99",
  labonnealternance:  "#0f9d58",
  remotive:           "#639fab",
  arbeitnow:          "#8b5cf6",
  remoteok:           "#f59e0b",
  jobicy:             "#ec4899",
  themuse:            "#14b8a6",
  adzuna:             "#ff6b35",
  welcometothejungle: "#ffcd00",
  apec:               "#005691",
  hellowork:          "#ff6b00",
};

export function JobList({ jobs, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div
          className="w-9 h-9 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: "var(--c-light)", borderTopColor: "var(--c-primary)" }}
        />
        <p className="text-sm font-medium" style={{ color: "var(--c-secondary)" }}>
          Chargement des offres...
        </p>
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div
        className="flex flex-col items-center py-20 gap-4 rounded-2xl"
        style={{ background: "#fff", border: "1px solid var(--c-light)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "var(--c-bg)" }}
        >
          <svg className="w-7 h-7" style={{ color: "var(--c-light)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-lg" style={{ color: "var(--c-dark)" }}>
            Aucune offre
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--c-secondary)" }}>
            Lancez le scraping ou modifiez les filtres
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--c-light)", boxShadow: "0 2px 12px rgba(28,93,153,0.06)" }}
    >
      <div
        className="hidden md:grid items-center px-5 py-3 text-xs font-semibold uppercase tracking-widest"
        style={{
          background: "var(--c-dark)",
          color: "rgba(255,255,255,0.5)",
          gridTemplateColumns: "minmax(0,3fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.6fr) 80px",
        }}
      >
        <span>Poste</span>
        <span>Lieu</span>
        <span>Contrat</span>
        <span>Source</span>
        <span>Stack</span>
        <span className="text-center">Lien</span>
      </div>

      <div className="divide-y bg-white" style={{ borderColor: "#edf2f7" }}>
        {jobs.map((job) => {
          const cs = CONTRACT_STYLE[job.contract_type] ?? CONTRACT_STYLE.other;
          const accent = SOURCE_ACCENT[job.source] ?? "var(--c-secondary)";
          return (
            <div
              key={job.id}
              className="md:grid items-center px-5 py-4 bg-white"
              style={{ gridTemplateColumns: "minmax(0,3fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.6fr) 80px" }}
            >
              <div className="flex items-start gap-3 pr-4 mb-3 md:mb-0 min-w-0 overflow-hidden">
                <div
                  className="hidden md:block w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: accent }}
                />
                <div className="min-w-0">
                  <p
                    className="font-display font-semibold text-sm leading-snug truncate"
                    style={{ color: "var(--c-dark)" }}
                    title={job.title}
                  >
                    {job.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--c-secondary)" }}>
                    {job.company || "Non communique"}
                  </p>
                </div>
              </div>

              <p
                className="text-xs truncate mb-2 md:mb-0"
                style={{ color: "#666" }}
                title={job.location}
              >
                {job.location}
              </p>

              <div className="mb-2 md:mb-0">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap"
                  style={{ background: cs.bg, color: cs.color }}
                >
                  {job.contract_type}
                </span>
              </div>

              <div className="mb-2 md:mb-0">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
                >
                  {job.source}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3 md:mb-0">
                {job.tech_stack.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: "#edf2f7", color: "var(--c-primary)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex justify-start md:justify-center">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-85 hover:shadow-md"
                  style={{ background: "var(--c-primary)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Voir
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="px-5 py-2.5 text-xs font-medium flex items-center justify-between"
        style={{ background: "#fafbfc", borderTop: "1px solid #edf2f7", color: "var(--c-secondary)" }}
      >
        <span>{jobs.length} offre{jobs.length > 1 ? "s" : ""}</span>
        <span style={{ color: "var(--c-light)" }}>Epscrap · EPSI</span>
      </div>
    </div>
  );
}
