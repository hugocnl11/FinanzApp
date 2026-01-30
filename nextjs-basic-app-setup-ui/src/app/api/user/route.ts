import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

type PatchPayload = {
  name?: string;
  email?: string;
  image?: string | null;
};

export async function PATCH(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("No hay sesión", 401);

  let payload: PatchPayload;
  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { name, email, image } = payload;
  const data: { name?: string; email?: string; image?: string | null } = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return jsonError("Nombre no puede estar vacío");
    data.name = trimmed;
  }
  if (email !== undefined) {
    const trimmed = String(email).trim().toLowerCase();
    if (!trimmed) return jsonError("Email no puede estar vacío");
    const existing = await prisma.user.findFirst({
      where: { email: trimmed, id: { not: userId } },
    });
    if (existing) return jsonError("El email ya está en uso", 409);
    data.email = trimmed;
  }
  if (image !== undefined) data.image = image === "" ? null : image;

  if (Object.keys(data).length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    });
    if (!user) return jsonError("Usuario no encontrado", 404);
    return NextResponse.json({
      data: { user: { id: user.id, name: user.name, email: user.email, image: user.image ?? undefined } },
    });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({
    data: { user: { id: user.id, name: user.name, email: user.email, image: user.image ?? undefined } },
  });
}
