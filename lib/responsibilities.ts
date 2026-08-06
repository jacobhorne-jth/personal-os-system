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

export function withUnlabeledResponsibility(responsibilities: Responsibility[]) {
  return responsibilities.some((item) => item.id === UNLABELED_RESPONSIBILITY_ID)
    ? responsibilities
    : [...responsibilities, UNLABELED_RESPONSIBILITY];
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
