import axios from "axios";
import type { Job, Filters } from "./types";

const http = axios.create({ baseURL: "/api" });

export interface SourceStat {
  source: string;
  count: string;
}

export async function fetchJobs(filters: Partial<Filters>): Promise<Job[]> {
  const { data } = await http.get<{ data: Job[]; error: string | null }>("/jobs", {
    params: filters,
  });
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
