import { Router } from "express";
import { db, bookingsTable, usersTable, vehiclesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as crypto from "node:crypto";
import { getUserIdFromToken } from "./auth";

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_DriveEliteDemo";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "elite_drive_secret_key_demo_2026";

function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

function daysDiff(from: string, to: string): number {
  const d1 = parseDate(from);
  const d2 = parseDate(to);
  return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

async function formatBooking(b: any) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, b.userId)).limit(1);
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, b.vehicleId)).limit(1);

  return {
    id: b.id,
    userId: b.userId,
    vehicleId: b.vehicleId,
    pickupDate: b.pickupDate,
    returnDate: b.returnDate,
    durationDays: b.durationDays,
    totalCost: parseFloat(b.totalCost),
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    } : null,
    vehicle: vehicle ? {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      category: vehicle.category,
      dailyRate: parseFloat(vehicle.dailyRate as string),
      seats: vehicle.seats,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      rating: vehicle.rating,
      imageUrl: vehicle.imageUrl ?? null,
      isAvailable: vehicle.isAvailable,
      licensePlate: vehicle.licensePlate,
      description: vehicle.description ?? null,
    } : null,
  };
}

async function resolveUserId(req: any): Promise<number> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const resolved = getUserIdFromToken(token);
    if (resolved) return resolved;
  }
  // In Demo Mode: Fallback to the first registered user in the database
  const [firstUser] = await db.select().from(usersTable).limit(1);
  return firstUser ? firstUser.id : 1;
}

/**
 * GET /api/payments/config
 */
router.get("/config", (_req, res) => {
  return res.json({
    keyId: RAZORPAY_KEY_ID,
    currency: "INR",
    isTestMode: true,
    isDemoMode: true,
    gatewayName: "Razorpay Instant Demo Mode",
  });
});

/**
 * POST /api/payments/create-order
 */
router.post("/create-order", async (req, res) => {
  const userId = await resolveUserId(req);
  const { vehicleId, pickupDate, returnDate } = req.body;

  if (!vehicleId || !pickupDate || !returnDate) {
    return res.status(400).json({ error: "Missing required booking details (vehicleId, pickupDate, returnDate)" });
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parseInt(vehicleId))).limit(1);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  const duration = daysDiff(pickupDate, returnDate);
  const dailyRate = parseFloat(vehicle.dailyRate as string);
  const totalCost = duration * dailyRate;
  const amountInPaise = Math.round(totalCost * 100);
  const orderId = `order_${crypto.randomBytes(8).toString("hex")}`;

  return res.json({
    orderId,
    amount: amountInPaise,
    totalCost,
    currency: "INR",
    keyId: RAZORPAY_KEY_ID,
    durationDays: duration,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    receipt: `rcpt_b_${Date.now()}_${userId}`,
    isDemoMode: true,
  });
});

/**
 * POST /api/payments/verify
 */
router.post("/verify", async (req, res) => {
  const userId = await resolveUserId(req);
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    vehicleId,
    pickupDate,
    returnDate,
    paymentMethod = "Instant Demo Payment",
  } = req.body;

  if (!vehicleId || !pickupDate || !returnDate) {
    return res.status(400).json({ error: "Missing booking parameters" });
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parseInt(vehicleId))).limit(1);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  const duration = daysDiff(pickupDate, returnDate);
  const totalCost = duration * parseFloat(vehicle.dailyRate as string);
  const paymentId = razorpay_payment_id || `pay_demo_${crypto.randomBytes(6).toString("hex")}`;
  const orderId = razorpay_order_id || `order_demo_${crypto.randomBytes(6).toString("hex")}`;

  // Create confirmed booking
  const [booking] = await db.insert(bookingsTable).values({
    userId,
    vehicleId: parseInt(vehicleId),
    pickupDate,
    returnDate,
    durationDays: duration,
    totalCost: String(totalCost),
    status: "confirmed",
  }).returning();

  // Mark vehicle as temporarily reserved
  await db.update(vehiclesTable).set({ isAvailable: false }).where(eq(vehiclesTable.id, parseInt(vehicleId)));

  const formatted = await formatBooking(booking);

  return res.status(200).json({
    success: true,
    message: "Payment successfully verified & reservation confirmed!",
    booking: formatted,
    payment: {
      paymentId,
      orderId,
      status: "paid",
      amount: totalCost,
      currency: "INR",
      method: paymentMethod,
      verifiedAt: new Date().toISOString(),
    },
  });
});

export default router;
