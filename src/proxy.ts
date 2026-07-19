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

const DIRECTORY_ROUTES = ["/guru", "/staff", "/siswa"];

const DIRECTORY_ROLES = ["ADMIN", "PIMPINAN", "GURU", "STAFF"];

const ADMIN_ROUTES = ["/kelas", "/ruangan", "/pengaturan"];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  const isPublicPath =
    PUBLIC_FILES.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const role = session.user.role;

  const isDirectoryRoute = DIRECTORY_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  if (isDirectoryRoute && !DIRECTORY_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
