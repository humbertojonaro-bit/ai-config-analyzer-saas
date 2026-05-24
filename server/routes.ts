import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import { z } from "zod";
import Stripe from "stripe";
import { storage } from "./storage";
import { analyze, detectFormat, summarize } from "./analyzer";
import { PLAN_LIMITS, newScanInputSchema, type PlanId, type Finding } from "@shared/schema";

const AUTH_HEADER = "x-session-token";
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function publicUser(u: { id: number; email: string; plan: string; createdAt: number }) {
  return { id: u.id, email: u.email, plan: u.plan as PlanId, createdAt: u.createdAt };
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.header(AUTH_HEADER);
  if (!token) return res.status(401).json({ error: "unauthorized", message: "Missing session token." });
  const user = storage.getUserByToken(token);
  if (!user) return res.status(401).json({ error: "unauthorized", message: "Invalid session." });
  (req as any).user = user;
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ---------- auth ----------
  const credsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters."),
  });

  app.post("/api/auth/signup", (req, res) => {
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", message: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;
    if (storage.getUserByEmail(email)) {
      return res.status(409).json({ error: "email_taken", message: "An account with that email already exists." });
    }
    const user = storage.createUser(email, password);
    const token = storage.createSession(user.id);
    res.json({ token, user: publicUser(user) });
  });

  app.post("/api/auth/login", (req, res) => {
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", message: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;
    const user = storage.authenticateUser(email, password);
    if (!user) return res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password." });
    const token = storage.createSession(user.id);
    res.json({ token, user: publicUser(user) });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = req.header(AUTH_HEADER);
    if (token) storage.destroySession(token);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: publicUser((req as any).user) });
  });

  // ---------- usage / plan ----------
  app.get("/api/usage", requireAuth, (req, res) => {
    const user = (req as any).user;
    const plan = user.plan as PlanId;
    const limit = PLAN_LIMITS[plan].scansPerMonth;
    const used = storage.countScansThisMonth(user.id);
    res.json({
      plan,
      planLabel: PLAN_LIMITS[plan].label,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    });
  });

  // ---------- scans ----------
  app.post("/api/scans", requireAuth, (req, res) => {
    const user = (req as any).user;
    const parsed = newScanInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", message: parsed.error.issues[0].message });
    }
    const limit = PLAN_LIMITS[user.plan as PlanId].scansPerMonth;
    const used = storage.countScansThisMonth(user.id);
    if (used >= limit) {
      return res.status(402).json({
        error: "quota_exceeded",
        message: "You have reached your monthly scan limit.",
        plan: user.plan,
        limit,
        used,
        upgradeUrl: "/#/billing",
      });
    }

    const { fileName, content, format } = parsed.data;
    const detected = format === "auto" ? detectFormat(fileName, content) : format;
    let findings: Finding[] = [];
    try {
      findings = analyze(content, detected as any);
    } catch (e: any) {
      return res.status(400).json({ error: "analyze_failed", message: e?.message ?? "Failed to analyze content." });
    }
    const { status } = summarize(findings);
    const preview = content.split(/\r?\n/).slice(0, 6).join("\n").slice(0, 400);

    const scan = storage.createScan({
      userId: user.id,
      fileName,
      detectedFormat: detected,
      status,
      findings,
      preview,
    });

    res.json({ scan: { ...scan, findings } });
  });

  app.get("/api/scans", requireAuth, (req, res) => {
    const user = (req as any).user;
    const rows = storage.listScans(user.id, 50);
    res.json({
      scans: rows.map((s) => ({
        id: s.id,
        fileName: s.fileName,
        detectedFormat: s.detectedFormat,
        status: s.status,
        findingCount: s.findingCount,
        criticalCount: s.criticalCount,
        highCount: s.highCount,
        mediumCount: s.mediumCount,
        lowCount: s.lowCount,
        createdAt: s.createdAt,
      })),
    });
  });

  app.get("/api/scans/:id", requireAuth, (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "bad_id" });
    const scan = storage.getScan(user.id, id);
    if (!scan) return res.status(404).json({ error: "not_found" });
    res.json({ scan: { ...scan, findings: JSON.parse(scan.findingsJson) as Finding[] } });
  });

  app.delete("/api/scans/:id", requireAuth, (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "bad_id" });
    storage.deleteScan(user.id, id);
    res.json({ ok: true });
  });

  // Markdown report (paid plans only)
  app.get("/api/scans/:id/report.md", requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.plan === "free") {
      return res.status(402).json({ error: "upgrade_required", message: "Report export is a paid feature." });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "bad_id" });
    const scan = storage.getScan(user.id, id);
    if (!scan) return res.status(404).json({ error: "not_found" });
    const findings = JSON.parse(scan.findingsJson) as Finding[];
    const md = renderMarkdownReport(scan, findings);
    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="scan-${scan.id}.md"`);
    res.send(md);
  });

  // ---------- billing (provider-ready, simulated in preview) ----------
  const planSchema = z.object({ plan: z.enum(["free", "pro", "team"]) });
  const checkoutSchema = z.object({
    plan: z.enum(["pro", "team"]),
    paymentMethod: z.enum(["card", "paypal", "invoice"]).default("card"),
  });

  app.get("/api/billing/providers", requireAuth, (_req, res) => {
    res.json({
      providers: [
        {
          id: "card",
          label: "Card + wallets",
          processor: "Stripe Checkout",
          methods: ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"],
          status: process.env.STRIPE_SECRET_KEY ? "ready" : "missing_keys",
          env: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRO_PRICE_ID", "STRIPE_TEAM_PRICE_ID"],
        },
        {
          id: "paypal",
          label: "PayPal",
          processor: "PayPal Checkout",
          methods: ["PayPal balance", "PayPal cards"],
          status: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? "ready" : "missing_keys",
          env: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"],
        },
        {
          id: "invoice",
          label: "Invoice / bank transfer",
          processor: "Manual approval",
          methods: ["ACH", "wire transfer", "mailed invoice"],
          status: "manual",
          env: ["BILLING_CONTACT_EMAIL"],
        },
      ],
    });
  });

  app.post("/api/billing/checkout", requireAuth, (req, res) => {
    // Creates a real Stripe Checkout Session when Stripe is configured.
    // PayPal and invoice remain simulated until their provider credentials/workflows are connected.
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_checkout", message: parsed.error.issues[0].message });
    const { plan, paymentMethod } = parsed.data;

    if (paymentMethod === "card" && stripe) {
      const priceId = plan === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_TEAM_PRICE_ID;
      if (!priceId) {
        return res.status(500).json({
          error: "stripe_price_missing",
          message: `Missing Stripe price ID for ${plan}. Add ${plan === "pro" ? "STRIPE_PRO_PRICE_ID" : "STRIPE_TEAM_PRICE_ID"} in Render.`,
        });
      }

      const origin =
        process.env.APP_URL ||
        `${req.protocol}://${req.get("x-forwarded-host") || req.get("host")}`;

      stripe.checkout.sessions
        .create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/#/login`,
          cancel_url: `${origin}/#/billing`,
          client_reference_id: String((req as any).user.id),
          customer_email: (req as any).user.email,
          metadata: {
            userId: String((req as any).user.id),
            plan,
          },
          subscription_data: {
            metadata: {
              userId: String((req as any).user.id),
              plan,
            },
          },
        })
        .then((session) => {
          if (!session.url) {
            return res.status(500).json({ error: "stripe_session_missing_url", message: "Stripe did not return a checkout URL." });
          }
          return res.json({
            simulated: false,
            plan,
            paymentMethod,
            processor: "Stripe Checkout",
            checkoutUrl: session.url,
          });
        })
        .catch((error: any) => {
          console.error("Stripe checkout error:", error);
          return res.status(500).json({
            error: "stripe_checkout_failed",
            message: error?.message || "Failed to create Stripe Checkout session.",
          });
        });
      return;
    }

    const processor =
      paymentMethod === "paypal" ? "PayPal Checkout" : paymentMethod === "invoice" ? "Manual invoice" : "Stripe Checkout";
    const checkoutUrl =
      paymentMethod === "paypal"
        ? `/#/billing/paypal-success?plan=${plan}`
        : paymentMethod === "invoice"
          ? `/#/billing/invoice-requested?plan=${plan}`
          : `/#/billing/success?plan=${plan}`;
    return res.json({
      simulated: true,
      plan,
      paymentMethod,
      processor,
      checkoutUrl,
      message:
        paymentMethod === "invoice"
          ? "Invoice and bank transfer approvals are manual in this preview. Continue to simulate approval."
          : `${processor} is not configured with live credentials in this preview. Continue to simulate a successful checkout.`,
    });
  });

  app.post("/api/billing/simulate-upgrade", requireAuth, (req, res) => {
    const user = (req as any).user;
    const parsed = z.object({
      plan: z.enum(["free", "pro", "team"]),
      paymentMethod: z.enum(["card", "paypal", "invoice"]).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_plan", message: parsed.error.issues[0].message });
    const updated = storage.setUserPlan(user.id, parsed.data.plan);
    res.json({
      user: publicUser(updated),
      paymentMethod: parsed.data.paymentMethod ?? "none",
      simulated: true,
    });
  });

  app.post("/api/billing/portal", requireAuth, (_req, res) => {
    res.status(501).json({
      error: "not_configured",
      message: "Billing portals are not configured in this preview. Stripe Customer Portal and PayPal subscription management can be connected with live credentials.",
    });
  });

  app.post("/api/webhooks/stripe", (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.json({ received: true, note: "Stripe webhook received, but STRIPE_WEBHOOK_SECRET is not configured." });
    }

    let event: Stripe.Event;
    try {
      const signature = req.header("stripe-signature");
      if (!signature) return res.status(400).json({ error: "missing_stripe_signature" });
      event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error: any) {
      console.error("Stripe webhook verification failed:", error);
      return res.status(400).json({ error: "invalid_stripe_signature", message: error?.message });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = Number(session.metadata?.userId || session.client_reference_id);
      const plan = session.metadata?.plan as PlanId | undefined;
      if (userId && (plan === "pro" || plan === "team")) {
        storage.setUserPlan(userId, plan);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = Number(subscription.metadata?.userId);
      if (userId) {
        storage.setUserPlan(userId, "free");
      }
    }

    res.json({ received: true });
  });

  app.post("/api/webhooks/paypal", (_req, res) => {
    res.json({ received: true, note: "PayPal webhook handler placeholder. Verify PAYPAL_WEBHOOK_ID, then update user.plan from subscription events." });
  });

  return httpServer;
}

function renderMarkdownReport(scan: any, findings: Finding[]): string {
  const ts = new Date(scan.createdAt).toISOString();
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;

  const lines: string[] = [];
  lines.push(`# AI Config Analyzer report`);
  lines.push("");
  lines.push(`- **File:** \`${scan.fileName}\``);
  lines.push(`- **Format:** ${scan.detectedFormat}`);
  lines.push(`- **Scanned at:** ${ts}`);
  lines.push(`- **Overall status:** ${scan.status.toUpperCase()}`);
  lines.push(`- **Findings:** ${findings.length} (critical ${counts.critical} · high ${counts.high} · medium ${counts.medium} · low ${counts.low} · info ${counts.info})`);
  lines.push("");
  if (sorted.length === 0) {
    lines.push("No issues detected. ✨");
    return lines.join("\n");
  }
  for (const f of sorted) {
    lines.push(`## [${f.severity.toUpperCase()}] ${f.title}`);
    lines.push("");
    lines.push(`- **Rule:** \`${f.ruleId}\``);
    lines.push(`- **Category:** ${f.category}`);
    lines.push(`- **Location:** \`${f.path}\`${f.line ? ` (line ${f.line})` : ""}`);
    if (f.excerpt) {
      lines.push("");
      lines.push("```");
      lines.push(f.excerpt);
      lines.push("```");
    }
    lines.push("");
    lines.push(f.description);
    lines.push("");
    lines.push(`**Fix:** ${f.recommendation}`);
    lines.push("");
  }
  return lines.join("\n");
}
