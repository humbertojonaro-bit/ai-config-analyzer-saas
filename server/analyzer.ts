// Lightweight config analyzer — mirrors the Python ai_config_analyzer rules.
// Operates on raw text so we don't need a full YAML/TOML parser in the MVP.
import type { Finding } from "@shared/schema";

export type DetectedFormat =
  | "yaml"
  | "json"
  | "toml"
  | "ini"
  | "env"
  | "dockerfile"
  | "k8s"
  | "terraform"
  | "unknown";

export function detectFormat(fileName: string, content: string): DetectedFormat {
  const lower = fileName.toLowerCase();
  if (lower === "dockerfile" || lower.endsWith(".dockerfile") || lower.endsWith("/dockerfile")) return "dockerfile";
  if (lower.endsWith(".tf") || lower.endsWith(".tfvars")) return "terraform";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) {
    if (/^\s*apiVersion:\s*/m.test(content) && /^\s*kind:\s*/m.test(content)) return "k8s";
    return "yaml";
  }
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".toml")) return "toml";
  if (lower.endsWith(".ini") || lower.endsWith(".cfg") || lower.endsWith(".conf")) return "ini";
  if (lower.endsWith(".env") || lower.startsWith(".env")) return "env";

  // Heuristic content-based fallback
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (/^FROM\s+\S+/m.test(content)) return "dockerfile";
  if (/^\s*apiVersion:\s*/m.test(content) && /^\s*kind:\s*/m.test(content)) return "k8s";
  if (/^\s*resource\s+"/m.test(content) || /^\s*provider\s+"/m.test(content)) return "terraform";
  if (/^\[[^\]]+\]\s*$/m.test(content) && /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/m.test(content)) {
    // could be toml or ini — toml typically uses quoted strings
    return /=\s*"/m.test(content) ? "toml" : "ini";
  }
  if (/^\s*[A-Z_][A-Z0-9_]*=/m.test(content)) return "env";
  if (/^\s*\S+:\s*/m.test(content)) return "yaml";
  return "unknown";
}

interface RuleHit {
  ruleId: string;
  title: string;
  severity: Finding["severity"];
  category: string;
  description: string;
  recommendation: string;
}

// Heuristic line-based rules. Each returns finding metadata when the line matches.
const SECRET_KEY_RE = /(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|aws[_-]?secret)/i;
const PLACEHOLDER_RE = /^(\$\{[^}]+\}|<[^>]+>|changeme|todo|xxx+|\*+|""|''|null|none)$/i;

const HIGH_ENTROPY_RE = /[A-Za-z0-9+/=_-]{24,}/;
const AWS_AKID_RE = /AKIA[0-9A-Z]{16}/;
const PRIVATE_KEY_RE = /-----BEGIN (RSA |EC |DSA |OPENSSH |)?PRIVATE KEY-----/;

function extractKeyValue(line: string): { key: string; value: string } | null {
  // YAML key: value, JSON "key": "value", TOML/INI/ENV key = value, ENV KEY=value
  let m = line.match(/^\s*"?([A-Za-z0-9_.\-]+)"?\s*[:=]\s*(.*?)\s*[,;]?\s*$/);
  if (!m) return null;
  let value = m[2];
  // Strip quotes if matched on both sides
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key: m[1], value };
}

function isPlaceholder(value: string): boolean {
  if (!value) return true;
  return PLACEHOLDER_RE.test(value.trim());
}

function redact(value: string): string {
  if (value.length <= 6) return "***";
  return value.slice(0, 3) + "…" + value.slice(-2);
}

