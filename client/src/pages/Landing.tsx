import { Link } from "wouter";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import {
  Github,
  ArrowRight,
  ShieldCheck,
  FileCode2,
  Sparkles,
  CheckCircle2,
  Moon,
  Sun,
  Terminal,
  Lock,
} from "lucide-react";

const formats = ["YAML", "JSON", "TOML", "INI", "ENV", "Dockerfile", "Kubernetes", "Terraform"];

const sampleFindings = [
  {
    severity: "critical" as const,
    title: "AWS Access Key ID detected",
    rule: "secrets.aws-access-key",
    excerpt: 'aws_access_key_id = "AKIAIOSFODNN7EXAMPLE"',
    fix: "Rotate the key and use IAM roles or short-lived STS credentials.",
  },
  {
    severity: "high" as const,
    title: "TLS verification disabled",
    rule: "security.tls-verification-disabled",
    excerpt: "verify_ssl: false",
    fix: "Enable TLS verification and pin a CA bundle.",
  },
  {
    severity: "medium" as const,
    title: "Container image uses :latest",
    rule: "container.latest-tag",
    excerpt: "image: postgres:latest",
    fix: "Pin to a specific tag or an immutable digest.",
  },
];

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "/month",
    cta: "Start free",
    bullets: ["3 scans / month", "Upload or paste", "Findings dashboard", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    cadence: "/month",
    highlight: true,
    cta: "Upgrade to Pro",
    bullets: ["100 scans / month", "Scan history", "Markdown reports", "API key access", "Priority email"],
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    cadence: "/month",
    cta: "Start Team trial",
    bullets: ["1,000 scans / month", "Multiple API keys", "CI/CD usage token", "Higher file size limits", "Seat support (soon)"],
  },
];

export default function Landing() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border sticky top-0 bg-background/85 backdrop-blur z-30">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <Wordmark size={26} />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground" data-testid="link-features">
              Features
            </button>
            <button onClick={() => document.getElementById("findings")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground" data-testid="link-sample">
              Sample findings
            </button>
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground" data-testid="link-pricing">
              Pricing
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggle} className="h-9 w-9 p-0" data-testid="button-toggle-theme-landing">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <Link href="/app">
                <Button size="sm" data-testid="button-open-app">Open app</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="button-login-nav">Log in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" data-testid="button-signup-nav">
                    Start free scan
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Open-source engine · pre-deployment checks in seconds
              </div>
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
                Find risky DevOps config issues <span className="text-primary">before</span> they hit production.
              </h1>
              <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl">
                Scan Docker, Kubernetes, Terraform, YAML, JSON, TOML, INI, and ENV files for exposed secrets,
                insecure defaults, weak settings, and CI/CD-breaking problems. Made for small teams without a
                dedicated DevSecOps engineer.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/signup">
                  <Button size="lg" data-testid="button-hero-signup">
                    Start a free scan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Button variant="outline" size="lg" data-testid="button-hero-github">
                    <Github className="mr-2 h-4 w-4" />
                    View on GitHub
                  </Button>
                </a>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                3 free scans / month · No credit card · Cancel anytime
              </p>
            </div>

            {/* Terminal-y mock card */}
            <div className="rounded-xl border border-card-border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-card-border bg-secondary/50">
                <span className="h-2.5 w-2.5 rounded-full bg-sev-critical" />
                <span className="h-2.5 w-2.5 rounded-full bg-sev-medium" />
                <span className="h-2.5 w-2.5 rounded-full bg-sev-low" />
                <span className="ml-3 text-xs text-muted-foreground text-mono">production-compose.yml</span>
              </div>
              <pre className="text-mono text-[11px] md:text-[12px] leading-relaxed p-5 overflow-x-auto whitespace-pre bg-card">
{`services:
  api:
    image: myapi:latest    `}<span className="text-sev-medium"># medium · :latest tag</span>{`
    privileged: true       `}<span className="text-sev-critical"># critical · privileged</span>{`
    environment:
      DB_PASSWORD: hunter2 `}<span className="text-sev-high"># high · hardcoded secret</span>{`
      VERIFY_SSL: "false"  `}<span className="text-sev-high"># high · TLS off</span>{`
    ports:
      - "0.0.0.0:80:80"    `}<span className="text-sev-low"># low · binds 0.0.0.0</span>{`
