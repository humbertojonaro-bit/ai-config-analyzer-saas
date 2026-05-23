// Frontend-only types for API responses (kept slim — server is source of truth).
export type PlanId = "free" | "pro" | "team";

export interface AuthUser {
  id: number;
  email: string;
  plan: PlanId;
  createdAt: number;
}

export interface UsageInfo {
  plan: PlanId;
  planLabel: string;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  ruleId: string;
  title: string;
  severity: Severity;
  category: string;
  path: string;
  line?: number | null;
  description: string;
  recommendation: string;
  excerpt?: string;
}

export interface ScanSummary {
  id: number;
  fileName: string;
  detectedFormat: string;
  status: "pass" | "warning" | "critical" | "failed";
  findingCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  createdAt: number;
}

export interface ScanFull extends ScanSummary {
  preview: string;
  findings: Finding[];
}
