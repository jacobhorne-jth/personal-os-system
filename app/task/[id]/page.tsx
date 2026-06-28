import { TaskDetailClient } from "@/components/tasks/task-detail-client";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TaskDetailClient id={id} />;
}
