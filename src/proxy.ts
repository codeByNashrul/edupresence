import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_FILES = new Set([
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/logo.png",
]);

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/icons/",
  "/serwist/",
  "/~offline",
];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  const isPublicPath =
    PUBLIC_FILES.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const adminRoutes = ["/guru", "/staff", "/kelas", "/ruangan", "/pengaturan"];

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
