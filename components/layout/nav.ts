import {
  Apple,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  FileText,
  Flag,
  Inbox,
  Lightbulb,
  Repeat2,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Extra path prefixes that should highlight this item
  match?: string[];
};

export const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/home", label: "Today", icon: CalendarCheck2 },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, match: ["/event/"] },
      { href: "/tasks", label: "Tasks", icon: CheckCircle2, match: ["/task/"] },
      { href: "/inbox", label: "Inbox", icon: Inbox, match: ["/capture"] },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/habits", label: "Habits", icon: Repeat2 },
      { href: "/gym", label: "Gym", icon: Dumbbell },
      { href: "/food", label: "Food", icon: Apple },
      { href: "/goals", label: "Goals", icon: Flag },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/notes", label: "Notes", icon: FileText },
      { href: "/ideas", label: "Ideas", icon: Lightbulb },
      { href: "/responsibilities", label: "Labels", icon: Tags, match: ["/r/"] },
      { href: "/weekly-review", label: "Weekly review", icon: ClipboardCheck },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM];

export function isNavActive(pathname: string, item: NavItem) {
  if (item.href === "/home") return pathname === "/home" || pathname === "/";
  return pathname.startsWith(item.href) || Boolean(item.match?.some((prefix) => pathname.startsWith(prefix)));
}
