import { pgTable, text, serial, timestamp, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";

export const voicesTable = pgTable("voices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  pitch: doublePrecision("pitch").notNull().default(1.0),
  rate: doublePrecision("rate").notNull().default(1.0),
  browserVoiceName: text("browser_voice_name"),
  isActive: boolean("is_active").notNull().default(true),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Voice = typeof voicesTable.$inferSelect;
export type InsertVoice = typeof voicesTable.$inferInsert;
