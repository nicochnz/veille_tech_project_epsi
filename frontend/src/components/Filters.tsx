import type { Filters } from "../types";
import { TECHS, CONTRACT_TYPES } from "../constants";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onRun: () => void;
  running: boolean;
}

export function Filters({ filters, onChange, onRun, running }: Props) {
  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const hasAny = filters.tech || filters.contract || filters.location;

  const inputBase: React.CSSProperties = {
    borderColor: "var(--c-light)",
    color: "var(--c-dark)",
    background: "#fff",
    fontFamily: "var(--font-body)",
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#fff", border: "1px solid var(--c-light)", boxShadow: "0 2px 8px rgba(28,93,153,0.05)" }}
    >
      <div className="flex flex-wrap gap-4 items-end">

        {/* Technologie */}
        <div className="flex flex-col gap-1.5 min-w-[155px]">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--c-secondary)" }}>
            Technologie
          </label>
          <select
            value={filters.tech}
            onChange={(e) => set("tech", e.target.value)}
            style={inputBase}
            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c5d99]"
          >
            <option value="">Toutes</option>
            {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Contrat */}
        <div className="flex flex-col gap-1.5 min-w-[155px]">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--c-secondary)" }}>
            Contrat
          </label>
          <select
            value={filters.contract}
            onChange={(e) => set("contract", e.target.value)}
            style={inputBase}
            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c5d99]"
          >
            <option value="">Tous</option>
            {CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Localisation */}
        <div className="flex flex-col gap-1.5 min-w-[195px]">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--c-secondary)" }}>
            Localisation
          </label>
          <input
            type="text"
            value={filters.location}
            onChange={(e) => set("location", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onRun()}
            placeholder="Paris, Lyon, France..."
            style={inputBase}
            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c5d99] placeholder:text-gray-300"
          />
        </div>

        {/* Reset */}
        {hasAny && (
          <button
            onClick={() => onChange({ tech: "", contract: "", location: "" })}
            className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors hover:bg-gray-50"
            style={{ color: "var(--c-secondary)", border: "1px solid var(--c-light)" }}
          >
            Effacer
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={onRun}
            disabled={running}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: running ? "var(--c-secondary)" : "var(--c-primary)" }}
          >
            {running ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                En cours...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Lancer le scraping
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tags filtres actifs */}
      {(filters.tech || filters.contract || filters.location) && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px dashed var(--c-light)" }}>
          <span className="text-xs" style={{ color: "var(--c-secondary)" }}>Actifs :</span>
          {filters.tech && <Chip label={filters.tech} />}
          {filters.contract && <Chip label={filters.contract} />}
          {filters.location && <Chip label={filters.location} />}
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      className="font-display text-xs px-3 py-0.5 rounded-full font-semibold"
      style={{ background: "#e8f0f8", color: "var(--c-primary)" }}
    >
      {label}
    </span>
  );
}
