import { Router } from "express";
import { db, bookingsTable, usersTable, vehiclesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateBookingBody, UpdateBookingBody, ListBookingsQueryParams } from "@workspace/api-zod";
import { tokenStore } from "./auth";

const router = Router();

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

router.get("/", async (req, res) => {
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions: any[] = [];
  if (params.userId) conditions.push(eq(bookingsTable.userId, params.userId));
  if (params.status) conditions.push(eq(bookingsTable.status, params.status as any));

  let bookings;
  if (conditions.length > 0) {
    bookings = await db.select().from(bookingsTable).where(and(...conditions));
  } else {
    bookings = await db.select().from(bookingsTable);
  }

  const formatted = await Promise.all(bookings.map(formatBooking));
  return res.json(formatted);
});

router.post("/", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = authHeader.slice(7);
  const userId = tokenStore.get(token);
  if (!userId) return res.status(401).json({ error: "Invalid token" });

  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { vehicleId, pickupDate, returnDate } = parsed.data;

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, vehicleId)).limit(1);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  if (!vehicle.isAvailable) return res.status(400).json({ error: "Vehicle is not available" });

  const duration = daysDiff(pickupDate, returnDate);
  const totalCost = duration * parseFloat(vehicle.dailyRate as string);

  const [booking] = await db.insert(bookingsTable).values({
    userId,
    vehicleId,
    pickupDate,
    returnDate,
    durationDays: duration,
    totalCost: String(totalCost),
    status: "confirmed",
  }).returning();

  // Mark vehicle as unavailable
  await db.update(vehiclesTable).set({ isAvailable: false }).where(eq(vehiclesTable.id, vehicleId));

  return res.status(201).json(await formatBooking(booking));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  return res.json(await formatBooking(booking));
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [booking] = await db.update(bookingsTable).set(parsed.data as any).where(eq(bookingsTable.id, id)).returning();
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  return res.json(await formatBooking(booking));
});

router.post("/:id/cancel", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const [updated] = await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, id)).returning();

  // Re-enable vehicle
  await db.update(vehiclesTable).set({ isAvailable: true }).where(eq(vehiclesTable.id, booking.vehicleId));

  return res.json(await formatBooking(updated));
});

export default router;
