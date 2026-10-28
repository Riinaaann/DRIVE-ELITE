import { pgTable, serial, integer, timestamp, numeric, pgEnum, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { vehiclesTable } from "./vehicles";

export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "active", "completed", "cancelled"]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  pickupDate: text("pickup_date").notNull(),
  returnDate: text("return_date").notNull(),
  durationDays: integer("duration_days").notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
