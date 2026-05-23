import { useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SeverityBadge, StatusPill } from "@/components/SeverityBadge";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { ScanFull, Severity } from "@/lib/api-types";
import {
  Download,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Lock,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";

const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export default function ScanResults() {
  const [, params] = useRoute<{ id: string }>("/scans/:id");
  const id = params?.id;
  const { user } = useAuth();
  const isPaid = user?.plan === "pro" || user?.plan === "team";

  const q = useQuery<{ scan: ScanFull }>({
    queryKey: ["/api/scans", id],
    enabled: !!id,
  });

  const scan = q.data?.scan;
  const grouped = useMemo(() => {
    if (!scan) return {} as Record<Severity, ScanFull["findings"]>;
    const out: Record<string, ScanFull["findings"]> = {};
    for (const s of SEV_ORDER) out[s] = [];
    for (const f of scan.findings) out[f.severity].push(f);
    return out as Record<Severity, ScanFull["findings"]>;
  }, [scan]);

  const [filter, setFilter] = useState<Severity | "all">("all");

  async function downloadReport() {
    if (!scan) return;
    const res = await apiRequest("GET", `/api/scans/${scan.id}/report.md`);
    const text = await res.text();
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan-${scan.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (q.isLoading) {
    return (
      <AppShell>
        <div className="text-muted-foreground text-sm">Loading scan…</div>
      </AppShell>
    );
  }
  if (!scan) {
    return (
      <AppShell>
        <div className="rounded-xl border border-card-border bg-card p-10 text-center">
          <h2 className="font-semibold">Scan not found</h2>
          <p className="text-sm text-muted-foreground mt-1">It may have been deleted, or it doesn't belong to your account.</p>
          <Link href="/scans"><Button variant="outline" className="mt-4">Back to scans</Button></Link>
        </div>
      </AppShell>
    );
  }

  const counts = { critical: scan.criticalCount, high: scan.highCount, medium: scan.mediumCount, low: scan.lowCount, info: 0 };
  const total = scan.findingCount;
  const filtered = filter === "all" ? scan.findings : grouped[filter];

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Link href="/scans" className="hover:text-foreground inline-flex items-center gap-1" data-testid="link-back-to-scans">
          <ArrowLeft className="h-3.5 w-3.5" />
          All scans
        </Link>
        <span>/</span>
        <span className="text-mono text-foreground">{scan.fileName}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-3" data-testid="text-scan-title">
            <StatusPill status={scan.status} />
            Scan #{scan.id}
          </h1>
          <div className="text-sm text-muted-foreground mt-1 text-mono">
            {scan.fileName} · <span className="uppercase">{scan.detectedFormat}</span> · {new Date(scan.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          {isPaid ? (
            <Button onClick={downloadReport} data-testid="button-download-report">
              <Download className="mr-1.5 h-4 w-4" />
              Download .md report
            </Button>
          ) : (
            <Link href="/billing">
              <Button variant="outline" data-testid="button-upgrade-for-report">
                <Lock className="mr-1.5 h-4 w-4" />
                Upgrade to export
              </Button>
            </Link>
          )}
          <Link href="/scan/new">
            <Button variant="outline" data-testid="button-new-scan-from-results">Run another</Button>
          </Link>
        </div>
      </div>

      {/* Severity overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <SummaryCard
          label="Total"
          value={total}
          tone="default"
          active={filter === "all"}
          onClick={() => setFilter("all")}
          testId="card-total"
        />
        {SEV_ORDER.slice(0, 4).map((sev) => (
          <SummaryCard
            key={sev}
            label={sev.toUpperCase()}
            value={(counts as any)[sev]}
            tone={sev}
            active={filter === sev}
            onClick={() => setFilter(filter === sev ? "all" : sev)}
            testId={`card-summary-${sev}`}
          />
        ))}
      </div>

      {/* Findings list */}
      {total === 0 ? (
        <div className="rounded-xl border border-card-border bg-card p-10 text-center" data-testid="empty-findings">
          <div className="mx-auto h-12 w-12 rounded-full border border-border flex items-center justify-center bg-sev-low">
            <CheckCircle2 className="h-5 w-5 text-sev-low" />
          </div>
          <h3 className="mt-4 font-medium">No issues detected</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
            This config passed all enabled rules. Re-run after every change to catch regressions early.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">No findings at this severity.</div>
          ) : (
            filtered.map((f, i) => <FindingCard key={`${f.ruleId}-${i}`} f={f} />)
          )}
        </div>
      )}

      {/* Preview of scanned content (redacted) */}
      {scan.preview && (
        <div className="mt-8 rounded-xl border border-card-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-card-border text-xs text-muted-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-mono">Scanned content (first lines)</span>
          </div>
          <pre className="text-mono text-[12px] p-4 overflow-x-auto whitespace-pre-wrap" data-testid="text-content-preview">
{scan.preview}
          </pre>
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
  testId,
}: {
  label: string;
  value: number;
  tone: "default" | Severity;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  const toneCls =
    tone === "default"
      ? "border-card-border"
      : tone === "critical"
      ? "bg-sev-critical text-sev-critical"
      : tone === "high"
      ? "bg-sev-high text-sev-high"
      : tone === "medium"
      ? "bg-sev-medium text-sev-medium"
      : tone === "low"
      ? "bg-sev-low text-sev-low"
      : "bg-sev-info text-sev-info";

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`rounded-xl border bg-card text-left p-4 transition-all hover-elevate ${toneCls} ${
        active ? "ring-2 ring-primary/60" : ""
      }`}
    >
      <div className="text-[11px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-mono">{value}</div>
    </button>
  );
}

function FindingCard({ f }: { f: ScanFull["findings"][number] }) {
  const [open, setOpen] = useState(true);
  const Icon = f.severity === "critical" || f.severity === "high" ? AlertOctagon : ChevronRight;
  return (
    <div
      className="rounded-xl border border-card-border bg-card overflow-hidden"
      data-testid={`card-finding-${f.ruleId}`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover-elevate"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <SeverityBadge severity={f.severity} />
            <span className="font-medium" data-testid="text-finding-title">{f.title}</span>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground text-mono flex flex-wrap gap-x-3 gap-y-1">
            <span>rule: <span className="text-foreground">{f.ruleId}</span></span>
            <span>category: <span className="text-foreground">{f.category}</span></span>
            <span>path: <span className="text-foreground">{f.path}</span>{f.line ? `:${f.line}` : ""}</span>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" /> : <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-card-border bg-card">
          {f.excerpt && (
            <pre className="mt-3 rounded-md border border-border bg-secondary/40 p-2.5 text-mono text-[12px] overflow-x-auto" data-testid="text-finding-excerpt">
{f.excerpt}
            </pre>
          )}
          <p className="text-sm text-muted-foreground mt-3" data-testid="text-finding-description">{f.description}</p>
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm" data-testid="text-finding-recommendation">
            <span className="font-medium text-primary">Recommended fix · </span>
            {f.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
