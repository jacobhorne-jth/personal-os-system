import type { ResponsibilityColor } from "@/lib/types/domain";

export type Tone = {
  hex: string;
  eventText: string; // readable text color on top of hex
};

// Legacy palette: responsibilities created before the free color wheel store
// these names instead of hex values.
const legacyHex: Record<string, string> = {
  tomato: "#d93025",
  coral: "#ea4335",
  cherry: "#c2185b",
  rose: "#e91e63",
  flamingo: "#f48fb1",
  pink: "#f06292",
  magenta: "#d81b60",
  tangerine: "#f4511e",
  pumpkin: "#ef6c00",
  mango: "#ff9800",
  amber: "#fbbc04",
  banana: "#f6bf26",
  lemon: "#fdd663",
  lime: "#c0ca33",
  sage: "#33b679",
  mint: "#34a853",
  basil: "#0b8043",
  emerald: "#00a86b",
  teal: "#009688",
  cyan: "#00acc1",
  peacock: "#039be5",
  sky: "#4fc3f7",
  blue: "#4285f4",
  cobalt: "#1a73e8",
  blueberry: "#3f51b5",
  indigo: "#5e35b1",
  periwinkle: "#9fa8da",
  lavender: "#7986cb",
  lilac: "#b39ddb",
  violet: "#a142f4",
  grape: "#8e24aa",
  orchid: "#ba68c8",
  graphite: "#616161",
  slate: "#78909c",
  stone: "#9e9e9e"
};

const DEFAULT_HEX = "#4285f4"; // blue

export function colorHex(color: ResponsibilityColor | undefined | null): string {
  if (!color) return DEFAULT_HEX;
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return legacyHex[color] ?? DEFAULT_HEX;
}

function relativeLuminance(hex: string): number {
  const chan = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(1) + 0.7152 * chan(3) + 0.0722 * chan(5);
}

const toneCache = new Map<string, Tone>();

export function getTone(color: ResponsibilityColor | undefined | null): Tone {
  const hex = colorHex(color);
  let tone = toneCache.get(hex);
  if (!tone) {
    tone = { hex, eventText: relativeLuminance(hex) > 0.45 ? "#202124" : "#ffffff" };
    toneCache.set(hex, tone);
  }
  return tone;
}
