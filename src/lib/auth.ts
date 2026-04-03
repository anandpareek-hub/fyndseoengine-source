import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "webflow-seo-engine.session-token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!profile?.email) return false;
      try {
        await prisma.user.upsert({
          where: { email: profile.email },
          update: {
            name: profile.name || user.name || null,
            image: (profile as Record<string, unknown>).picture as string || user.image || null,
          },
          create: {
            email: profile.email,
            name: profile.name || user.name || null,
            image: (profile as Record<string, unknown>).picture as string || user.image || null,
          },
        });
      } catch (err) {
        console.error("[auth] Error upserting user:", err);
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: profile.email },
          });
          if (dbUser) {
            token.id = dbUser.id;
          }
        } catch (err) {
          console.error("[auth] Error fetching user:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
