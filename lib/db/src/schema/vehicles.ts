import { pgTable, text, serial, boolean, timestamp, pgEnum, integer, numeric, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoryEnum = pgEnum("category", ["Luxury", "Premium", "Normal"]);
export const transmissionEnum = pgEnum("transmission", ["Automatic", "Manual"]);

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  category: categoryEnum("category").notNull(),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  seats: integer("seats").notNull(),
  transmission: transmissionEnum("transmission").notNull(),
  fuelType: text("fuel_type").notNull(),
  rating: real("rating").notNull().default(4.5),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  licensePlate: text("license_plate").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;
