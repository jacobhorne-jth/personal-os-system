import { ResponsibilityWorkspace } from "@/components/responsibilities/responsibility-workspace";

export default async function ResponsibilityPage({ params }: { params: Promise<{ responsibilityId: string }> }) {
  const { responsibilityId } = await params;
  return <ResponsibilityWorkspace responsibilityId={responsibilityId} />;
}
