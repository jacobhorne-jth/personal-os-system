import { redirect } from "next/navigation";

// Analytics content now lives on /progress
export default function AnalyticsPage() {
  redirect("/progress");
}
