import { Link, useSearch } from "wouter";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface Props {
  status: "success" | "cancelled";
}

export default function CheckoutReturn({ status }: Props) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const plan = params.get("plan") || "paid";
  const success = status === "success";

  return (
    <main className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-8 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" data-testid="link-checkout-home">
            <Wordmark size={26} />
          </Link>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Stripe return
          </span>
        </div>

        <div className={`mt-8 inline-flex rounded-full p-3 ${success ? "bg-sev-low text-sev-low" : "bg-sev-medium text-sev-medium"}`}>
          {success ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {success ? "Payment received" : "Checkout cancelled"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {success
            ? `Stripe accepted the ${plan} checkout. Sign back in with the same email you used before payment to see your upgraded plan.`
            : "No payment was completed. You can return to billing and choose a plan whenever you are ready."}
        </p>

        {success && (
          <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            Your app uses memory-only sessions in this preview, so returning from Stripe signs the browser tab out.
            The webhook still upgrades the account in the database, which is why the Pro plan appears after you log in again.
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="flex-1" data-testid="link-checkout-login">
            <Button className="w-full">
              Sign in to dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/" className="flex-1" data-testid="link-checkout-landing">
            <Button variant="outline" className="w-full">Back to home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

