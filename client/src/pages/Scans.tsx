import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/SeverityBadge";
import type { ScanSummary } from "@/lib/api-types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, ArrowRight } from "lucide-react";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

export default function Scans() {
  const { data, isLoading } = useQuery<{ scans: ScanSummary[] }>({ queryKey: ["/api/scans"] });
  const scans = data?.scans ?? [];

  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/scans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scans"] }),
  });

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">History</div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Scan history</h1>
        </div>
        <Link href="/scan/new">
          <Button data-testid="button-history-new-scan">
            <Plus className="mr-1.5 h-4 w-4" />
            New scan
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : scans.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground" data-testid="empty-history">
            No scans yet. <Link href="/scan/new" className="text-primary hover:underline">Run your first one →</Link>
          </div>
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
              {scans.map((s) => (
                <tr key={s.id} className="border-b border-card-border last:border-0 hover-elevate" data-testid={`row-history-${s.id}`}>
                  <td className="px-4 py-3 text-mono text-[13px]">{s.fileName}</td>
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
                    <div className="inline-flex gap-1">
                      <Link href={`/scans/${s.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-open-${s.id}`}>
                          Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-sev-high"
                        onClick={() => del.mutate(s.id)}
                        data-testid={`button-delete-${s.id}`}
                        title="Delete scan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
