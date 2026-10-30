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

  // 1. Prohibit admin registration via public sign up
  if (role === "admin") {
    return res.status(403).json({ 
      error: "Administrator accounts cannot be created via public registration. Please log in using established administrator credentials." 
    });
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "Email or phone already in use" });
  }

  // 2. Customers are verified immediately. Staff members require administrative approval.
  const isStaff = role === "staff";
  const isVerified = !isStaff;

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    password: hashPassword(password),
    role: (role as any) ?? "customer",
    isVerified,
  }).returning();

  // If staff, do NOT issue a login token. Require admin approval.
  if (isStaff) {
    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: false,
        createdAt: user.createdAt.toISOString(),
      },
      token: null,
      message: "Staff registration submitted. Your account is pending administrative approval before you can log in.",
      requiresApproval: true,
    });
  }

  // Customers receive an active session token right away
  const token = generateToken(user.id);

  return res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: true,
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
    return res.status(401).json({ error: "Invalid email/phone or password" });
  }

  // Staff members must be approved by an administrator before logging in
  if (user.role === "staff" && !user.isVerified) {
    return res.status(403).json({
      error: "Your staff account is currently pending administrative approval. An administrator must approve your account before you can log in."
    });
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

router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || typeof email !== "string" || !newPassword || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Email or phone and new password are required." });
  }

  const cleanIdentifier = email.trim().toLowerCase();
  if (cleanIdentifier.length < 3) {
    return res.status(400).json({ error: "Please provide a valid email address or phone number." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  const users = await db.select().from(usersTable);
  const user = users.find((u) => u.email.trim().toLowerCase() === cleanIdentifier);

  if (!user) {
    return res.status(404).json({ error: "No account found with this email or phone number." });
  }

  await db.update(usersTable)
    .set({ password: hashPassword(newPassword) })
    .where(eq(usersTable.id, user.id));

  return res.json({ 
    success: true, 
    message: "Password has been successfully reset. You can now log in with your new password." 
  });
});

router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    tokenStore.delete(token);
  }
  return res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = authHeader.slice(7);
  const userId = getUserIdFromToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid token" });
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
