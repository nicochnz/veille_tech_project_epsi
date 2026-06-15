import axios from "axios";
import type { Job, Filters } from "./types";

const http = axios.create({ baseURL: "/api" });

export interface SourceStat {
  source: string;
  count: string;
}

export async function fetchJobs(filters: Partial<Filters>): Promise<Job[]> {
  const qs = new URLSearchParams();
  (filters.tech ?? []).forEach((t) => qs.append("tech", t));
  if (filters.contract) qs.append("contract", filters.contract);
  if (filters.location) qs.append("location", filters.location);
  const { data } = await http.get<{ data: Job[]; error: string | null }>(`/jobs?${qs}`);
  if (data.error) throw new Error(data.error);
  return data.data;
}

export async function fetchSourceStats(): Promise<SourceStat[]> {
  const { data } = await http.get<{ data: SourceStat[]; error: string | null }>("/stats/sources");
  if (data.error) throw new Error(data.error);
  return data.data;
}

export async function runScraping(): Promise<{ inserted: number; skipped: number }> {
  const { data } = await http.post<{
    data: { inserted: number; skipped: number };
    error: string | null;
  }>("/run");
  if (data.error) throw new Error(data.error);
  return data.data;
}
