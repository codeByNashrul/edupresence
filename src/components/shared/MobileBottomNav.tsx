"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronRight, Grid2X2, ScanLine, UserCircle2, X } from "lucide-react";
import { iconMap, menuMap, ROLES_WITH_PROFIL } from "./Sidebar";

/**
 * Mobile shortcuts only. Menu visibility always comes from the same role menu
 * used by the desktop Sidebar, including additional roles in the session.
 */
const QUICK_LINKS: Record<string, string[]> = {
  ADMIN: ["/guru", "/jadwal", "/dashboard", "/laporan"],
  PIMPINAN: ["/jadwal", "/catatan-harian/monitor", "/dashboard", "/laporan"],
  GURU: ["/tukar-jadwal", "/jadwal", "/dashboard", "/izin"],
  STAFF: ["/riwayat", "/catatan-harian", "/dashboard", "/izin"],
  PIKET: ["/piket", "/jadwal"],
  ORTU: [
    "/ortu/absensi",
    "/ortu/jadwal",
    "/ortu/dashboard",
    "/ortu/pengumuman",
  ],
};

const QUICK_LABELS: Record<string, string> = {
  "/dashboard": "Beranda",
  "/ortu/dashboard": "Beranda",
  "/scan": "Scan",
  "/riwayat": "Riwayat",
  "/tukar-jadwal": "Tukar Jadwal",
  "/guru": "Guru",
  "/jadwal": "Jadwal",
  "/catatan-harian": "Catatan",
  "/catatan-harian/monitor": "Catatan",
  "/izin": "Izin",
  "/laporan": "Laporan",
  "/piket": "Piket",
  "/ortu/absensi": "Absensi",
  "/ortu/jadwal": "Jadwal",
  "/ortu/pengumuman": "Info",
};

const matchesPath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

interface Props {
  role: string;
}

