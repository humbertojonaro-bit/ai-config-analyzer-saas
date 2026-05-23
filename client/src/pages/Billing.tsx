import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UsageInfo, PlanId } from "@/lib/api-types";
import { CheckCircle2, Lock, Sparkles, Loader2, ExternalLink, CreditCard, WalletCards, Landmark, BadgeCheck } from "lucide-react";

interface PlanCardSpec {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  scans: string;
  bullets: string[];
  highlight?: boolean;
}

type PaymentMethod = "card" | "paypal" | "invoice";

interface PaymentMethodSpec {
  id: PaymentMethod;
  name: string;
  processor: string;
  description: string;
  badge: string;
  icon: typeof CreditCard;
  methods: string[];
}

const PAYMENT_METHODS: PaymentMethodSpec[] = [
  {
    id: "card",
    name: "Card + wallets",
    processor: "Stripe Checkout",
    description: "Credit/debit cards plus Apple Pay and Google Pay once Stripe is connected.",
    badge: "Best default",
    icon: CreditCard,
    methods: ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"],
  },
  {
    id: "paypal",
    name: "PayPal",
    processor: "PayPal Checkout",
    description: "Let customers pay with PayPal balance or PayPal-backed card funding.",
    badge: "Buyer trust",
    icon: WalletCards,
    methods: ["PayPal balance", "PayPal cards"],
  },
  {
    id: "invoice",
    name: "Invoice / bank transfer",
    processor: "Manual approval",
    description: "Good for teams that need ACH, wire transfer, or invoice approval before access.",
    badge: "B2B friendly",
    icon: Landmark,
    methods: ["ACH", "wire", "invoice"],
  },
];

const PLANS: PlanCardSpec[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "/month",
    scans: "3 scans / month",
    bullets: ["Upload or paste", "Basic findings dashboard", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    cadence: "/month",
    scans: "100 scans / month",
    bullets: ["Scan history", "Markdown report exports", "Analyze API access", "Priority email support"],
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    cadence: "/month",
    scans: "1,000 scans / month",
    bullets: ["Multiple API keys", "CI/CD usage token", "Higher file size limits", "Seat support (coming soon)"],
  },
];

