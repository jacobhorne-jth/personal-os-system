import { NextResponse } from "next/server";
import { getResponsibilitySnapshot } from "@/lib/queries/dashboard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = getResponsibilitySnapshot(id);

  if (!snapshot.responsibility) {
    return NextResponse.json({ error: "Responsibility not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
