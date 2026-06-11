export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  tech_stack: string[];
  contract_type: string;
  date_posted: string;
  source: string;
  url: string;
}

export interface TechStat {
  tech: string;
  count: string;
}

export interface Filters {
  tech: string;
  contract: string;
  location: string;
}
