import { NextResponse } from "next/server";
import { aiReviewItems } from "@/lib/data/mock";

export async function GET() {
  return NextResponse.json({
    status: "pending_review",
    items: aiReviewItems
  });
}
