import type { ResponsibilityColor } from "@/lib/types/domain";

type Tone = {
  chip: string;
  text: string;
  border: string;
  fill: string;
  dot: string;
  gradient: string;
  hex: string;
  eventText: string;
  label: string;
};

const colors: Array<{ key: ResponsibilityColor; label: string; hex: string; darkText?: boolean }> = [
  { key: "tomato", label: "Tomato", hex: "#d93025" },
  { key: "coral", label: "Coral", hex: "#ea4335" },
  { key: "cherry", label: "Cherry", hex: "#c2185b" },
  { key: "rose", label: "Rose", hex: "#e91e63" },
  { key: "flamingo", label: "Flamingo", hex: "#f48fb1", darkText: true },
  { key: "pink", label: "Pink", hex: "#f06292" },
  { key: "magenta", label: "Magenta", hex: "#d81b60" },
  { key: "tangerine", label: "Tangerine", hex: "#f4511e" },
  { key: "pumpkin", label: "Pumpkin", hex: "#ef6c00" },
  { key: "mango", label: "Mango", hex: "#ff9800", darkText: true },
  { key: "amber", label: "Amber", hex: "#fbbc04", darkText: true },
  { key: "banana", label: "Banana", hex: "#f6bf26", darkText: true },
  { key: "lemon", label: "Lemon", hex: "#fdd663", darkText: true },
  { key: "lime", label: "Lime", hex: "#c0ca33", darkText: true },
  { key: "sage", label: "Sage", hex: "#33b679", darkText: true },
  { key: "mint", label: "Mint", hex: "#34a853" },
  { key: "basil", label: "Basil", hex: "#0b8043" },
  { key: "emerald", label: "Emerald", hex: "#00a86b" },
  { key: "teal", label: "Teal", hex: "#009688" },
  { key: "cyan", label: "Cyan", hex: "#00acc1" },
  { key: "peacock", label: "Peacock", hex: "#039be5" },
  { key: "sky", label: "Sky", hex: "#4fc3f7", darkText: true },
  { key: "blue", label: "Blue", hex: "#4285f4" },
  { key: "cobalt", label: "Cobalt", hex: "#1a73e8" },
  { key: "blueberry", label: "Blueberry", hex: "#3f51b5" },
  { key: "indigo", label: "Indigo", hex: "#5e35b1" },
  { key: "periwinkle", label: "Periwinkle", hex: "#9fa8da", darkText: true },
  { key: "lavender", label: "Lavender", hex: "#7986cb", darkText: true },
  { key: "lilac", label: "Lilac", hex: "#b39ddb", darkText: true },
  { key: "violet", label: "Violet", hex: "#a142f4" },
  { key: "grape", label: "Grape", hex: "#8e24aa" },
  { key: "orchid", label: "Orchid", hex: "#ba68c8" },
  { key: "graphite", label: "Graphite", hex: "#616161" },
  { key: "slate", label: "Slate", hex: "#78909c" },
  { key: "stone", label: "Stone", hex: "#9e9e9e", darkText: true }
];

function tone({ key, label, hex, darkText }: (typeof colors)[number]): Tone {
  const textColor = darkText ? "text-paper" : "text-white";
  return {
    chip: `bg-${key} ${textColor} ring-${key}`,
    text: `text-${key}`,
    border: `border-${key}`,
    fill: `bg-${key}`,
    dot: `bg-${key}`,
    gradient: `from-${key} via-${key} to-${key}`,
    hex,
    eventText: darkText ? "#202124" : "#ffffff",
    label
  };
}

export const responsibilityTone = Object.fromEntries(colors.map((color) => [color.key, tone(color)])) as Record<ResponsibilityColor, Tone>;

export const calendarPalette = colors.map((color) => color.key);
