import { AppShell } from "@/components/AppShell";
import { SeverityBadge } from "@/components/SeverityBadge";

const RULES = [
  { id: "secrets.aws-access-key", sev: "critical" as const, cat: "Secrets", title: "AWS Access Key ID detected", desc: "Catches AKIA-prefixed AWS access keys committed to config." },
  { id: "secrets.private-key", sev: "critical" as const, cat: "Secrets", title: "Embedded PEM private key", desc: "Detects -----BEGIN … PRIVATE KEY----- blocks." },
  { id: "container.privileged", sev: "critical" as const, cat: "Containers", title: "Privileged container", desc: "Flags privileged: true in Docker/K8s manifests." },
  { id: "secrets.hardcoded", sev: "high" as const, cat: "Secrets", title: "Hard-coded secret value", desc: "Keys like password, token, api_key with a literal (non-placeholder) value." },
  { id: "secrets.high-entropy", sev: "medium" as const, cat: "Secrets", title: "High-entropy value", desc: "Long random-looking strings on non-secret keys — possibly a leaked credential." },
  { id: "security.tls-verification-disabled", sev: "high" as const, cat: "Insecure Defaults", title: "TLS verification disabled", desc: "verify_ssl/tls_verify=false or insecure=true." },
  { id: "security.debug-enabled", sev: "medium" as const, cat: "Insecure Defaults", title: "Debug mode enabled", desc: "debug=true exposes stack traces and internal state." },
  { id: "security.bind-all-interfaces", sev: "low" as const, cat: "Network", title: "Service binds 0.0.0.0", desc: "host/bind/listen set to 0.0.0.0, ::, or *." },
  { id: "container.latest-tag", sev: "medium" as const, cat: "Containers", title: "Image uses :latest (or no tag)", desc: "Non-reproducible builds, can pull breaking changes." },
  { id: "container.runs-as-root", sev: "high" as const, cat: "Containers", title: "Container runs as root", desc: "runAsUser: 0 or USER root." },
  { id: "container.no-user-directive", sev: "medium" as const, cat: "Containers", title: "Dockerfile has no USER directive", desc: "Container will run as root by default." },
  { id: "container.add-remote", sev: "low" as const, cat: "Containers", title: "ADD used to fetch remote URL", desc: "Skips checksum verification; prefer RUN curl + sha256sum -c." },
  { id: "iam.wildcard-permission", sev: "high" as const, cat: "IAM", title: "Wildcard IAM permission", desc: "Action/Resource/Principal set to *." },
  { id: "iam.k8s-wildcard-rbac", sev: "high" as const, cat: "IAM", title: "Wildcard RBAC rule", desc: "Role/ClusterRole grants resources: ['*']." },
  { id: "k8s.missing-resource-limits", sev: "medium" as const, cat: "Kubernetes", title: "Missing resource limits", desc: "Containers without CPU/memory limits can starve neighbours." },
  { id: "k8s.writable-root-fs", sev: "low" as const, cat: "Kubernetes", title: "Writable root filesystem", desc: "readOnlyRootFilesystem not set to true." },
];

export default function Docs() {
  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Reference</div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Rules & supported formats</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Every finding ships with a stable rule ID you can suppress or pin in CI. Rules cover secrets, insecure defaults,
          containers, IAM, and Kubernetes structure.
        </p>
      </div>

      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase tracking-wider border-b border-card-border">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Severity</th>
              <th className="text-left font-medium px-4 py-2.5">Rule ID</th>
              <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Category</th>
              <th className="text-left font-medium px-4 py-2.5">Title</th>
              <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Description</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.id} className="border-b border-card-border last:border-0" data-testid={`row-rule-${r.id}`}>
                <td className="px-4 py-3"><SeverityBadge severity={r.sev} /></td>
                <td className="px-4 py-3 text-mono text-xs">{r.id}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{r.cat}</td>
                <td className="px-4 py-3">{r.title}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="font-medium text-sm">Supported formats</div>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
            <li><span className="text-mono text-foreground">.yaml</span>, <span className="text-mono text-foreground">.yml</span> — including Kubernetes manifests</li>
            <li><span className="text-mono text-foreground">.json</span>, <span className="text-mono text-foreground">.toml</span>, <span className="text-mono text-foreground">.ini</span>, <span className="text-mono text-foreground">.cfg</span>, <span className="text-mono text-foreground">.conf</span></li>
            <li><span className="text-mono text-foreground">.env</span> files</li>
            <li><span className="text-mono text-foreground">Dockerfile</span> and Docker Compose</li>
            <li><span className="text-mono text-foreground">.tf</span>, <span className="text-mono text-foreground">.tfvars</span> (Terraform)</li>
          </ul>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="font-medium text-sm">Privacy</div>
          <p className="text-sm text-muted-foreground mt-2">
            Findings store only the file name, detected format, severity counts, and a redacted excerpt for matching lines.
            Raw config contents are not logged.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
