import { db, avatarPartsTable, voicesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

const BUILTIN_PARTS: Array<{ category: string; name: string; label: string; sortOrder: number }> = [
  // Hair styles
  { category: "hair_style", name: "short", label: "Short", sortOrder: 0 },
  { category: "hair_style", name: "long", label: "Long", sortOrder: 1 },
  { category: "hair_style", name: "curly", label: "Curly", sortOrder: 2 },
  { category: "hair_style", name: "wavy", label: "Wavy", sortOrder: 3 },
  { category: "hair_style", name: "bun", label: "Bun", sortOrder: 4 },
  { category: "hair_style", name: "ponytail", label: "Ponytail", sortOrder: 5 },
  { category: "hair_style", name: "buzz", label: "Buzz", sortOrder: 6 },
  // Eye styles
  { category: "eye_style", name: "default", label: "Default", sortOrder: 0 },
  { category: "eye_style", name: "round", label: "Round", sortOrder: 1 },
  { category: "eye_style", name: "almond", label: "Almond", sortOrder: 2 },
  { category: "eye_style", name: "hooded", label: "Hooded", sortOrder: 3 },
  { category: "eye_style", name: "monolid", label: "Monolid", sortOrder: 4 },
  { category: "eye_style", name: "sleepy", label: "Sleepy", sortOrder: 5 },
  // Mouth styles
  { category: "mouth_style", name: "smile", label: "Smile", sortOrder: 0 },
  { category: "mouth_style", name: "neutral", label: "Neutral", sortOrder: 1 },
  { category: "mouth_style", name: "smirk", label: "Smirk", sortOrder: 2 },
  { category: "mouth_style", name: "open", label: "Open", sortOrder: 3 },
  { category: "mouth_style", name: "wide-smile", label: "Wide Smile", sortOrder: 4 },
  // Outfit styles
  { category: "outfit_style", name: "casual", label: "Casual", sortOrder: 0 },
  { category: "outfit_style", name: "formal", label: "Formal", sortOrder: 1 },
  { category: "outfit_style", name: "sporty", label: "Sporty", sortOrder: 2 },
  { category: "outfit_style", name: "hoodie", label: "Hoodie", sortOrder: 3 },
  { category: "outfit_style", name: "shirt", label: "Shirt", sortOrder: 4 },
  { category: "outfit_style", name: "dress", label: "Dress", sortOrder: 5 },
  // Accessories
  { category: "accessory", name: "none", label: "None", sortOrder: 0 },
  { category: "accessory", name: "glasses", label: "Glasses", sortOrder: 1 },
  { category: "accessory", name: "sunglasses", label: "Sunglasses", sortOrder: 2 },
  { category: "accessory", name: "hat", label: "Hat", sortOrder: 3 },
  { category: "accessory", name: "headphones", label: "Headphones", sortOrder: 4 },
  { category: "accessory", name: "crown", label: "Crown", sortOrder: 5 },
];

const BUILTIN_VOICES: Array<{
  name: string;
  description: string;
  pitch: number;
  rate: number;
  browserVoiceName?: string;
  sortOrder: number;
}> = [
  { name: "Alloy", description: "Neutral — balanced, everyday voice", pitch: 1.0, rate: 1.0, sortOrder: 0 },
  { name: "Echo", description: "Deep — low, resonant tone", pitch: 0.5, rate: 0.85, sortOrder: 1 },
  { name: "Fable", description: "Bright — warm and slightly higher", pitch: 1.3, rate: 0.95, sortOrder: 2 },
  { name: "Onyx", description: "Gravelly — very deep and slow", pitch: 0.4, rate: 0.75, sortOrder: 3 },
  { name: "Nova", description: "Energetic — fast and high-pitched", pitch: 1.6, rate: 1.2, sortOrder: 4 },
  { name: "Shimmer", description: "Crystal — very high and crisp", pitch: 1.8, rate: 1.1, sortOrder: 5 },
];

export async function seedDefaults(): Promise<void> {
  let seeded = 0;
  let skipped = 0;

  for (const part of BUILTIN_PARTS) {
    const existing = await db
      .select({ id: avatarPartsTable.id })
      .from(avatarPartsTable)
      .where(
        and(
          eq(avatarPartsTable.category, part.category),
          eq(avatarPartsTable.name, part.name),
          eq(avatarPartsTable.isBuiltIn, true),
        ),
      )
      .limit(1);

    if (!existing.length) {
      await db.insert(avatarPartsTable).values({
        ...part,
        imageUrl: "",
        isBuiltIn: true,
        isActive: true,
      });
      seeded++;
    } else {
      skipped++;
    }
  }

  for (const voice of BUILTIN_VOICES) {
    const existing = await db
      .select({ id: voicesTable.id })
      .from(voicesTable)
      .where(and(eq(voicesTable.name, voice.name), eq(voicesTable.isBuiltIn, true)))
      .limit(1);

    if (!existing.length) {
      await db.insert(voicesTable).values({ ...voice, isBuiltIn: true, isActive: true });
      seeded++;
    } else {
      skipped++;
    }
  }

  if (seeded > 0) {
    logger.info({ seeded, skipped }, "Seeded default parts and voices");
  }
}
