import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/app/api/_helpers";

export async function POST() {
  const response = NextResponse.json({ data: { ok: true } });
  clearSessionCookie(response);
  return response;
}
