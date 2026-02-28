import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null },
  });

  return NextResponse.json({ data: { disabled: true } });
}
