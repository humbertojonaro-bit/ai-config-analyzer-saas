import type { Severity } from "@/lib/api-types";
import { AlertOctagon, AlertTriangle, Info, ShieldAlert, ShieldCheck } from "lucide-react";

const config: Record<Severity, { label: string; cls: string; Icon: any }> = {
  critical: { label: "Critical", cls: "bg-sev-critical text-sev-critical", Icon: AlertOctagon },
  high:     { label: "High",     cls: "bg-sev-high text-sev-high",         Icon: ShieldAlert },
  medium:   { label: "Medium",   cls: "bg-sev-medium text-sev-medium",     Icon: AlertTriangle },
  low:      { label: "Low",      cls: "bg-sev-low text-sev-low",           Icon: ShieldCheck },
  info:     { label: "Info",     cls: "bg-sev-info text-sev-info",         Icon: Info },
};

export function SeverityBadge({ severity, className = "" }: { severity: Severity; className?: string }) {
  const c = config[severity];
  const Icon = c.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${c.cls} ${className}`}
      data-testid={`badge-severity-${severity}`}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

export function StatusPill({ status }: { status: "pass" | "warning" | "critical" | "failed" }) {
  const map: Record<string, { label: string; cls: string }> = {
    pass:     { label: "Pass",     cls: "bg-sev-low text-sev-low" },
    warning:  { label: "Warning",  cls: "bg-sev-medium text-sev-medium" },
    critical: { label: "Critical", cls: "bg-sev-critical text-sev-critical" },
    failed:   { label: "Failed",   cls: "bg-sev-info text-sev-info" },
  };
  const c = map[status] ?? map.failed;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${c.cls}`}
      data-testid={`status-${status}`}
    >
      {c.label}
    </span>
  );
}
