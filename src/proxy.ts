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

const PIKET_ROUTES = ["/piket"];

const PIKET_ALLOWED_ROUTES = ["/piket", "/jadwal"];
const PIKET_PAGE_ROLES = ["ADMIN", "PIMPINAN", "PIKET"];

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

  const roleUtama = session.user.role;

  const roles =
    Array.isArray(session.user.roles) && session.user.roles.length > 0
      ? session.user.roles
      : roleUtama
        ? [roleUtama]
        : [];

  const hasAnyRole = (allowedRoles: string[]) =>
    allowedRoles.some((allowedRole) => roles.includes(allowedRole));

  const isPiketOnly = roles.length === 1 && roles.includes("PIKET");

  const isApiRoute = pathname.startsWith("/api/");

  const isPiketRoute = PIKET_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  const isPiketAllowedRoute = PIKET_ALLOWED_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  /*
   * Halaman /piket hanya boleh dibuka oleh:
   * ADMIN, PIMPINAN, dan PIKET.
   */
  if (isPiketRoute && !hasAnyRole(PIKET_PAGE_ROLES)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  /*
   * Akun PIKET hanya boleh membuka halaman /piket.
   *
   * API tidak dibatasi di proxy ini karena keamanan API
   * harus diterapkan di masing-masing route handler.
   */
  if (!isApiRoute && isPiketOnly && !isPiketAllowedRoute) {
    return NextResponse.redirect(new URL("/piket", nextUrl));
  }

  const isDirectoryRoute = DIRECTORY_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  if (isDirectoryRoute && !hasAnyRole(DIRECTORY_ROLES)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    matchesRoute(pathname, route),
  );

  if (isAdminRoute && !hasAnyRole(["ADMIN"])) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
