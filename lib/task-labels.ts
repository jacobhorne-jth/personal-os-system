import { responsibilities } from "@/lib/data/mock";
import { responsibilityTone } from "@/lib/theme";

export const taskLabels = responsibilities.map((responsibility) => responsibility.name);

export function taskLabel(taskLabelsValue?: string[], responsibilityId?: string) {
  const responsibility = responsibilities.find((item) => item.id === responsibilityId);
  if (responsibility) return responsibility.name;

  const savedLabel = taskLabelsValue?.[0];
  const matchingLabel = taskLabels.find((label) => label.toLowerCase() === savedLabel?.toLowerCase());
  return matchingLabel ?? "Life";
}

export function taskLabelColor(label: string) {
  const responsibility = responsibilities.find((item) => item.name === label);
  return responsibility ? responsibilityTone[responsibility.color].hex : responsibilityTone.sage.hex;
}
