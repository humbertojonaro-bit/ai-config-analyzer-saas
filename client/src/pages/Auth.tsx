import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  mode: "signup" | "login";
}

export default function AuthPage({ mode }: Props) {
  const { signup, login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate("/app");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left: decorative side */}
      <div className="hidden lg:flex flex-col justify-between border-r border-border bg-sidebar p-10 relative overflow-hidden">
        <Link href="/" data-testid="link-auth-home"><Wordmark size={28} /></Link>
        <div className="relative z-10 max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">
            Catch risky configs before they reach <span className="text-primary">prod</span>.
          </h2>
          <p className="mt-3 text-muted-foreground text-sm">
            Secrets in YAML. <span className="text-mono">privileged: true</span>. <span className="text-mono">image: …:latest</span>.
            <br />
            Three minutes to a clean scan report.
          </p>
          <div className="mt-8 rounded-lg border border-card-border bg-card p-4 text-sm space-y-2">
            <div className="text-mono text-xs text-muted-foreground"># typical first-scan output</div>
            <div><span className="text-sev-critical">●</span> <span className="text-mono text-xs">1 critical</span></div>
            <div><span className="text-sev-high">●</span> <span className="text-mono text-xs">3 high</span></div>
            <div><span className="text-sev-medium">●</span> <span className="text-mono text-xs">2 medium</span></div>
            <div><span className="text-sev-low">●</span> <span className="text-mono text-xs">1 low</span></div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} AI Config Analyzer</div>
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      </div>

      {/* Right: form */}
      <div className="flex flex-col p-6 md:p-10">
        <div className="lg:hidden mb-8">
          <Link href="/" data-testid="link-auth-home-mobile"><Wordmark size={26} /></Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-xl font-semibold tracking-tight">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {mode === "signup"
                ? "Start free with 3 scans per month. No card required."
                : "Sign in to continue scanning your configs."}
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="form-auth">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  data-testid="input-password"
                />
              </div>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  data-testid="text-auth-error"
                  className="flex items-start gap-2 rounded-md border bg-sev-high p-3 text-sm text-sev-high"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full" data-testid="button-submit-auth">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Create account" : "Sign in"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline" data-testid="link-to-login">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    No account?{" "}
                    <Link href="/signup" className="text-primary hover:underline" data-testid="link-to-signup">
                      Create one
                    </Link>
                  </>
                )}
              </p>
            </form>

            <div className="mt-6 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Preview mode:</span> accounts are stored in a local
              SQLite database. Sessions live only for this tab — refreshing the page signs you out.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
