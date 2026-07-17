import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        nip: {},
        nis: {}, // ← baru (untuk ortu)
        password: {},
      },
      async authorize(credentials) {
        const password = credentials?.password as string;
        if (!password) return null;

        // ── Login ORTU (pakai NIS) ──────────────────────────
        if (credentials?.nis) {
          const ortu = await prisma.userOrtu.findFirst({
            where: { nis: credentials.nis as string, aktif: true },
            include: { siswa: true },
          });
          if (!ortu) return null;

          const match = await bcrypt.compare(password, ortu.password);
          if (!match) return null;

          return {
            id: ortu.id,
            name: ortu.nama,
            nip: ortu.nis, // diisi NIS supaya JWT token konsisten
            nis: ortu.nis,
            role: "ORTU",
            siswaId: ortu.siswaId,
          };
        }

        // ── Login STAFF/GURU/ADMIN/PIMPINAN (pakai NIP) ─────
        if (credentials?.nip) {
          const user = await prisma.user.findFirst({
            where: { nip: credentials.nip as string, aktif: true },
          });
          if (!user) return null;

          const match = await bcrypt.compare(password, user.password);
          if (!match) return null;

          return {
            id: user.id,
            name: user.nama,
            nip: user.nip,
            role: user.role,
            siswaId: null,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nip = (user as any).nip;
        token.role = (user as any).role;
        token.siswaId = (user as any).siswaId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.nip = token.nip as string;
        session.user.role = token.role as string;
        session.user.siswaId = (token.siswaId as string) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
