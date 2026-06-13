import { useEffect, useState, useCallback } from "react";
import { Filters as FiltersBar } from "./components/Filters";
import { JobList } from "./components/JobList";
import { fetchJobs, fetchSourceStats, runScraping } from "./api";
import type { SourceStat } from "./api";
import type { Job, Filters } from "./types";

const DEFAULT_FILTERS: Filters = { tech: "", contract: "", location: "" };
const PAGE_SIZE = 50;
const EPSI_LOGO = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTS5VYolg4PlHUkQ7wMn4lTENI-rS9XfFDTOg&s";

function MetricCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl px-5 py-4 flex flex-col gap-1 transition-all hover:shadow-md"
      style={{
        background: accent ? "var(--c-primary)" : "#fff",
        border: accent ? "none" : "1px solid var(--c-light)",
        boxShadow: accent ? "0 4px 20px rgba(28,93,153,0.25)" : undefined,
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: accent ? "rgba(255,255,255,0.7)" : "var(--c-secondary)" }}
      >
        {label}
      </span>
      <span
        className="font-display text-3xl font-bold leading-none"
        style={{ color: accent ? "#fff" : "var(--c-dark)" }}
      >
        {value}
      </span>
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastScrape, setLastScrape] = useState<{ inserted: number; skipped: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const loadJobs = useCallback(async (f: Filters) => {
    setLoading(true);
    setVisibleCount(PAGE_SIZE);
    try {
      setJobs(await fetchJobs({
        tech: f.tech || undefined,
        contract: f.contract || undefined,
        location: f.location || undefined,
      }));
    } catch {
      showToast("Erreur chargement des offres", false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSourceStats = useCallback(async () => {
    try { setSourceStats(await fetchSourceStats()); } catch {}
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleRun() {
    setRunning(true);
    try {
      const result = await runScraping();
      setLastScrape(result);
      showToast(`${result.inserted} nouvelles offres ajoutees`);
      await loadJobs(filters);
      await loadSourceStats();
    } catch {
      showToast("Erreur pendant le scraping", false);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { loadJobs(DEFAULT_FILTERS); }, [loadJobs]);
  useEffect(() => { loadSourceStats(); }, [loadSourceStats]);

  const visibleJobs = jobs.slice(0, visibleCount);
  const remaining = jobs.length - visibleCount;
  const activeSources = sourceStats.filter(s => parseInt(s.count) > 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>

      <header style={{ background: "var(--c-primary)" }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-5">
          <div
            className="rounded-xl overflow-hidden flex-shrink-0"
            style={{ background: "#fff", padding: "6px 8px" }}
          >
            <img src={EPSI_LOGO} alt="EPSI" className="h-9 w-auto object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-white leading-none tracking-tight">
              Epscrap
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(187,205,229,0.85)" }}>
              Veille emploi dev Europe
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Resultats du dernier scraping"
            value={lastScrape ? `+${lastScrape.inserted}` : "-"}
            accent
          />
          <MetricCard
            label="Sources actives"
            value={activeSources.length || "-"}
          />
        </div>

        <FiltersBar
          filters={filters}
          onChange={setFilters}
          onRun={handleRun}
          running={running}
        />

        <JobList jobs={visibleJobs} loading={loading} />

        {remaining > 0 && !loading && (
          <div className="flex justify-center pb-6">
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="group flex items-center gap-3 px-8 py-3 rounded-2xl font-semibold text-sm transition-all"
              style={{
                background: "#fff",
                color: "var(--c-primary)",
                border: "2px solid var(--c-light)",
                boxShadow: "0 2px 8px rgba(28,93,153,0.08)",
              }}
            >
              <span>{remaining} offres de plus</span>
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-y-0.5"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </main>

      {toast && (
        <div
          className="fixed bottom-5 right-5 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white z-50"
          style={{ background: toast.ok ? "var(--c-primary)" : "#d9534f" }}
        >
          <span className="text-base">{toast.ok ? "✓" : "✗"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
