import { ResponsibilityWorkspace } from "@/components/responsibilities/responsibility-workspace";

export default async function LabelShortcutPage({ params }: { params: Promise<{ responsibilityId: string }> }) {
  const { responsibilityId } = await params;
  return <ResponsibilityWorkspace responsibilityId={responsibilityId} />;
}
