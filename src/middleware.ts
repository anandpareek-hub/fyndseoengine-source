import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SESSION_COOKIE_NAME = "webflow-seo-engine.session-token";

const protectedRoutes = [
  "/dashboard",
  "/goals",
  "/articles",
  "/review",
  "/published",
  "/optimizations",
  "/ab-tests",
  "/research",
  "/pages",
  "/settings",
  "/onboarding",
  "/strategy",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
  });

  if (!token) {
    const signInUrl = new URL("/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/goals/:path*",
    "/articles/:path*",
    "/review/:path*",
    "/published/:path*",
    "/optimizations/:path*",
    "/ab-tests/:path*",
    "/research/:path*",
    "/pages/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/strategy/:path*",
  ],
};
