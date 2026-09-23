import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/api",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon-192.svg",
  "/icon-512.svg",
  "/apple-touch-icon.svg",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession =
    request.cookies.has("kenzo_session") ||
    request.cookies.has("kenzo_refresh_token");

  // If already authenticated and trying to visit /login, go straight to dashboard
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow public routes (exact match for "/" or startsWith for other paths)
  if (
    pathname === "/" ||
    PUBLIC_ROUTES.some((route) => route !== "/" && pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (server-side auth signal)
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)",
  ],
};
