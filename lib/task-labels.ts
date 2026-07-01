import type { Responsibility } from "@/lib/types/domain";
import { responsibilities as mockResponsibilities } from "@/lib/data/mock";
import { responsibilityTone } from "@/lib/theme";

export const taskLabels = mockResponsibilities.map((r) => r.name);

export function taskLabel(taskLabelsValue?: string[], responsibilityId?: string, resps?: Responsibility[]) {
  const list = resps ?? mockResponsibilities;
  const resp = list.find((r) => r.id === responsibilityId);
  if (resp) return resp.name;
  const savedLabel = taskLabelsValue?.[0];
  const match = list.find((r) => r.name.toLowerCase() === savedLabel?.toLowerCase());
  return match?.name ?? (list[0]?.name ?? "Life");
}

export function taskLabelColor(label: string, resps?: Responsibility[]) {
  const list = resps ?? mockResponsibilities;
  const resp = list.find((r) => r.name === label);
  return resp ? responsibilityTone[resp.color].hex : responsibilityTone.sage.hex;
}
