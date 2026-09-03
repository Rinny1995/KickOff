import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-Mail und Passwort eingeben" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const validPassword = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !validPassword) {
    return NextResponse.json({ error: "E-Mail oder Passwort ist falsch" }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
