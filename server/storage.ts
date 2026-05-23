import { users, sessions, scans } from "@shared/schema";
import type { User, Scan, Finding, PlanId } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import crypto from "node:crypto";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Ensure tables exist (simple migration so we don't need drizzle-kit at runtime)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    detected_format TEXT NOT NULL,
    status TEXT NOT NULL,
    finding_count INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    medium_count INTEGER NOT NULL DEFAULT 0,
    low_count INTEGER NOT NULL DEFAULT 0,
    findings_json TEXT NOT NULL DEFAULT '[]',
    preview TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id);
`);

export const db = drizzle(sqlite);

// --- password hashing (PBKDF2 — no extra deps) ---
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `pbkdf2$100000$${salt}$${hash}`;
}
function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [, iterStr, salt, hash] = parts;
  const iter = parseInt(iterStr, 10);
  const candidate = crypto.pbkdf2Sync(password, salt, iter, 32, "sha256").toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

function newToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function monthStartMs(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export interface IStorage {
  // auth
  createUser(email: string, password: string): User;
  authenticateUser(email: string, password: string): User | null;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  createSession(userId: number): string;
  getUserByToken(token: string): User | undefined;
  destroySession(token: string): void;
  setUserPlan(userId: number, plan: PlanId): User;

  // scans
  createScan(input: {
    userId: number;
    fileName: string;
    detectedFormat: string;
    status: string;
    findings: Finding[];
    preview: string;
  }): Scan;
  listScans(userId: number, limit?: number): Scan[];
  getScan(userId: number, scanId: number): Scan | undefined;
  deleteScan(userId: number, scanId: number): void;
  countScansThisMonth(userId: number): number;
}

export class DatabaseStorage implements IStorage {
  createUser(email: string, password: string): User {
    return db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        plan: "free",
        createdAt: Date.now(),
      })
      .returning()
      .get();
  }

  authenticateUser(email: string, password: string): User | null {
    const u = this.getUserByEmail(email);
    if (!u) return null;
    return verifyPassword(password, u.passwordHash) ? u : null;
  }

  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
  }
  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  createSession(userId: number): string {
    const token = newToken();
    db.insert(sessions).values({ token, userId, createdAt: Date.now() }).run();
    return token;
  }
  getUserByToken(token: string): User | undefined {
    const sess = db.select().from(sessions).where(eq(sessions.token, token)).get();
    if (!sess) return undefined;
    return this.getUserById(sess.userId);
  }
  destroySession(token: string): void {
    db.delete(sessions).where(eq(sessions.token, token)).run();
  }

  setUserPlan(userId: number, plan: PlanId): User {
    return db.update(users).set({ plan }).where(eq(users.id, userId)).returning().get();
  }

  createScan(input: {
    userId: number;
    fileName: string;
    detectedFormat: string;
    status: string;
    findings: Finding[];
    preview: string;
  }): Scan {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of input.findings) counts[f.severity]++;
    return db
      .insert(scans)
      .values({
        userId: input.userId,
        fileName: input.fileName,
        detectedFormat: input.detectedFormat,
        status: input.status,
        findingCount: input.findings.length,
        criticalCount: counts.critical,
        highCount: counts.high,
        mediumCount: counts.medium,
        lowCount: counts.low,
        findingsJson: JSON.stringify(input.findings),
        preview: input.preview,
        createdAt: Date.now(),
      })
      .returning()
      .get();
  }

  listScans(userId: number, limit = 50): Scan[] {
    return db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId))
      .orderBy(desc(scans.createdAt))
      .limit(limit)
      .all();
  }

  getScan(userId: number, scanId: number): Scan | undefined {
    return db
      .select()
      .from(scans)
      .where(and(eq(scans.userId, userId), eq(scans.id, scanId)))
      .get();
  }

  deleteScan(userId: number, scanId: number): void {
    db.delete(scans).where(and(eq(scans.userId, userId), eq(scans.id, scanId))).run();
  }

  countScansThisMonth(userId: number): number {
    const since = monthStartMs();
    const row = db
      .select({ c: sql<number>`count(*)` })
      .from(scans)
      .where(and(eq(scans.userId, userId), gte(scans.createdAt, since)))
      .get();
    return Number(row?.c ?? 0);
  }
}

export const storage = new DatabaseStorage();
