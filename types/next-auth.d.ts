// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string | "user";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | "USER";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | "USER";
  }
}