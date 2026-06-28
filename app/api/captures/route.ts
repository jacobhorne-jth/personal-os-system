import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      id: "local-capture-preview",
      status: "captured",
      next: "ai_review",
      received: body
    },
    { status: 202 }
  );
}
