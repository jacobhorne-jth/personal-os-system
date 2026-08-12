import { redirect } from "next/navigation";

// Analytics content now lives on /weekly-review
export default function AnalyticsPage() {
  redirect("/weekly-review");
}
