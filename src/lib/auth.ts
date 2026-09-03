// Login-Logik: Passwörter werden gehasht (nie im Klartext gespeichert),
// die Sitzung läuft über ein signiertes, httpOnly-Cookie (kein Session-Storage
// in der Datenbank nötig – schlank und ausreichend sicher für V1).

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "kickoff_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET ist nicht gesetzt (.env prüfen)");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

/** Lädt den eingeloggten Nutzer, oder null wenn niemand eingeloggt ist. */
export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}
