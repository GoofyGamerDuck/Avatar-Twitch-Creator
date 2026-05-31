import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const avatarPartsTable = pgTable("avatar_parts", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  allowColorOverride: boolean("allow_color_override").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AvatarPart = typeof avatarPartsTable.$inferSelect;
export type InsertAvatarPart = typeof avatarPartsTable.$inferInsert;
