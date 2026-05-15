"use client";

import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { Menu, LogOut, UserCircle } from "lucide-react";

interface Props {
  user: {
    name?: string | null;
    role?: string | null;
  };
  onMenuClick: () => void;
  onDesktopMenuClick?: () => void;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Administrator",
  PIMPINAN: "Kepala Sekolah / TU",
  GURU: "Guru",
  STAFF: "Staff",
};

export default function Header({
  user,
  onMenuClick,
  onDesktopMenuClick,
}: Props) {
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-lg"
      >
        <Menu size={22} />
      </button>

      <button
        onClick={onDesktopMenuClick}
        className="hidden lg:flex text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Menu size={22} />
      </button>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5">
          <UserCircle size={28} className="text-indigo-600" />

          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {user.name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {roleLabel[user.role ?? ""] ?? user.role}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950 px-3 py-2 rounded-lg text-sm font-semibold transition"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
