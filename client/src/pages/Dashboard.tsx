import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/SeverityBadge";
import { useAuth } from "@/lib/auth";
import type { ScanSummary, UsageInfo } from "@/lib/api-types";
import { ArrowRight, FileScan, Sparkles, Plus, BookOpen } from "lucide-react";

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const usageQ = useQuery<UsageInfo>({ queryKey: ["/api/usage"] });
  const scansQ = useQuery<{ scans: ScanSummary[] }>({ queryKey: ["/api/scans"] });

  const usage = usageQ.data;
  const scans = scansQ.data?.scans ?? [];

  const pct = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const overLimit = usage ? usage.used >= usage.limit : false;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Dashboard</div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            Welcome back<span className="text-muted-foreground">, {user?.email?.split("@")[0]}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/billing">
            <Button variant="outline" data-testid="button-view-billing">View billing</Button>
          </Link>
          <Link href="/scan/new">
            <Button data-testid="button-new-scan">
              <Plus className="mr-1.5 h-4 w-4" />
              New scan
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold" data-testid="text-current-plan">{usage?.planLabel ?? "—"}</span>
            {usage?.plan === "free" && (
              <Link href="/billing" className="text-xs text-primary hover:underline" data-testid="link-upgrade">
                Upgrade →
              </Link>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {usage ? `${usage.limit} scans / month included` : ""}
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Scans this month</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-mono" data-testid="text-scans-used">
              {usage?.used ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground text-mono" data-testid="text-scans-limit">
              / {usage?.limit ?? "—"}
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full transition-all ${overLimit ? "bg-sev-critical" : pct > 75 ? "bg-sev-medium" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
              data-testid="progress-usage"
            />
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Findings detected</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-xl font-semibold text-mono" data-testid="text-total-findings">
              {scans.reduce((sum, s) => sum + s.findingCount, 0)}
            </span>
            <span className="text-xs text-mono text-muted-foreground">
              <span className="text-sev-critical">●</span>{" "}
              {scans.reduce((s, x) => s + x.criticalCount, 0)} critical ·{" "}
              <span className="text-sev-high">●</span>{" "}
              {scans.reduce((s, x) => s + x.highCount, 0)} high
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Across all your scans</div>
        </div>
      </div>

      {/* Recent scans */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold tracking-tight">Recent scans</h2>
          <Link href="/scans" className="text-xs text-primary hover:underline" data-testid="link-view-all-scans">
            View all →
          </Link>
        </div>
        <div className="rounded-xl border border-card-border bg-card overflow-hidden">
          {scansQ.isLoading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Loading scans…</div>
          ) : scans.length === 0 ? (
            <EmptyScans />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider border-b border-card-border">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">File</th>
                  <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">Format</th>
                  <th className="text-left font-medium px-4 py-2.5">Status</th>
                  <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Findings</th>
                  <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Scanned</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 6).map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-card-border last:border-0 hover-elevate"
                    data-testid={`row-scan-${s.id}`}
                  >
                    <td className="px-4 py-3 text-mono text-[13px]" data-testid={`text-scan-filename-${s.id}`}>{s.fileName}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-mono text-xs text-muted-foreground uppercase">{s.detectedFormat}</span>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                    <td className="px-4 py-3 hidden md:table-cell text-mono text-xs">
                      <span className="text-sev-critical">{s.criticalCount}c</span>{" · "}
                      <span className="text-sev-high">{s.highCount}h</span>{" · "}
                      <span className="text-sev-medium">{s.mediumCount}m</span>{" · "}
                      <span className="text-sev-low">{s.lowCount}l</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{fmtTime(s.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/scans/${s.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-scan-${s.id}`}>
                          View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CTA strip */}
      <div className="mt-8 rounded-xl border border-card-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg border border-border flex items-center justify-center bg-accent text-accent-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-sm">Want richer reports and an API key?</div>
            <div className="text-xs text-muted-foreground">Pro unlocks 100 scans/month, Markdown exports, and the analyze API.</div>
          </div>
        </div>
        <Link href="/billing">
          <Button data-testid="button-cta-upgrade">Compare plans</Button>
        </Link>
      </div>
    </AppShell>
  );
}

function EmptyScans() {
  return (
    <div className="p-10 text-center" data-testid="empty-scans">
      <div className="mx-auto h-12 w-12 rounded-full border border-border bg-secondary/50 flex items-center justify-center">
        <FileScan className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-medium">No scans yet</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        Paste a config or upload a YAML/JSON/TOML file to see findings grouped by severity.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/scan/new">
          <Button data-testid="button-empty-new-scan"><Plus className="mr-1.5 h-4 w-4" />Run your first scan</Button>
        </Link>
        <Link href="/docs">
          <Button variant="outline"><BookOpen className="mr-1.5 h-4 w-4" />View rules</Button>
        </Link>
      </div>
    </div>
  );
}
