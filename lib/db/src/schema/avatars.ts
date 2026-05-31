import { pgTable, text, serial, timestamp, integer, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export interface PartPosition { x: number; y: number; scale?: number; }
export type PartPositionsMap = Partial<Record<'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessory', PartPosition>>;
export interface AccessoryItem { name: string; color: string; }

export const avatarSettingsTable = pgTable("avatar_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  skinTone: text("skin_tone").notNull().default("medium"),
  hairStyle: text("hair_style").notNull().default("short"),
  hairColor: text("hair_color").notNull().default("brown"),
  eyeStyle: text("eye_style").notNull().default("default"),
  eyeColor: text("eye_color").notNull().default("#1e1b4b"),
  eyeWidth: doublePrecision("eye_width").notNull().default(1.0),
  mouthStyle: text("mouth_style").notNull().default("smile"),
  outfitStyle: text("outfit_style").notNull().default("casual"),
  outfitColor: text("outfit_color").notNull().default("#2563eb"),
  accessory: text("accessory"),
  accessoryColor: text("accessory_color").notNull().default("#3b82f6"),
  accessories: jsonb("accessories").$type<AccessoryItem[]>().default([]),
  layerOrder: jsonb("layer_order").$type<string[]>().default([]),
  voiceId: text("voice_id").notNull().default("alloy"),
  partPositions: jsonb("part_positions").$type<PartPositionsMap>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAvatarSettingsSchema = createInsertSchema(avatarSettingsTable).omit({ id: true, updatedAt: true });
export type InsertAvatarSettings = z.infer<typeof insertAvatarSettingsSchema>;
export type AvatarSettings = typeof avatarSettingsTable.$inferSelect;
