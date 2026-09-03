import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Das sieht nicht nach einer E-Mail-Adresse aus"),
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(40),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }
  const { email, name, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Diese E-Mail-Adresse ist schon registriert" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
