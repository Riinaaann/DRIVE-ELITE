import { Router } from "express";
import { db, usersTable, vehiclesTable, bookingsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  const vehicles = await db.select().from(vehiclesTable);
  const bookings = await db.select().from(bookingsTable);
  const users = await db.select().from(usersTable);

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.isAvailable).length;
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === "active" || b.status === "confirmed").length;
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const totalRevenue = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + parseFloat(b.totalCost as string), 0);
  const totalUsers = users.length;
  const totalCustomers = users.filter(u => u.role === "customer").length;

  return res.json({
    totalVehicles,
    availableVehicles,
    totalBookings,
    activeBookings,
    pendingBookings,
    totalRevenue,
    totalUsers,
    totalCustomers,
  });
});

router.get("/recent-bookings", async (req, res) => {
  const bookings = await db.select().from(bookingsTable);

  // Sort by createdAt descending, take top 10
  const sorted = bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10);

  const { usersTable: ut, vehiclesTable: vt } = await import("@workspace/db");

  const formatted = await Promise.all(sorted.map(async (b) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, b.userId)).limit(1);
    const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, b.vehicleId)).limit(1);

    return {
      id: b.id,
      userId: b.userId,
      vehicleId: b.vehicleId,
      pickupDate: b.pickupDate,
      returnDate: b.returnDate,
      durationDays: b.durationDays,
      totalCost: parseFloat(b.totalCost as string),
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
  }));

  return res.json(formatted);
});

router.get("/fleet-status", async (req, res) => {
  const vehicles = await db.select().from(vehiclesTable);

  const categories = ["Sedan", "SUV", "Luxury", "Sports", "Electric", "Van"] as const;
  const fleetStatus = categories.map(category => {
    const categoryVehicles = vehicles.filter(v => v.category === category);
    const available = categoryVehicles.filter(v => v.isAvailable).length;
    return {
      category,
      total: categoryVehicles.length,
      available,
      rented: categoryVehicles.length - available,
    };
  }).filter(item => item.total > 0);

  return res.json(fleetStatus);
});

export default router;
