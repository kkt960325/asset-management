import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = process.env.DASHBOARD_PASSWORD;
        if (!password) {
          console.error("[auth] DASHBOARD_PASSWORD 환경변수가 설정되지 않았습니다.");
          return null;
        }
        if (credentials?.password === password) {
          return { id: "owner", name: "Owner" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // 30일간 세션 유지
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