export function analyze(content: string, format: DetectedFormat): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split(/\r?\n/);

  // Track seen findings to avoid duplicates of same ruleId on same line
  const seen = new Set<string>();
  function push(f: Finding) {
    const k = `${f.ruleId}:${f.line ?? ""}:${f.path}`;
    if (seen.has(k)) return;
    seen.add(k);
    findings.push(f);
  }

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    const kv = extractKeyValue(line);

    // 1. Hard-coded secrets
    if (kv && SECRET_KEY_RE.test(kv.key) && kv.value && !isPlaceholder(kv.value)) {
      push({
        ruleId: "secrets.hardcoded",
        title: "Possible hard-coded secret",
        severity: "high",
        category: "Secrets",
        path: kv.key,
        line: lineNum,
        description: `The key '${kv.key}' appears to contain a literal secret value. Hard-coded credentials in config files can leak via version control, logs, or backups.`,
        recommendation: "Move the value to an environment variable, a secret manager (AWS Secrets Manager, GCP Secret Manager, Vault), or a `.env` file excluded from VCS.",
        excerpt: `${kv.key} = ${redact(kv.value)}`,
      });
    }

    // 2. AWS Access Key ID anywhere on line
    if (AWS_AKID_RE.test(line)) {
      push({
        ruleId: "secrets.aws-access-key",
        title: "AWS Access Key ID detected",
        severity: "critical",
        category: "Secrets",
        path: kv?.key ?? "(line)",
        line: lineNum,
        description: "An AWS Access Key ID pattern (AKIA…) was found. If this is a live credential, rotate it immediately.",
        recommendation: "Rotate the key in IAM, remove it from the config, and use IAM roles or short-lived STS credentials instead.",
        excerpt: trimmed.slice(0, 80),
      });
    }

    // 3. Private key block
    if (PRIVATE_KEY_RE.test(line)) {
      push({
        ruleId: "secrets.private-key",
        title: "Private key material embedded in config",
        severity: "critical",
        category: "Secrets",
        path: kv?.key ?? "(line)",
        line: lineNum,
        description: "An embedded PEM-formatted private key was detected.",
        recommendation: "Remove the key from this file. Load private keys from a secret store at runtime.",
        excerpt: "-----BEGIN … PRIVATE KEY-----",
      });
    }

    // 4. Debug enabled
    if (kv && /^(debug|debug_mode|verbose_errors)$/i.test(kv.key) && /^(true|1|yes|on)$/i.test(kv.value)) {
      push({
        ruleId: "security.debug-enabled",
        title: "Debug mode enabled",
        severity: "medium",
        category: "Insecure Defaults",
        path: kv.key,
        line: lineNum,
        description: "Debug mode exposes stack traces, internal state, and sometimes secrets in error pages.",
        recommendation: "Set debug to false in production. Use environment-specific configs.",
        excerpt: trimmed,
      });
    }

    // 5. TLS / SSL verification disabled
    if (kv && /^(verify_ssl|ssl_verify|tls_verify|verify|insecure|skip_verify)$/i.test(kv.key)) {
      const off = /^(false|0|no|off)$/i.test(kv.value);
      const insecureFlag = /^(insecure|skip_verify)$/i.test(kv.key) && /^(true|1|yes|on)$/i.test(kv.value);
      if (off || insecureFlag) {
        push({
          ruleId: "security.tls-verification-disabled",
          title: "TLS / certificate verification disabled",
          severity: "high",
          category: "Insecure Defaults",
          path: kv.key,
          line: lineNum,
          description: "Disabling TLS verification allows man-in-the-middle attacks on connections to upstream services.",
          recommendation: "Enable TLS verification. Pin a CA bundle if the upstream uses a private CA.",
          excerpt: trimmed,
        });
      }
    }

    // 6. Bind 0.0.0.0
    if (kv && /^(host|bind|listen|listen_address)$/i.test(kv.key) && /(0\.0\.0\.0|::|\*)/.test(kv.value)) {
      push({
        ruleId: "security.bind-all-interfaces",
        title: "Service binds to all interfaces",
        severity: "low",
        category: "Network",
        path: kv.key,
        line: lineNum,
        description: "Binding to 0.0.0.0 exposes the service on every network interface, including potentially public ones.",
        recommendation: "Bind to 127.0.0.1 and front the service with a reverse proxy, or restrict via a firewall / security group.",
        excerpt: trimmed,
      });
    }

    // 7. Latest image tag
    if (/(^|\s)image\s*[:=]\s*\S+:latest\b/i.test(line) || /^\s*FROM\s+\S+:latest\b/i.test(line) || /^\s*FROM\s+[^:\s]+\s*$/i.test(line)) {
      push({
        ruleId: "container.latest-tag",
        title: "Container image uses :latest (or no tag)",
        severity: "medium",
        category: "Containers",
        path: "image",
        line: lineNum,
        description: "Using `:latest` (or an unpinned tag) makes builds non-reproducible and can silently pull breaking or vulnerable images.",
        recommendation: "Pin to a specific version or, ideally, an immutable digest (e.g. `nginx:1.27.1` or `nginx@sha256:…`).",
        excerpt: trimmed,
      });
    }

    // 8. Privileged / root user (Docker / k8s)
    if (/(^|\s)privileged\s*[:=]\s*(true|1|yes|on)\b/i.test(line)) {
      push({
        ruleId: "container.privileged",
        title: "Privileged container",
        severity: "critical",
        category: "Containers",
        path: "privileged",
        line: lineNum,
        description: "Privileged containers can access host devices and effectively escape isolation. This is rarely needed.",
        recommendation: "Set `privileged: false`. Drop all Linux capabilities and add only the ones you need.",
        excerpt: trimmed,
      });
    }
    if (/(^|\s)runAsUser\s*[:=]\s*0\b/i.test(line) || /^\s*USER\s+(root|0)\s*$/i.test(line)) {
      push({
        ruleId: "container.runs-as-root",
        title: "Container runs as root",
        severity: "high",
        category: "Containers",
        path: "runAsUser",
        line: lineNum,
        description: "Running as UID 0 inside a container increases blast radius of any compromise.",
        recommendation: "Set `runAsNonRoot: true` and use a non-zero `runAsUser`, or `USER appuser` in your Dockerfile.",
        excerpt: trimmed,
      });
    }

    // 9. Wildcard IAM / RBAC
    if (/("|')?(Action|Resource|Principal)("|')?\s*:\s*("|')\*("|')/i.test(line)) {
      push({
        ruleId: "iam.wildcard-permission",
        title: "Wildcard IAM permission",
        severity: "high",
        category: "IAM",
        path: "Action/Resource",
        line: lineNum,
        description: "Using `*` for Action, Resource, or Principal grants unrestricted access — a common source of cloud breaches.",
        recommendation: "Scope the policy to the specific actions, resources, and principals required.",
        excerpt: trimmed,
      });
    }
    if (/(^|\s)resources:\s*\[?\s*["']?\*["']?\s*\]?/i.test(line) && /verbs|apiGroups/i.test(content)) {
      push({
        ruleId: "iam.k8s-wildcard-rbac",
        title: "Wildcard RBAC rule",
        severity: "high",
        category: "IAM",
        path: "resources",
        line: lineNum,
        description: "A Kubernetes Role/ClusterRole grants permissions on all resources (`*`).",
        recommendation: "List the specific resources and verbs the workload needs.",
        excerpt: trimmed,
      });
    }

    // 10. High-entropy literal as value (likely secret) — only when key didn't already match
    if (kv && !SECRET_KEY_RE.test(kv.key) && HIGH_ENTROPY_RE.test(kv.value) && kv.value.length >= 32 && !isPlaceholder(kv.value)) {
      push({
        ruleId: "secrets.high-entropy",
        title: "High-entropy value (possible secret)",
        severity: "medium",
        category: "Secrets",
        path: kv.key,
        line: lineNum,
        description: `The value of '${kv.key}' looks like a random token. If it is a credential, treat it like a secret.`,
        recommendation: "If this is a credential, move it to a secret manager. If not, ignore this finding.",
        excerpt: `${kv.key} = ${redact(kv.value)}`,
      });
    }
  });

  // 11. Missing resource limits in k8s manifests
  if (format === "k8s" || /apiVersion:/i.test(content)) {
    const hasContainers = /\bcontainers:\s*$/m.test(content) || /^\s*-\s*name:\s*\S+/m.test(content);
    const hasLimits = /\blimits:\s*$/m.test(content);
    if (hasContainers && !hasLimits) {
      push({
        ruleId: "k8s.missing-resource-limits",
        title: "Missing resource limits",
        severity: "medium",
        category: "Kubernetes",
        path: "spec.containers[].resources.limits",
        line: null,
        description: "Containers without CPU/memory limits can starve neighbours on the same node and trigger noisy-neighbour incidents.",
        recommendation: "Add `resources.limits.cpu` and `resources.limits.memory` for every container.",
      });
    }
    const hasReadOnlyFs = /readOnlyRootFilesystem:\s*true/i.test(content);
    if (hasContainers && !hasReadOnlyFs) {
      push({
        ruleId: "k8s.writable-root-fs",
        title: "Container root filesystem is writable",
        severity: "low",
        category: "Kubernetes",
        path: "securityContext.readOnlyRootFilesystem",
        line: null,
        description: "A writable root filesystem makes it easier for an attacker who lands code execution to install tools or persist.",
        recommendation: "Set `securityContext.readOnlyRootFilesystem: true` and mount writable volumes where needed.",
      });
    }
  }

  // 12. Docker compose / Dockerfile checks
  if (format === "dockerfile" || /^FROM\s+/m.test(content)) {
    if (!/^USER\s+\S+/m.test(content)) {
      push({
        ruleId: "container.no-user-directive",
        title: "Dockerfile has no USER directive",
        severity: "medium",
        category: "Containers",
        path: "Dockerfile",
        line: null,
        description: "Without a USER directive the container runs as root by default.",
        recommendation: "Add `USER appuser` (and `RUN adduser -D appuser`) before your CMD.",
      });
    }
    if (/^ADD\s+https?:\/\//m.test(content)) {
      push({
        ruleId: "container.add-remote",
        title: "ADD used to fetch remote URL",
        severity: "low",
        category: "Containers",
        path: "Dockerfile",
        line: null,
        description: "`ADD <url>` skips checksum verification and can break reproducibility.",
        recommendation: "Use `RUN curl -fsSL <url> -o … && echo '<sha256>  …' | sha256sum -c -` instead.",
      });
    }
  }

  return findings;
}

export function summarize(findings: Finding[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  let status: "pass" | "warning" | "critical" = "pass";
  if (counts.critical > 0 || counts.high > 0) status = "critical";
  else if (counts.medium > 0 || counts.low > 0 || counts.info > 0) status = "warning";
  return { status, counts, total: findings.length };
}
