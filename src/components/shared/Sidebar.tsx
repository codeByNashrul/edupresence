"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const menuAdmin = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Guru", href: "/guru" },
  { label: "Staff", href: "/staff" },
  { label: "Kelas", href: "/kelas" },
  { label: "Ruangan", href: "/ruangan" },
  { label: "Jadwal", href: "/jadwal" },
  { label: "Pengaturan", href: "/pengaturan" },
];

const menuPimpinan = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jadwal", href: "/jadwal" },
  { label: "Laporan", href: "/laporan" },
];

const menuGuru = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jadwal Saya", href: "/jadwal" },
  { label: "Scan Absen", href: "/scan" },
  { label: "Riwayat", href: "/riwayat" },
];

const menuStaff = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Scan Absen", href: "/scan" },
  { label: "Riwayat", href: "/riwayat" },
];

const menuMap: Record<string, typeof menuAdmin> = {
  ADMIN: menuAdmin,
  PIMPINAN: menuPimpinan,
  GURU: menuGuru,
  STAFF: menuStaff,
};

interface SidebarProps {
  role: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
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
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
    fixed top-0 left-0 h-full z-30 w-56 p-4
    bg-white dark:bg-gray-900
    border-r border-gray-200 dark:border-gray-700
    transition-transform duration-300
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
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
            <div>
              <h1 className="text-l font-bold text-indigo-600">SMP POMOSDA</h1>
              <p className="text-muted text-xs mt-0.5">School Management</p>
            </div>
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
          {menu
            .filter((item) => item.href !== "/scan")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                  pathname === item.href
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600"
                    : "text-secondary hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        {/* Tombol Scan Absensi */}
        {menu.some((item) => item.href === "/scan") && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/scan"
              className={`block text-center px-4 py-3 rounded-full text-sm font-semibold transition ${
                pathname === "/scan"
                  ? "bg-indigo-700 text-white"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Scan Absensi
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
