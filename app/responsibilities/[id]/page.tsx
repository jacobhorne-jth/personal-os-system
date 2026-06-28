import { notFound } from "next/navigation";
import { responsibilities } from "@/lib/data/mock";
import { ResponsibilityWorkspace } from "@/components/responsibilities/responsibility-workspace";

export default async function ResponsibilityByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const responsibility = responsibilities.find((item) => item.id === id);

  if (!responsibility) {
    notFound();
  }

  return <ResponsibilityWorkspace responsibilityId={responsibility.id} />;
}
