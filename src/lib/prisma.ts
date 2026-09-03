import { PrismaClient } from "@prisma/client";

// Verhindert im Next.js-Dev-Modus (Hot Reload), dass bei jeder Code-Änderung
// eine neue Datenbank-Verbindung aufgebaut wird.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
