import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// users
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  plan: text("plan").notNull().default("free"), // free, pro, team
  createdAt: integer("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({ email: true })
  .extend({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// sessions
export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type Session = typeof sessions.$inferSelect;

// scans
export const scans = sqliteTable("scans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  fileName: text("file_name").notNull(),
  detectedFormat: text("detected_format").notNull(), // yaml, json, toml, ini, env, dockerfile, k8s, terraform, unknown
  status: text("status").notNull(), // pass, warning, critical, failed
  findingCount: integer("finding_count").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  findingsJson: text("findings_json").notNull().default("[]"), // array of findings
  preview: text("preview").notNull().default(""), // first ~200 chars (redacted)
  createdAt: integer("created_at").notNull(),
});

export type Scan = typeof scans.$inferSelect;

export const newScanInputSchema = z.object({
  fileName: z.string().min(1).max(200).default("pasted.txt"),
  format: z.enum(["auto", "yaml", "json", "toml", "ini", "env", "dockerfile", "k8s", "terraform"]).default("auto"),
  content: z.string().min(1, "Content is required").max(200_000, "File is too large (max ~200KB)"),
});
export type NewScanInput = z.infer<typeof newScanInputSchema>;

// finding schema (stored as JSON in scans.findingsJson)
export const findingSchema = z.object({
  ruleId: z.string(),
  title: z.string(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  category: z.string(),
  path: z.string(),
  line: z.number().nullable().optional(),
  description: z.string(),
  recommendation: z.string(),
  excerpt: z.string().optional(),
});
export type Finding = z.infer<typeof findingSchema>;

// Plans config (shared client/server)
export const PLAN_LIMITS = {
  free: { scansPerMonth: 3, price: 0, label: "Free" },
  pro: { scansPerMonth: 100, price: 19, label: "Pro" },
  team: { scansPerMonth: 1000, price: 49, label: "Team" },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;
