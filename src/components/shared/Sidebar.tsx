"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
  GraduationCap,
  ClipboardList,
  FileBarChart2,
  NotebookPen,
} from "lucide-react";

const menuAdmin = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Guru", href: "/guru" },
  { label: "Staff", href: "/staff" },
  { label: "Kelas", href: "/kelas" },
  { label: "Siswa", href: "/siswa" },
  { label: "Kegiatan Siswa", href: "/kegiatan-siswa" },
  { label: "Scan Absensi", href: "/scan" },
  { label: "Ruangan", href: "/ruangan" },
  { label: "Jadwal Mata Pelajaran", href: "/jadwal" },
  { label: "Laporan Absensi", href: "/laporan" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
  { label: "Pengaturan", href: "/pengaturan" },
];

const menuPimpinan = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jadwal Mata Pelajaran", href: "/jadwal" },
  { label: "Laporan Absensi", href: "/laporan" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
  { label: "Catatan Harian Staff", href: "/catatan-harian/monitor" },
];

const menuGuru = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jadwal Mata Pelajaran", href: "/jadwal" },
  { label: "Scan Absensi", href: "/scan" },
  { label: "Riwayat", href: "/riwayat" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
];

const menuStaff = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Scan Absensi", href: "/scan" },
  { label: "Catatan Harian", href: "/catatan-harian" },
  { label: "Riwayat", href: "/riwayat" },
  { label: "Laporan Kegiatan Siswa", href: "/laporan-kegiatan-siswa" },
];

const menuMap: Record<string, typeof menuAdmin> = {
  ADMIN: menuAdmin,
  PIMPINAN: menuPimpinan,
  GURU: menuGuru,
  STAFF: menuStaff,
};

const iconMap: Record<string, any> = {
  "/dashboard": LayoutDashboard,
  "/guru": Users,
  "/staff": UserCheck,
  "/kelas": School,
  "/ruangan": DoorOpen,
  "/jadwal": CalendarDays,
  "/laporan": FileText,
  "/pengaturan": Settings,
  "/scan": ScanLine,
  "/riwayat": History,
  "/siswa": GraduationCap,
  "/kegiatan-siswa": ClipboardList,
  "/laporan-kegiatan-siswa": FileBarChart2,
  "/catatan-harian": NotebookPen,
  "/catatan-harian/monitor": NotebookPen,
};
interface SidebarProps {
  role: string;
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

export default function Sidebar({
  role,
  isOpen,
  isCollapsed,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const menu = menuMap[role] ?? menuGuru;

  // Tutup sidebar saat navigasi
  useEffect(() => {
    onClose();
  }, [pathname]);

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
    fixed top-0 left-0 h-full z-40 p-4
    bg-white dark:bg-gray-900
    border-r border-gray-200 dark:border-gray-700
    transition-all duration-300
    w-72
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
    ${isCollapsed ? "lg:w-20" : "lg:w-56"}
    lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto lg:h-screen
  `}
      >
        {/* Logo & Nama Sekolah */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo EduPresence"
              className="w-12 h-12 object-contain"
            />
            {(!isCollapsed || isOpen) && (
              <div>
                <h1 className="text-l font-bold text-indigo-600">
                  SMP POMOSDA
                </h1>
                <p className="text-muted text-xs mt-0.5">School Management</p>
              </div>
            )}
          </div>

          {/* Tombol tutup — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Menu navigasi */}
        <nav className="space-y-1">
          <div>
            {(!isCollapsed || isOpen) && (
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                Menu
              </p>
            )}
          </div>
          {menu
            .filter((item) => item.href !== "/scan")
            .map((item) => {
              const Icon = iconMap[item.href];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === item.href
                      ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600"
                      : "text-secondary hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {Icon && <Icon size={18} />}
                  {!isCollapsed && <span>{item.label}</span>}{" "}
                </Link>
              );
            })}
        </nav>

        {/* Tombol Scan Absensi */}
        {menu.some((item) => item.href === "/scan") && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3">
                Menu Scan
              </p>
            </div>
            <Link
              href="/scan"
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-semibold transition ${
                pathname === "/scan"
                  ? "bg-indigo-700 text-white"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              <ScanLine size={18} />
              {(!isCollapsed || isOpen) && <span>Scan Absensi</span>}
            </Link>

            {/* <Link
              href="/scan-siswa"
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-semibold transition ${
                pathname === "/scan-siswa"
                  ? "bg-green-700 text-white"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <ScanLine size={18} />
              {(!isCollapsed || isOpen) && <span>Scan Siswa</span>}
            </Link> */}

            <Link
              href="/scan-kegiatan-siswa"
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-semibold transition ${
                pathname === "/scan-kegiatan-siswa"
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              <ScanLine size={18} />
              {(!isCollapsed || isOpen) && <span>Scan Siswa</span>}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
