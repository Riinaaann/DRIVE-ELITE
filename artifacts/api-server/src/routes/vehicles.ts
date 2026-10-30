import { Router } from "express";
import { db, vehiclesTable, reviewsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateVehicleBody, UpdateVehicleBody, ListVehiclesQueryParams } from "@workspace/api-zod";
import { tokenStore } from "./auth";

const router = Router();

function formatVehicle(v: any) {
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    category: v.category,
    dailyRate: parseFloat(v.dailyRate),
    seats: v.seats,
    transmission: v.transmission,
    fuelType: v.fuelType,
    rating: v.rating,
    imageUrl: v.imageUrl ?? null,
    isAvailable: v.isAvailable,
    licensePlate: v.licensePlate,
    description: v.description ?? null,
    mileage: v.mileage ?? null,
  };
}

router.get("/", async (req, res) => {
  const parsed = ListVehiclesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions: any[] = [];
  if (params.category) {
    conditions.push(eq(vehiclesTable.category, params.category as any));
  }
  if (params.available !== undefined) {
    conditions.push(eq(vehiclesTable.isAvailable, params.available));
  }

  let vehicles;
  try {
    if (conditions.length > 0) {
      vehicles = await db.select().from(vehiclesTable).where(and(...conditions));
    } else {
      vehicles = await db.select().from(vehiclesTable);
    }
  } catch (err: any) {
    req.log.error({ err, cause: err?.cause }, "Failed to fetch vehicles from DB");
    return res.status(500).json({ error: "Failed to fetch vehicles", details: err?.message, cause: err?.cause?.message || String(err?.cause) });
  }

  if (params.search) {
    const search = params.search.toLowerCase();
    vehicles = vehicles.filter(v =>
      v.make.toLowerCase().includes(search) ||
      v.model.toLowerCase().includes(search) ||
      v.category.toLowerCase().includes(search)
    );
  }

  return res.json(vehicles.map(formatVehicle));
});

router.post("/", async (req, res) => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }
  const data = parsed.data;

  try {
    const existing = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.licensePlate, data.licensePlate.trim().toUpperCase()))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: `Vehicle with license plate "${data.licensePlate}" already exists.` });
    }

    const [vehicle] = await db.insert(vehiclesTable).values({
      ...data,
      licensePlate: data.licensePlate.trim().toUpperCase(),
      dailyRate: String(data.dailyRate),
      isAvailable: data.isAvailable ?? true,
      rating: 4.5,
      mileage: req.body.mileage ? String(req.body.mileage).trim() : null,
    } as any).returning();

    return res.status(201).json(formatVehicle(vehicle));
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(400).json({ error: `Vehicle with license plate "${data.licensePlate}" already exists.` });
    }
    return res.status(500).json({ error: "Failed to create vehicle" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  return res.json(formatVehicle(vehicle));
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });

  const data = parsed.data;
  const updateData: any = { ...data };
  if (data.dailyRate !== undefined) {
    updateData.dailyRate = String(data.dailyRate);
  }
  if (data.licensePlate !== undefined) {
    updateData.licensePlate = data.licensePlate.trim().toUpperCase();
  }
  if (req.body.mileage !== undefined) {
    updateData.mileage = req.body.mileage ? String(req.body.mileage).trim() : null;
  }

  try {
    const [vehicle] = await db.update(vehiclesTable).set(updateData).where(eq(vehiclesTable.id, id)).returning();
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    return res.json(formatVehicle(vehicle));
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(400).json({ error: `Vehicle with license plate "${data.licensePlate}" already exists.` });
    }
    return res.status(500).json({ error: "Failed to update vehicle" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(vehiclesTable).where(eq(vehiclesTable.id, id));
  return res.json({ success: true, message: "Vehicle deleted" });
});

// Reviews endpoints
router.get("/:id/reviews", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.vehicleId, id))
      .orderBy(desc(reviewsTable.createdAt));

    const count = reviews.length;
    const avgRating = count > 0 
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / count).toFixed(1))
      : 5.0;

    return res.json({
      reviews: reviews.map(r => ({
        id: r.id,
        vehicleId: r.vehicleId,
        userId: r.userId,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      averageRating: avgRating,
      totalReviews: count,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post("/:id/reviews", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { rating, comment, userName } = req.body;
  const parsedRating = parseInt(rating);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5 stars" });
  }
  if (!comment || typeof comment !== "string" || !comment.trim()) {
    return res.status(400).json({ error: "Please write a review comment" });
  }

  try {
    // Check auth if provided
    let userId: number | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      userId = tokenStore.get(token) || null;
    }

    const reviewerName = (userName && String(userName).trim()) || (userId ? `Customer #${userId}` : "Verified Renter");

    const [review] = await db.insert(reviewsTable).values({
      vehicleId: id,
      userId: userId ?? undefined,
      userName: reviewerName,
      rating: parsedRating,
      comment: comment.trim(),
    }).returning();

    // Recalculate average rating
    const allVehicleReviews = await db
      .select({ rating: reviewsTable.rating })
      .from(reviewsTable)
      .where(eq(reviewsTable.vehicleId, id));

    const total = allVehicleReviews.length;
    const newAvg = total > 0
      ? Number((allVehicleReviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1))
      : 4.5;

    await db.update(vehiclesTable).set({ rating: newAvg }).where(eq(vehiclesTable.id, id));

    return res.status(201).json({
      review: {
        id: review.id,
        vehicleId: review.vehicleId,
        userId: review.userId,
        userName: review.userName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      },
      updatedRating: newAvg,
    });
  } catch (err: any) {
    console.error("Error creating review:", err);
    return res.status(500).json({ error: "Failed to submit review" });
  }
});

export default router;
