import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { UpdateUserBody } from "@workspace/api-zod";

const router = Router();

function formatUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isVerified: u.isVerified,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const users = await db.select().from(usersTable);
  return res.json(users.map(formatUser));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(formatUser(user));
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [user] = await db.update(usersTable).set(parsed.data as any).where(eq(usersTable.id, id)).returning();
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(formatUser(user));
});

// Approve staff account
router.post("/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.id, id)).returning();
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({ 
    success: true, 
    message: `Staff member ${user.name} has been approved.`, 
    user: formatUser(user) 
  });
});

// Reject / remove staff account
router.post("/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  await db.delete(usersTable).where(eq(usersTable.id, id));
  return res.json({ 
    success: true, 
    message: `Staff account request for ${user.name} has been rejected and removed.` 
  });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(usersTable).where(eq(usersTable.id, id));
  return res.json({ success: true, message: "User deleted" });
});

export default router;
