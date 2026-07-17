"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  School,
  DoorOpen,
  CalendarDays,
  FileText,
  Settings,
  ScanLine,
  History,
  GraduationCapIcon,
  ClipboardList,
  FileBarChart2,
  NotebookPen,
  X,
  ChevronRight,
  UserRound,
  KeyRound,
  Megaphone,
  UserStar,
  FileCheck,
  FileBadge2,
  CalendarRange,
  UserCircle2,
} from "lucide-react";

const menuAdmin = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Manajemen Guru", href: "/guru" },
  { label: "Manajemen Staff", href: "/staff" },
  { label: "Manajemen Siswa", href: "/siswa" },
  { label: "Manajemen Ortu", href: "/ortu" },
  { label: "Manajemen Kelas", href: "/kelas" },
  { label: "Manajemen Ruangan", href: "/ruangan" },
  { label: "Jadwal Mata Pelajaran", href: "/jadwal" },
  { label: "Kalender Akademik", href: "/kalender-akademik" },
  { label: "Kegiatan Siswa", href: "/kegiatan-siswa" },
  { label: "Monitor Izin", href: "/izin/monitor" },
  { label: "Laporan Rekap Pelanggaran", href: "/rekap-pelanggaran" },
  { label: "Laporan Absensi", href: "/laporan" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
  { label: "E-Learning", href: "https://elearningsmppomosda.sch.id" },
  { label: "Pengaturan", href: "/pengaturan" },
];

const menuPimpinan = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jadwal Mata Pelajaran", href: "/jadwal" },
  { label: "Kalender Akademik", href: "/kalender-akademik" },
  { label: "Catatan Harian Staff", href: "/catatan-harian/monitor" },
  { label: "E-Learning", href: "https://elearningsmppomosda.sch.id" },
  { label: "Monitor Izin", href: "/izin/monitor" },
  { label: "Laporan Rekap Pelanggaran", href: "/rekap-pelanggaran" },
  { label: "Laporan Absensi", href: "/laporan" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
];

const menuGuru = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jadwal Mata Pelajaran", href: "/jadwal" },
  { label: "Kalender Akademik", href: "/kalender-akademik" },
  { label: "Scan Absensi", href: "/scan" },
  { label: "E-Learning", href: "https://elearningsmppomosda.sch.id" },
  { label: "Perizinan", href: "/izin" },
  { label: "Laporan Rekap Pelanggaran", href: "/rekap-pelanggaran" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
  { label: "Riwayat", href: "/riwayat" },
];

const menuStaff = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Scan Absensi", href: "/scan" },
  { label: "Catatan Harian", href: "/catatan-harian" },
  { label: "E-Learning", href: "https://elearningsmppomosda.sch.id" },
  { label: "Perizinan", href: "/izin" },
  { label: "Laporan Rekap Pelanggaran", href: "/rekap-pelanggaran" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
  { label: "Riwayat", href: "/riwayat" },
];

const menuOrtu = [
  { label: "Dashboard", href: "/ortu/dashboard" },
  { label: "Absensi", href: "/ortu/absensi" },
  { label: "Pelanggaran", href: "/ortu/pelanggaran" },
  { label: "Jadwal", href: "/ortu/jadwal" },
  { label: "Kalender", href: "/ortu/kalender-akademik" },
  { label: "Pengumuman", href: "/ortu/pengumuman" },
  { label: "Ganti Password", href: "/ortu/ganti-password" },
];

const menuMap: Record<string, typeof menuAdmin> = {
  ADMIN: menuAdmin,
  PIMPINAN: menuPimpinan,
  GURU: menuGuru,
  STAFF: menuStaff,
  ORTU: menuOrtu,
};

