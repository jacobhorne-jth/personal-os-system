import { EventDetailClient } from "@/components/calendar/event-detail-client";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EventDetailClient id={id} />;
}
