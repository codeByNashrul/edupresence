import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    nip: string;
    role: string;
    roles: string[];
    siswaId: string | null;
  }

  interface Session {
    user: {
      id: string;
      nip: string;
      role: string;
      roles: string[];
      siswaId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nip: string;
    role: string;
    roles: string[];
    siswaId: string | null;
  }
}
