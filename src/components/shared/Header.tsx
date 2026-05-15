"use client";

import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

interface Props {
  user: {
    name?: string | null;
    role?: string | null;
  };
  onMenuClick: () => void;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Administrator",
  PIMPINAN: "Kepala Sekolah / TU",
  GURU: "Guru",
  STAFF: "Staff",
};

export default function Header({ user, onMenuClick }: Props) {
  return (
    <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl p-1"
      >
        ☰
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
            {user.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {roleLabel[user.role ?? ""] ?? user.role}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-red-500 hover:text-red-600 font-medium"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
