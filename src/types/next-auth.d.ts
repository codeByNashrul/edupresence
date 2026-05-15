import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nip: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    nip: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nip: string;
    role: string;
  }
}
