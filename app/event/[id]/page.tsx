import { redirect } from "next/navigation";

// The calendar's inline panel is the single editing surface for events;
// old /event/<id> links (search, timelines) land there.
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/calendar?event=${encodeURIComponent(id)}`);
}
