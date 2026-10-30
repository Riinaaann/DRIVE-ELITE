import { pgTable, serial, integer, timestamp, numeric, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";

export const cancellationsTable = pgTable("cancellations", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: text("reason").default("Cancelled by customer"),
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }).default("0.00"),
  refundStatus: text("refund_status").default("pending"),
  cancelledAt: timestamp("cancelled_at").notNull().defaultNow(),
});

export const insertCancellationSchema = createInsertSchema(cancellationsTable).omit({ id: true, cancelledAt: true });
export type InsertCancellation = z.infer<typeof insertCancellationSchema>;
export type Cancellation = typeof cancellationsTable.$inferSelect;
