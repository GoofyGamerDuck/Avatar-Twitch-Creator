// Legacy skin/hair ID → hex lookup (backward compat with old DB values)
const SKIN_ID_MAP: Record<string, string> = {
  "light": "#FFE0C4", "medium-light": "#F3C8A0", "medium": "#D6A371",
  "medium-dark": "#A67B5B", "dark": "#614028",
};
const HAIR_ID_MAP: Record<string, string> = {
  "black": "#1A1A1A", "brown": "#4A2F1D", "blonde": "#E8C361", "red": "#A63321",
  "gray": "#8C8C8C", "white": "#F2F2F2", "blue": "#3B7BA8", "green": "#4B8B67", "pink": "#D46F93",
};

/** Resolve a color value that might be an old ID or already a hex string */
export function resolveColorHex(value: string, type: 'skin' | 'hair'): string {
  if (!value) return type === 'skin' ? '#D6A371' : '#4A2F1D';
  if (value.startsWith('#')) return value;
  const map = type === 'skin' ? SKIN_ID_MAP : HAIR_ID_MAP;
  return map[value] ?? (type === 'skin' ? '#D6A371' : '#4A2F1D');
}

// Kept for AvatarPreview backward compat resolution
export const SKIN_TONES = Object.entries(SKIN_ID_MAP).map(([id, hex]) => ({ id, hex, name: id }));
export const HAIR_COLORS = Object.entries(HAIR_ID_MAP).map(([id, hex]) => ({ id, hex, name: id }));

export const HEAD_SHAPES = [
  { value: "circle",         label: "Circle (Default)" },
  { value: "oval",           label: "Oval — Tall" },
  { value: "wide",           label: "Wide / Chubby" },
  { value: "square",         label: "Square" },
  { value: "rounded-square", label: "Rounded Square" },
  { value: "diamond",        label: "Diamond" },
];

export const LAYER_LABELS: Record<string, string> = {
  backhair:  "Back Hair",
  outfit:    "Outfit",
  head:      "Head",
  fronthair: "Front Hair",
  eyes:      "Eyes",
  mouth:     "Mouth",
};

export const BASE_LAYERS = ["backhair", "outfit", "head", "fronthair", "eyes", "mouth"] as const;
