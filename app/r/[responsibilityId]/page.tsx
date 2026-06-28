import { notFound } from "next/navigation";
import { responsibilities } from "@/lib/data/mock";
import { ResponsibilityWorkspace } from "@/components/responsibilities/responsibility-workspace";

export default async function ResponsibilityPage({ params }: { params: Promise<{ responsibilityId: string }> }) {
  const { responsibilityId } = await params;
  const responsibility = responsibilities.find((item) => item.id === responsibilityId);

  if (!responsibility) {
    notFound();
  }

  return <ResponsibilityWorkspace responsibilityId={responsibility.id} />;
}