const iconMap: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/guru": Users,
  "/staff": UserCheck,
  "/kelas": School,
  "/ruangan": DoorOpen,
  "/jadwal": CalendarDays,
  "/kalender-akademik": CalendarRange,
  "/laporan": FileText,
  "/pengaturan": Settings,
  "/scan": ScanLine,
  "/riwayat": History,
  "/siswa": UserStar,
  "/kegiatan-siswa": ClipboardList,
  "/laporan-kegiatan-siswa": FileBadge2,
  "/catatan-harian": NotebookPen,
  "/catatan-harian/monitor": NotebookPen,
  "/rekap-pelanggaran": FileBarChart2,
  "/ortu/dashboard": LayoutDashboard,
  "/ortu/absensi": UserCheck,
  "/ortu/pelanggaran": FileBarChart2,
  "/ortu/jadwal": CalendarDays,
  "/ortu/kalender-akademik": CalendarRange,
  "/ortu": UserRound,
  "/ortu/ganti-password": KeyRound,
  "/ortu/pengumuman": Megaphone,
  "https://elearningsmppomosda.sch.id": GraduationCapIcon,
  "/izin": FileCheck,
  "/izin/monitor": FileCheck,
};

// Role yang punya halaman /profil
const ROLES_WITH_PROFIL = ["ADMIN", "PIMPINAN", "GURU", "STAFF"];

interface SidebarProps {
  role: string;
  isOpen: boolean;
  isExpanded: boolean;
  onHoverChange: (v: boolean) => void;
  onClose: () => void;
}

