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
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        const nip =
          typeof credentials?.nip === "string" ? credentials.nip.trim() : "";

        const nis =
          typeof credentials?.nis === "string" ? credentials.nis.trim() : "";

        if (!password) {
          return null;
        }

        // ── Login ORTU menggunakan NIS ──────────────────────────
        if (nis) {
          const ortu = await prisma.userOrtu.findUnique({
            where: {
              nis,
            },
            include: {
              siswa: true,
            },
          });

          if (!ortu?.aktif) {
            return null;
          }

          const passwordValid = await bcrypt.compare(password, ortu.password);

          if (!passwordValid) {
            return null;
          }

          return {
            id: ortu.id,
            name: ortu.nama,
            nip: ortu.nis,
            nis: ortu.nis,
            role: "ORTU",
            siswaId: ortu.siswaId,
          };
        }

        // ── Login User menggunakan NIP ──────────────────────────
        // ADMIN, PIMPINAN, GURU, STAFF, dan PIKET
        if (nip) {
          const user = await prisma.user.findUnique({
            where: {
              nip,
            },
          });

          if (!user?.aktif) {
            return null;
          }

          const passwordValid = await bcrypt.compare(password, user.password);

          if (!passwordValid) {
            return null;
          }

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
