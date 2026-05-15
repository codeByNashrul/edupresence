import { PrismaClient } from "@prisma/client";

// Cek apakah prisma sudah ada di global
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Kalau belum ada, buat baru
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Simpan ke global kalau bukan production
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma; // ← ini yang perlu ditambahkan
}

export default prisma;
