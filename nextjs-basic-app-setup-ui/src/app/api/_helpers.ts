import { NextResponse } from "next/server";

export function getUserId(request: Request) {
  const headerId = request.headers.get("x-user-id");
  if (headerId) return headerId;
  const { searchParams } = new URL(request.url);
  return searchParams.get("userId");
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
