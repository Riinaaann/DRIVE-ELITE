import { Router } from "express";
import { db, bookingsTable, usersTable, vehiclesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as crypto from "node:crypto";
import { tokenStore } from "./auth";

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

// In-memory payment records store (acts as payment audit trail)
interface PaymentRecord {
  paymentId: string;
  orderId: string;
  bookingId: number;
  userId: number;
  amount: number;
  currency: string;
  status: "paid" | "failed" | "refunded";
  method: string;
  signatureVerified: boolean;
  timestamp: string;
}

const paymentRecords = new Map<string, PaymentRecord>();

/**
 * GET /api/payments/config
 * Public configuration endpoint for payment gateway
 */
router.get("/config", (_req, res) => {
  return res.json({
    keyId: RAZORPAY_KEY_ID,
    currency: "INR",
    isTestMode: RAZORPAY_KEY_ID.includes("test") || RAZORPAY_KEY_ID === "rzp_test_DriveEliteDemo",
    gatewayName: "Razorpay",
  });
});

/**
 * POST /api/payments/create-order
 * Creates a verified Razorpay order server-side with tamper-proof amount calculation
 */
router.post("/create-order", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated. Please log in." });
  }
  const token = authHeader.slice(7);
  const userId = tokenStore.get(token);
  if (!userId) return res.status(401).json({ error: "Invalid or expired session" });

  const { vehicleId, pickupDate, returnDate } = req.body;
  if (!vehicleId || !pickupDate || !returnDate) {
    return res.status(400).json({ error: "Missing required booking details (vehicleId, pickupDate, returnDate)" });
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parseInt(vehicleId))).limit(1);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  if (!vehicle.isAvailable) return res.status(400).json({ error: "This vehicle is no longer available." });

  const duration = daysDiff(pickupDate, returnDate);
  const dailyRate = parseFloat(vehicle.dailyRate as string);
  const totalCost = duration * dailyRate;
  const amountInPaise = Math.round(totalCost * 100);

  let orderId = `order_${crypto.randomBytes(8).toString("hex")}`;

  // If live or valid Razorpay keys are configured, call the Razorpay Orders API
  const isCustomKey = RAZORPAY_KEY_ID !== "rzp_test_DriveEliteDemo" && process.env.RAZORPAY_KEY_SECRET;
  if (isCustomKey) {
    try {
      const basicAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_b_${Date.now()}_${userId}`,
          notes: {
            vehicleId: String(vehicleId),
            userId: String(userId),
            vehicleName: `${vehicle.make} ${vehicle.model}`,
          },
        }),
      });

      if (rzpResponse.ok) {
        const rzpData: any = await rzpResponse.json();
        orderId = rzpData.id;
      }
    } catch (err) {
      console.warn("Razorpay API call failed, falling back to secure test order:", err);
    }
  }

  return res.json({
    orderId,
    amount: amountInPaise,
    totalCost,
    currency: "INR",
    keyId: RAZORPAY_KEY_ID,
    durationDays: duration,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    receipt: `rcpt_b_${Date.now()}_${userId}`,
    isTestMode: !isCustomKey,
  });
});

/**
 * POST /api/payments/verify
 * Cryptographically verifies Razorpay HMAC SHA-256 signature and creates confirmed booking
 */
router.post("/verify", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = authHeader.slice(7);
  const userId = tokenStore.get(token);
  if (!userId) return res.status(401).json({ error: "Invalid token" });

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    vehicleId,
    pickupDate,
    returnDate,
    paymentMethod = "razorpay",
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required payment verification parameters" });
  }

  // Cryptographic HMAC SHA-256 Signature Verification
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // In production or demo mode, verify that the signature matches
  const isSignatureValid = (expectedSignature === razorpay_signature);
  if (!isSignatureValid) {
    return res.status(400).json({
      error: "Payment verification failed: Invalid cryptographic signature.",
      verified: false,
    });
  }

  // Check vehicle availability
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parseInt(vehicleId))).limit(1);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  if (!vehicle.isAvailable) return res.status(400).json({ error: "Vehicle was reserved by another customer." });

  const duration = daysDiff(pickupDate, returnDate);
  const totalCost = duration * parseFloat(vehicle.dailyRate as string);

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

  // Mark vehicle as unavailable
  await db.update(vehiclesTable).set({ isAvailable: false }).where(eq(vehiclesTable.id, parseInt(vehicleId)));

  // Record audit transaction
  const record: PaymentRecord = {
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    bookingId: booking.id,
    userId,
    amount: totalCost,
    currency: "INR",
    status: "paid",
    method: paymentMethod,
    signatureVerified: true,
    timestamp: new Date().toISOString(),
  };
  paymentRecords.set(razorpay_payment_id, record);

  const formatted = await formatBooking(booking);

  return res.status(200).json({
    success: true,
    message: "Payment successfully verified and reservation confirmed.",
    booking: formatted,
    payment: {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "paid",
      amount: totalCost,
      currency: "INR",
      method: "Razorpay Secure Gateway",
      verifiedAt: record.timestamp,
    },
  });
});

/**
 * GET /api/payments/receipt/:paymentId
 * Retrieve verified payment receipt
 */
router.get("/receipt/:paymentId", (req, res) => {
  const record = paymentRecords.get(req.params.paymentId);
  if (!record) {
    return res.status(404).json({ error: "Receipt not found" });
  }
  return res.json(record);
});

export default router;
