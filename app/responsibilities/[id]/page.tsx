import { ResponsibilityWorkspace } from "@/components/responsibilities/responsibility-workspace";

export default async function ResponsibilityByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResponsibilityWorkspace responsibilityId={id} />;
}
