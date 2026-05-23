import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScanFull, UsageInfo } from "@/lib/api-types";
import { AlertCircle, FileUp, Loader2, Play, RotateCcw, Sparkles, Upload } from "lucide-react";

const SAMPLE = `services:
  api:
    image: myapi:latest
    privileged: true
    environment:
      DB_PASSWORD: "hunter2"
      AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
      VERIFY_SSL: "false"
    ports:
      - "0.0.0.0:80:80"
`;

const FORMAT_OPTIONS = [
  { value: "auto", label: "Auto-detect (recommended)" },
  { value: "yaml", label: "YAML" },
  { value: "json", label: "JSON" },
  { value: "toml", label: "TOML" },
  { value: "ini", label: "INI" },
  { value: "env", label: "ENV" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "k8s", label: "Kubernetes" },
  { value: "terraform", label: "Terraform" },
];

const MAX_BYTES = 200 * 1024; // 200KB

export default function NewScan() {
  const [, navigate] = useLocation();
  const [fileName, setFileName] = useState("pasted.yaml");
  const [content, setContent] = useState("");
  const [format, setFormat] = useState("auto");
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const usageQ = useQuery<UsageInfo>({ queryKey: ["/api/usage"] });
  const usage = usageQ.data;

  const scanMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/scans", { fileName, content, format });
      return (await r.json()) as { scan: ScanFull };
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      navigate(`/scans/${d.scan.id}`);
    },
    onError: (err: any) => {
      if (err?.status === 402 && err?.body?.error === "quota_exceeded") {
        setQuotaInfo(err.body);
      } else {
        setError(err?.message ?? "Scan failed.");
      }
    },
  });

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(`File too large (${Math.round(file.size / 1024)} KB). Max ${MAX_BYTES / 1024} KB in the MVP.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result ?? ""));
      setFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
  }

  const charCount = content.length;
  const overSize = charCount > MAX_BYTES;
  const canSubmit = content.trim().length > 0 && !overSize && !scanMutation.isPending;

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">New scan</div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Scan a config</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload or paste a configuration file. Format is detected automatically.
          </p>
        </div>
        {usage && (
          <div className="text-xs text-muted-foreground text-mono" data-testid="text-usage-badge">
            {usage.used} / {usage.limit} scans used this month
          </div>
        )}
      </div>

      {quotaInfo && (
        <div className="mb-5 rounded-xl border bg-sev-medium p-4" data-testid="alert-quota">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-sev-medium mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">You've hit your free monthly scan limit.</div>
              <p className="text-sm text-muted-foreground mt-1">
                Free plans get {quotaInfo.limit} scans per month. Upgrade to Pro for 100 scans, scan history, and Markdown exports.
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/billing">
                  <Button size="sm" data-testid="button-quota-upgrade">Upgrade plan</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => setQuotaInfo(null)}>Dismiss</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-card-border bg-card">
          <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
            <Label htmlFor="config-content" className="text-sm font-medium">Configuration content</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".yaml,.yml,.json,.toml,.ini,.cfg,.conf,.env,.tf,.tfvars,Dockerfile,text/plain"
                onChange={(e) => onFile(e.target.files?.[0])}
                data-testid="input-file"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-file"
              >
                <FileUp className="mr-1.5 h-3.5 w-3.5" />
                Upload file
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setContent(SAMPLE); setFileName("compose-example.yaml"); }}
                data-testid="button-load-sample"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Load sample
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setContent(""); setFileName("pasted.yaml"); setError(null); }}
                data-testid="button-clear"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </div>
          <Textarea
            id="config-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste YAML, JSON, TOML, INI, ENV, Dockerfile, Kubernetes, or Terraform here…"
            className="font-mono text-[13px] leading-relaxed min-h-[440px] border-0 rounded-none focus-visible:ring-0 resize-none bg-transparent"
            data-testid="input-content"
          />
          <div className="px-5 py-2 border-t border-card-border text-xs text-mono text-muted-foreground flex items-center justify-between">
            <span data-testid="text-char-count">
              {charCount.toLocaleString()} chars · {(charCount / 1024).toFixed(1)} KB / {MAX_BYTES / 1024} KB max
            </span>
            {overSize && <span className="text-sev-high font-medium">Over size limit</span>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="file-name">File name</Label>
              <Input
                id="file-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="docker-compose.yml"
                data-testid="input-filename"
              />
              <p className="text-xs text-muted-foreground">Used to improve format detection and report metadata.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="format-select">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format-select" data-testid="select-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-format-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!canSubmit}
              onClick={() => scanMutation.mutate()}
              data-testid="button-run-scan"
            >
              {scanMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning…</>
              ) : (
                <><Play className="mr-2 h-4 w-4" />Run scan</>
              )}
            </Button>
            {error && (
              <div className="text-xs text-sev-high flex items-start gap-2" data-testid="text-scan-error">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-card-border bg-card p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Upload className="h-3.5 w-3.5 text-primary" />
              What we scan for
            </div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Hard-coded secrets, API keys, private keys</li>
              <li>Privileged containers, root user, <span className="text-mono">:latest</span> tags</li>
              <li>Disabled TLS verification, debug flags</li>
              <li>Wildcard IAM/RBAC and missing K8s limits</li>
              <li>Bind-to-all-interfaces, weak defaults</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
