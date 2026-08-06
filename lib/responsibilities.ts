import type { Responsibility } from "@/lib/types/domain";

export const UNLABELED_RESPONSIBILITY_ID = "unlabeled";

export const UNLABELED_RESPONSIBILITY: Responsibility = {
  id: UNLABELED_RESPONSIBILITY_ID,
  name: "Unlabeled",
  description: "Imported or uncategorized items that do not match an existing label.",
  color: "#9aa0a6",
  icon: "Circle",
  weeklyGoalHours: 0,
  actualHoursThisWeek: 0,
  plannedHoursThisWeek: 0,
  taskCount: 0,
  upcomingCount: 0,
};

function responsibilityKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function withUnlabeledResponsibility(responsibilities: Responsibility[]) {
  return responsibilities.some((item) => item.id === UNLABELED_RESPONSIBILITY_ID)
    ? responsibilities
    : [...responsibilities, UNLABELED_RESPONSIBILITY];
}

export function importedCalendarResponsibility(sourceName: string): Responsibility {
  const name = sourceName.trim() || "Imported";
  const key = responsibilityKey(name) || "imported";
  const color =
    key === "personal" ? "#34a853" :
    key === "work" ? "#4285f4" :
    key === "school" ? "#a142f4" :
    "#9aa0a6";
  return {
    id: `calendar-${key}`,
    name,
    description: `Imported from the ${name} Google Calendar.`,
    color,
    icon: "Calendar",
    weeklyGoalHours: 0,
    actualHoursThisWeek: 0,
    plannedHoursThisWeek: 0,
    taskCount: 0,
    upcomingCount: 0,
  };
}

export function mergeResponsibilities(base: Responsibility[], incoming: Responsibility[]) {
  const byName = new Map(base.map((item) => [item.name.trim().toLowerCase(), item]));
  const byId = new Map(base.map((item) => [item.id, item]));
  const additions = incoming.filter((item) => !byId.has(item.id) && !byName.has(item.name.trim().toLowerCase()));
  return [...base, ...additions];
}

export function inferResponsibilityId(text: string, responsibilities: Responsibility[]) {
  const active = responsibilities.filter((item) => !item.archivedAt && item.id !== UNLABELED_RESPONSIBILITY_ID);
  const haystack = text.toLowerCase();
  const match = active.find((item) => {
    const name = item.name.toLowerCase();
    return name.length > 2 && haystack.includes(name);
  });
  return match?.id ?? UNLABELED_RESPONSIBILITY_ID;
}

export function responsibilityIdForImportedCalendar(
  sourceName: string,
  eventText: string,
  responsibilities: Responsibility[],
) {
  const active = responsibilities.filter((item) => !item.archivedAt && item.id !== UNLABELED_RESPONSIBILITY_ID);
  const sourceKey = sourceName.trim().toLowerCase();
  const sourceMatch = active.find((item) => item.name.trim().toLowerCase() === sourceKey);
  if (sourceMatch) return sourceMatch.id;
  const inferred = inferResponsibilityId(eventText, responsibilities);
  return inferred === UNLABELED_RESPONSIBILITY_ID ? importedCalendarResponsibility(sourceName).id : inferred;
}