export default function Sidebar({
  role,
  isOpen,
  isExpanded,
  onHoverChange,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const menu = menuMap[role ?? ""] ?? menuGuru;
  const hasScan = menu.some((item) => item.href === "/scan");
  const showLabels = isExpanded;
  const collapsed = !showLabels;
  const hasProfil = ROLES_WITH_PROFIL.includes(role);

  const userName = session?.user?.name ?? "";
  const inisial = userName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const desktopNavClass = (active: boolean) =>
    `group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
    } ${
      active
        ? "bg-white/20 text-white shadow-md ring-1 ring-white/25"
        : "text-indigo-100/85 hover:bg-white/10 hover:text-white"
    }`;

  const mobileNavClass = (active: boolean) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:text-indigo-600"
    }`;

  const navItems = menu.filter((item) => item.href !== "/scan");
  const isProfilActive = pathname === "/profil";

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col overflow-hidden
          transition-all duration-300
          bg-white dark:bg-gray-950
          lg:bg-gradient-to-b lg:from-indigo-600 lg:via-indigo-700 lg:to-violet-800
          dark:lg:from-indigo-950 dark:lg:via-indigo-900 dark:lg:to-violet-950
          border-r border-gray-200 dark:border-gray-800 lg:border-white/10
          w-72
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isExpanded ? "lg:w-64" : "lg:w-20"}
          lg:translate-x-0 lg:h-screen
        `}
      >
        {/* Brand */}
        <div
          className={`flex items-center gap-3 p-4 min-h-[4.5rem] border-b border-gray-100 dark:border-gray-800 lg:border-white/10 shrink-0 ${
            showLabels ? "justify-between" : "justify-center lg:px-2"
          }`}
        >
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 min-w-0 ${collapsed ? "lg:justify-center" : ""}`}
            onClick={onClose}
          >
            <div className="shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-white p-1.5 shadow-lg ring-2 ring-indigo-200 lg:ring-white/30 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="SMP POMOSDA"
                className="w-full h-full object-contain"
              />
            </div>
            {showLabels && (
              <div>
                <h1 className="text-sm font-bold text-indigo-600 lg:text-white">
                  SMP POMOSDA
                </h1>
                <p className="text-xs text-gray-400 lg:text-indigo-200/70 mt-0.5">
                  School Management
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {showLabels && (
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 lg:text-indigo-200/60 mb-2 px-3">
              Menu
            </p>
          )}

          {/* Desktop links */}
          {navItems.map((item) => {
            const Icon = iconMap[item.href];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`hidden lg:flex ${desktopNavClass(active)}`}
              >
                {Icon && (
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-white shrink-0"
                        : "text-indigo-200/80 shrink-0"
                    }
                  />
                )}
                {showLabels && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && (
                      <ChevronRight size={14} className="opacity-70 shrink-0" />
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {/* Mobile links */}
          {navItems.map((item) => {
            const Icon = iconMap[item.href];
            const active = pathname === item.href;
            return (
              <Link
                key={`m-${item.href}`}
                href={item.href}
                className={`lg:hidden ${mobileNavClass(active)}`}
              >
                {Icon && (
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-white"
                        : "text-gray-400 group-hover:text-indigo-500"
                    }
                  />
                )}
                <span className="flex-1 truncate">{item.label}</span>
                {active && <ChevronRight size={14} className="opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Scan buttons */}
        {hasScan && (
          <div className="shrink-0 p-2 border-t border-gray-100 dark:border-gray-800 lg:border-white/10">
            {showLabels && (
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 lg:text-indigo-200/60">
                Absensi
              </p>
            )}
            <div
              className={`space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}
            >
              {/* Desktop */}
              <Link
                href="/scan"
                title={collapsed ? "Scan Absensi" : undefined}
                className={`hidden lg:flex items-center justify-center gap-2 font-semibold text-sm text-white transition-all ${
                  collapsed
                    ? "w-10 h-10 rounded-xl"
                    : "w-full px-3 py-2.5 rounded-xl"
                } ${
                  pathname === "/scan"
                    ? "bg-white/25 ring-2 ring-white/40"
                    : "bg-white/15 hover:bg-white/25"
                }`}
              >
                <ScanLine size={18} />
                {showLabels && <span>Scan Absensi</span>}
              </Link>

              <Link
                href="/scan-kegiatan-siswa"
                title={collapsed ? "Scan Siswa" : undefined}
                className={`hidden lg:flex items-center justify-center gap-2 font-semibold text-sm text-white transition-all ${
                  collapsed
                    ? "w-10 h-10 rounded-xl"
                    : "w-full px-3 py-2.5 rounded-xl"
                } ${
                  pathname === "/scan-kegiatan-siswa"
                    ? "bg-emerald-400/30 ring-2 ring-emerald-300/40"
                    : "bg-emerald-500/25 hover:bg-emerald-500/35"
                }`}
              >
                <ScanLine size={18} />
                {showLabels && <span>Scan Siswa</span>}
              </Link>

              {/* Mobile */}
              <Link
                href="/scan"
                className={`lg:hidden flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-sm text-white ${
                  pathname === "/scan"
                    ? "bg-indigo-700"
                    : "bg-gradient-to-r from-indigo-600 to-indigo-700"
                }`}
              >
                <ScanLine size={18} />
                <span>Scan Absensi</span>
              </Link>

              <Link
                href="/scan-kegiatan-siswa"
                className={`lg:hidden flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-sm text-white ${
                  pathname === "/scan-kegiatan-siswa"
                    ? "bg-emerald-700"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600"
                }`}
              >
                <ScanLine size={18} />
                <span>Scan Siswa</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── Profil user — bottom of sidebar ── */}
        {hasProfil && (
          <div className="shrink-0 p-2 border-t border-gray-100 dark:border-gray-800 lg:border-white/10">
            <Link
              href="/profil"
              title={collapsed ? "Profil Saya" : undefined}
              className={`flex items-center gap-3 rounded-xl transition-all duration-200 ${
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
              } ${
                isProfilActive
                  ? "bg-white/20 text-white ring-1 ring-white/25 shadow-md lg:bg-white/20 lg:text-white bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600"
                  : "text-indigo-100/85 hover:bg-white/10 hover:text-white lg:text-indigo-100/85 lg:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:text-indigo-600"
              }`}
            >
              {/* Avatar inisial */}
              <div
                className={`shrink-0 flex items-center justify-center rounded-lg font-bold text-xs ${
                  collapsed ? "w-8 h-8" : "w-8 h-8"
                } ${
                  isProfilActive
                    ? "bg-white/30 text-white"
                    : "bg-white/20 text-white lg:bg-white/20 lg:text-white bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300"
                }`}
              >
                {inisial || <UserCircle2 size={16} />}
              </div>

              {showLabels && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">
                    {userName || "Profil Saya"}
                  </p>
                  <p
                    className={`text-[11px] truncate ${
                      isProfilActive
                        ? "text-white/70 lg:text-white/70 text-indigo-400"
                        : "text-indigo-200/60 lg:text-indigo-200/60 text-gray-400"
                    }`}
                  >
                    Lihat & edit profil
                  </p>
                </div>
              )}

              {showLabels && isProfilActive && (
                <ChevronRight size={14} className="opacity-70 shrink-0" />
              )}
            </Link>
          </div>
        )}

        {/* Footer */}
        {showLabels && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 lg:border-white/10">
            <p className="text-[10px] text-center text-gray-400 lg:text-indigo-200/50">
              © EduPresence · SMP POMOSDA · 2026
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
