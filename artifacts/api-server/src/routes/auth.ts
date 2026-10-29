import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "elite_drive_salt").digest("hex");
}

const tokenStore = new Map<string, number>();

export function generateToken(userId: number): string {
  const payload = `${userId}:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`;
  const sig = crypto.createHmac("sha256", "elite_drive_auth_salt").update(payload).digest("hex");
  const token = `${Buffer.from(payload).toString("base64url")}.${sig}`;
  tokenStore.set(token, userId);
  return token;
}

export function getUserIdFromToken(token: string): number | null {
  if (tokenStore.has(token)) {
    return tokenStore.get(token)!;
  }
  try {
    const [payloadB64, sig] = token.split(".");
    if (payloadB64 && sig) {
      const payload = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const expectedSig = crypto.createHmac("sha256", "elite_drive_auth_salt").update(payload).digest("hex");
      if (expectedSig === sig) {
        const [userIdStr] = payload.split(":");
        const uid = parseInt(userIdStr, 10);
        if (!isNaN(uid)) {
          tokenStore.set(token, uid);
          return uid;
        }
      }
    }
  } catch {}
  return null;
}

export { tokenStore };

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { name, email, password, role } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "Email already in use" });
  }

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    password: hashPassword(password),
    role: (role as any) ?? "customer",
    isVerified: false,
  }).returning();

  const token = generateToken(user.id);

  return res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user.id);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    tokenStore.delete(token);
  }
  return res.json({ success: true, message: "Logged out" });
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = authHeader.slice(7);
  let userId = getUserIdFromToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