export default function MobileBottomNav({ role }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  // Store the route on which the sheet opened: navigation closes it without
  // an effect that synchronously resets React state after a route change.
  const [sheetPath, setSheetPath] = useState<string | null>(null);
  const sheetOpen = sheetPath === pathname;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const rolesKey = Array.isArray(session?.user?.roles)
    ? session.user.roles.join("|")
    : "";

  const roles = useMemo(() => {
    const extraRoles = rolesKey.split("|").filter(Boolean);
    return Array.from(new Set([role, ...extraRoles].filter(Boolean)));
  }, [role, rolesKey]);

  const menu = useMemo(() => {
    const combined = roles.flatMap((userRole) => menuMap[userRole] ?? []);
    return Array.from(
      new Map(combined.map((item) => [item.href, item])).values(),
    );
  }, [roles]);

  const quickLinks = useMemo(() => {
    const allowed = new Set(menu.map((item) => item.href));
    const preferred = QUICK_LINKS[role] ?? ["/dashboard"];
    return preferred
      .filter((href) => allowed.has(href))
      .slice(0, 4)
      .map((href) => ({
        href,
        label:
          QUICK_LABELS[href] ??
          menu.find((item) => item.href === href)?.label ??
          href,
      }));
  }, [menu, role]);

  const moreLinks = useMemo(() => {
    const pinned = new Set(quickLinks.map((item) => item.href));
    return menu.filter((item) => !pinned.has(item.href));
  }, [menu, quickLinks]);

  const hasScan = menu.some((item) => item.href === "/scan");
  const hasProfil = roles.some((userRole) =>
    ROLES_WITH_PROFIL.includes(userRole),
  );
  const moreActive =
    pathname === "/profil" ||
    (hasScan && pathname === "/scan-kegiatan-siswa") ||
    moreLinks.some((item) => matchesPath(pathname, item.href));

  useEffect(() => {
    if (!sheetOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setSheetPath(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [sheetOpen]);

  const closeSheet = () => setSheetPath(null);

  // Keep keyboard focus inside the sheet when navigating with Tab.
  function handleSheetKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <nav
        aria-label="Navigasi utama mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-indigo-100/80 bg-white/95 shadow-[0_-8px_28px_rgba(49,46,129,0.08)] backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/95 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex h-[76px] max-w-lg items-stretch justify-around px-1">
          {quickLinks.map((item) => {
            const Icon = iconMap[item.href] ?? Grid2X2;
            const active = matchesPath(pathname, item.href);
            const isHome =
              item.href === "/dashboard" || item.href === "/ortu/dashboard";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-500 ${isHome ? "text-indigo-700 dark:text-indigo-200" : active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}
              >
                {isHome ? (
                  <>
                    <span
                      className={`absolute -top-5 flex h-[60px] w-[60px] items-center justify-center rounded-[22px] border-[5px] border-white bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_11px_24px_rgba(79,70,229,0.34)] transition-transform dark:border-gray-950 dark:from-indigo-500 dark:to-violet-600 ${active ? "scale-105 ring-2 ring-indigo-200 dark:ring-indigo-700" : "ring-1 ring-indigo-100 dark:ring-indigo-900"}`}
                    >
                      <Icon size={26} strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <span className="absolute bottom-2 text-[11px] font-extrabold leading-none">
                      {item.label}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${active ? "bg-indigo-100 dark:bg-indigo-900/70" : ""}`}
                    >
                      <Icon
                        size={20}
                        strokeWidth={active ? 2.5 : 2}
                        aria-hidden="true"
                      />
                    </span>
                    <span
                      className={`max-w-full text-center text-[10px] leading-3 ${active ? "font-bold" : "font-medium"}`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="edupresence-mobile-menu-sheet"
            onClick={() => setSheetPath(sheetOpen ? null : pathname)}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-500 ${moreActive || sheetOpen ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}
          >
            <span
              className={`flex h-8 w-12 items-center justify-center rounded-xl ${moreActive || sheetOpen ? "bg-indigo-100 dark:bg-indigo-900/70" : ""}`}
            >
              <Grid2X2
                size={20}
                strokeWidth={moreActive || sheetOpen ? 2.5 : 2}
                aria-hidden="true"
              />
            </span>
            <span
              className={`text-[10px] leading-none ${moreActive || sheetOpen ? "font-bold" : "font-medium"}`}
            >
              Lainnya
            </span>
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu lainnya"
            className="absolute inset-0 h-full w-full bg-gray-950/60 backdrop-blur-[2px]"
            onClick={closeSheet}
          />
          <div
            id="edupresence-mobile-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edupresence-mobile-menu-title"
            onKeyDown={handleSheetKeyDown}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl dark:bg-gray-900"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div
              className="mx-auto mb-1 mt-2 h-1 w-12 shrink-0 rounded-full bg-gray-300 dark:bg-gray-700"
              aria-hidden="true"
            />
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-3 pt-2 dark:border-gray-800">
              <div>
                <h2
                  id="edupresence-mobile-menu-title"
                  className="text-base font-bold text-gray-900 dark:text-white"
                >
                  Menu Lainnya
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Fitur EduPresence sesuai akses akun
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Tutup menu"
                onClick={closeSheet}
                className="rounded-xl bg-gray-100 p-2.5 text-gray-600 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-gray-800 dark:text-gray-200"
              >
                <X size={19} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {moreLinks.map((item) => {
                  const Icon = iconMap[item.href] ?? Grid2X2;
                  const active = matchesPath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      target={
                        item.href.startsWith("https://") ? "_blank" : undefined
                      }
                      rel={
                        item.href.startsWith("https://")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      aria-current={active ? "page" : undefined}
                      onClick={closeSheet}
                      className={`flex min-h-[88px] flex-col items-start justify-center gap-2 rounded-2xl border px-3 py-3 text-left transition-colors ${active ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200" : "border-gray-100 bg-gray-50 text-gray-700 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200 dark:hover:bg-gray-800"}`}
                    >
                      <Icon size={20} aria-hidden="true" />
                      <span className="line-clamp-2 text-xs font-semibold leading-snug">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
                {hasScan && (
                  <Link
                    href="/scan-kegiatan-siswa"
                    onClick={closeSheet}
                    aria-current={
                      pathname === "/scan-kegiatan-siswa" ? "page" : undefined
                    }
                    className="flex min-h-[88px] flex-col items-start justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 text-left text-gray-700 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200"
                  >
                    <ScanLine size={20} aria-hidden="true" />
                    <span className="text-xs font-semibold">
                      Scan Kegiatan Siswa
                    </span>
                  </Link>
                )}
                {hasProfil && (
                  <Link
                    href="/profil"
                    onClick={closeSheet}
                    aria-current={pathname === "/profil" ? "page" : undefined}
                    className="flex min-h-[88px] flex-col items-start justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 text-left text-gray-700 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200"
                  >
                    <UserCircle2 size={20} aria-hidden="true" />
                    <span className="text-xs font-semibold">Profil Saya</span>
                  </Link>
                )}
              </div>
              {moreLinks.length === 0 && !hasScan && !hasProfil && (
                <p className="px-3 py-8 text-center text-sm text-gray-500">
                  Semua menu sudah tersedia di navigasi utama.
                </p>
              )}
              <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                Ketuk fitur untuk membuka halaman <ChevronRight size={12} />
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