export default function Billing() {
  const { user, refresh } = useAuth();
  const usageQ = useQuery<UsageInfo>({ queryKey: ["/api/usage"] });
  const [, navigate] = useLocation();
  const search = useSearch(); // for ?plan= from success route
  const { toast } = useToast();
  const [confirmPlan, setConfirmPlan] = useState<PlanId | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [checkoutDetails, setCheckoutDetails] = useState<any>(null);

  const checkout = useMutation({
    mutationFn: async ({ plan, method }: { plan: PlanId; method: PaymentMethod }) => {
      const r = await apiRequest("POST", "/api/billing/checkout", { plan, paymentMethod: method });
      return await r.json();
    },
    onSuccess: (d, variables) => {
      // In a real flow we'd redirect to the provider checkout URL.
      // For preview, surface the simulated confirm step.
      setCheckoutDetails(d);
      if (d.simulated) setConfirmPlan(variables.plan);
    },
  });

  const sim = useMutation({
    mutationFn: async ({ plan, method }: { plan: PlanId; method?: PaymentMethod }) => {
      const r = await apiRequest("POST", "/api/billing/simulate-upgrade", { plan, paymentMethod: method });
      return await r.json();
    },
    onSuccess: async () => {
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({ title: "Plan updated", description: "Your new monthly limits are active." });
      setConfirmPlan(null);
      setCheckoutDetails(null);
    },
  });

  const downgrade = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/billing/simulate-upgrade", { plan: "free" });
      return await r.json();
    },
    onSuccess: async () => {
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({ title: "Downgraded to Free", description: "You'll keep your scan history." });
    },
  });

  const currentPlan = (user?.plan ?? "free") as PlanId;

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Billing</div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Plan & billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription. Choose card/wallets, PayPal, or invoice payment when you upgrade.
        </p>
      </div>

      {/* Current usage panel */}
      <div className="rounded-xl border border-card-border bg-card p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-semibold" data-testid="text-billing-plan">{usageQ.data?.planLabel}</span>
            <span className="text-sm text-muted-foreground text-mono">
              {usageQ.data ? `${usageQ.data.used} / ${usageQ.data.limit} scans this month` : ""}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled data-testid="button-stripe-portal">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Manage in Stripe Portal
            <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
          </Button>
          {currentPlan !== "free" && (
            <Button
              variant="ghost"
              onClick={() => downgrade.mutate()}
              disabled={downgrade.isPending}
              data-testid="button-downgrade"
            >
              {downgrade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Switch to Free"}
            </Button>
          )}
        </div>
      </div>

      {/* Payment methods */}
      <div className="rounded-xl border border-card-border bg-card p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Payment methods</div>
            <h2 className="text-base font-semibold mt-1">Choose how customers can pay</h2>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Preview · simulated
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {PAYMENT_METHODS.map((m) => {
            const Icon = m.icon;
            const selected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                data-testid={`button-payment-method-${m.id}`}
                className={`text-left rounded-lg border p-4 transition ${
                  selected ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-card-border bg-secondary/30 hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-md border p-2 ${selected ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{m.name}</span>
                      <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{m.badge}</span>
                    </div>
                    <div className="text-xs text-primary mt-0.5">{m.processor}</div>
                  </div>
                  {selected && <BadgeCheck className="ml-auto h-4 w-4 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{m.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.methods.map((method) => (
                    <span key={method} className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {method}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = p.id === currentPlan;
          return (
            <div
              key={p.id}
              data-testid={`card-billing-plan-${p.id}`}
              className={`rounded-xl border bg-card p-6 flex flex-col ${
                p.highlight ? "border-primary ring-1 ring-primary/40" : "border-card-border"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="font-medium text-base">{p.name}</div>
                {p.highlight && !isCurrent && (
                  <span className="text-[10px] uppercase tracking-wider rounded-full bg-primary/15 text-primary px-2 py-0.5">
                    Most popular
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wider rounded-full bg-sev-low text-sev-low px-2 py-0.5">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              <div className="text-mono text-xs text-muted-foreground mt-1">{p.scans}</div>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={isCurrent ? "outline" : p.highlight ? "default" : "outline"}
                disabled={isCurrent || checkout.isPending}
                onClick={() => p.id !== "free" && checkout.mutate({ plan: p.id, method: paymentMethod })}
                data-testid={`button-select-${p.id}`}
              >
                {isCurrent ? "Current plan" : p.id === "free" ? "Default" : checkout.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</> : "Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Simulated checkout confirm modal */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4" data-testid="modal-simulated-checkout">
          <div className="w-full max-w-md rounded-xl border border-card-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-mono">{checkoutDetails?.processor ?? PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.processor}</span>
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">Preview · simulated</span>
            </div>
            <h2 className="text-lg font-semibold mt-3">Confirm upgrade to {PLANS.find((p) => p.id === confirmPlan)?.name}</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {checkoutDetails?.message ?? "For the preview, click confirm to simulate a successful payment and unlock the new plan."}
            </p>
            <div className="mt-5 rounded-md border border-border bg-secondary/40 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>{PLANS.find((p) => p.id === confirmPlan)?.name} plan</span><span className="text-mono">{PLANS.find((p) => p.id === confirmPlan)?.price}/mo</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Payment</span><span className="text-mono">{PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>VAT</span><span className="text-mono">$0.00</span></div>
              <div className="flex justify-between font-medium border-t border-border pt-1.5 mt-1"><span>Today</span><span className="text-mono">{PLANS.find((p) => p.id === confirmPlan)?.price}</span></div>
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setConfirmPlan(null); setCheckoutDetails(null); }} data-testid="button-cancel-upgrade">Cancel</Button>
              <Button
                onClick={() => sim.mutate({ plan: confirmPlan, method: paymentMethod })}
                disabled={sim.isPending}
                data-testid="button-confirm-upgrade"
              >
                {sim.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & activate
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-card-border bg-card p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <div className="font-medium text-sm">Payment integrations are ready to wire in.</div>
          <p className="text-sm text-muted-foreground mt-1">
            <code className="text-mono text-xs">POST /api/billing/checkout</code> now accepts <code className="text-mono text-xs">card</code>,{" "}
            <code className="text-mono text-xs">paypal</code>, or <code className="text-mono text-xs">invoice</code>. Wire card/wallets to Stripe Checkout, PayPal to PayPal Orders or Subscriptions, and invoice payments to a manual approval queue.
          </p>
          <div className="mt-3 grid md:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="rounded-md bg-secondary/40 p-2"><span className="text-foreground">Stripe:</span> STRIPE_SECRET_KEY, webhook secret, price IDs</div>
            <div className="rounded-md bg-secondary/40 p-2"><span className="text-foreground">PayPal:</span> client ID, client secret, webhook ID</div>
            <div className="rounded-md bg-secondary/40 p-2"><span className="text-foreground">Invoice:</span> billing email and manual plan approval</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
