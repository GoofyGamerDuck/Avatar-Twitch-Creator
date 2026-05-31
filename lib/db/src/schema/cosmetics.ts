import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const cosmeticRequestsTable = pgTable("cosmetic_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  imageUrl: text("image_url").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export type CosmeticRequest = typeof cosmeticRequestsTable.$inferSelect;
export type InsertCosmeticRequest = typeof cosmeticRequestsTable.$inferInsert;