`}
              </pre>
              <div className="border-t border-card-border px-5 py-3 flex items-center justify-between text-xs">
                <span className="text-mono text-muted-foreground">5 findings · 1 critical · 2 high</span>
                <span className="text-primary font-medium inline-flex items-center gap-1">
                  Recommended fixes <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported formats */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-wider font-medium">Supports</span>
          {formats.map((f) => (
            <span key={f} className="text-mono text-foreground" data-testid={`text-format-${f.toLowerCase()}`}>
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* Three steps */}
      <section id="features" className="border-b border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Three steps. Under five minutes.</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
            No agents to install, no repo permissions to grant, no waiting on a security review queue.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              { n: "01", Icon: FileCode2, title: "Upload or paste", body: "Drag in a config file, paste from your clipboard, or call the API from CI." },
              { n: "02", Icon: Sparkles, title: "Scan in seconds", body: "Format is detected automatically. Rules cover secrets, insecure defaults, container, IAM, and structure." },
              { n: "03", Icon: ShieldCheck, title: "Fix with confidence", body: "Findings ship with rule IDs, exact lines, and copy-pasteable remediation guidance." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-card-border bg-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-mono text-xs text-muted-foreground">{s.n}</span>
                  <s.Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-medium">{s.title}</div>
                <p className="text-sm text-muted-foreground mt-1.5">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample findings */}
      <section id="findings" className="border-b border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">A few things we'd flag right now</h2>
              <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-xl">
                Real rule IDs, real fixes. Drop in a config and we'll show you everything the engine finds.
              </p>
            </div>
            <Link href="/signup">
              <Button variant="outline" data-testid="button-try-sample">Try it on your config</Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {sampleFindings.map((f) => (
              <div key={f.rule} className="rounded-xl border border-card-border bg-card p-5 flex flex-col">
                <SeverityBadge severity={f.severity} />
                <h3 className="font-medium mt-3">{f.title}</h3>
                <code className="text-mono text-xs text-muted-foreground mt-1">{f.rule}</code>
                <pre className="mt-3 rounded-md border border-border bg-secondary/40 p-2.5 text-mono text-[11px] overflow-x-auto">
{f.excerpt}
                </pre>
                <p className="text-sm text-muted-foreground mt-3 flex-1">
                  <span className="text-foreground font-medium">Fix · </span>
                  {f.fix}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Simple, usage-based pricing</h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Start free. Upgrade when scan history, exports, or the API become useful.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {plans.map((p) => (
              <div
                key={p.id}
                data-testid={`card-plan-${p.id}`}
                className={`rounded-xl border bg-card p-6 flex flex-col ${
                  p.highlight ? "border-primary ring-1 ring-primary/40" : "border-card-border"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="font-medium text-base">{p.name}</div>
                  {p.highlight && (
                    <span className="text-[10px] uppercase tracking-wider rounded-full bg-primary/15 text-primary px-2 py-0.5">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.cadence}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6">
                  <Button
                    className="w-full"
                    variant={p.highlight ? "default" : "outline"}
                    data-testid={`button-plan-${p.id}`}
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid md:grid-cols-3 gap-5">
          {[
            { Icon: Github, title: "Open-source engine", body: "The analyzer is MIT-licensed. Inspect every rule. Self-host if you prefer." },
            { Icon: Terminal, title: "CI/CD ready", body: "API + Docker image so you can fail builds on critical findings." },
            { Icon: Lock, title: "Secrets stay yours", body: "We don't log raw config contents. Findings store only file metadata + redacted excerpts." },
          ].map((t) => (
            <div key={t.title} className="flex gap-3">
              <div className="h-9 w-9 rounded-md border border-border bg-card flex items-center justify-center shrink-0">
                <t.Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">{t.title}</div>
                <p className="text-sm text-muted-foreground mt-1">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-b border-border">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Ship safer configs this week.</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Run your first scan in under five minutes. Three free every month, no credit card.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6" data-testid="button-bottom-signup">
              Start a free scan <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Wordmark size={20} />
        </div>
        <div className="text-mono">© {new Date().getFullYear()} AI Config Analyzer · MIT-licensed engine</div>
      </footer>
    </div>
  );
}
