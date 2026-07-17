"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { Menu, LogOut, CalendarDays, Clock } from "lucide-react";

interface Props {
  onMenuClick: () => void;
}

function formatHeaderDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHeaderTime(date: Date) {
  return date.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Header({ onMenuClick }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(new Date());

    const initialTimer = window.setTimeout(updateNow, 0);
    const intervalTimer = window.setInterval(updateNow, 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 shrink-0">
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 dark:from-indigo-950 dark:via-indigo-900 dark:to-violet-950 lg:rounded-none">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:18px_18px]" />
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10 hidden lg:block" />

        <div className="relative px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          {/* Hamburger mobile */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onMenuClick}
              className="p-2.5 rounded-xl text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition lg:hidden"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Tanggal & jam — desktop tengah */}
          {now && (
            <div className="hidden lg:flex flex-col items-center text-center px-4 flex-1 min-w-0">
              <p className="text-xs font-medium text-indigo-100/90 flex items-center gap-1.5">
                <CalendarDays size={13} />
                <span className="capitalize">{formatHeaderDate(now)}</span>
              </p>
              <p className="text-lg font-bold text-white tabular-nums tracking-wide flex items-center gap-1.5 mt-0.5">
                <Clock size={16} className="text-indigo-200" />
                {formatHeaderTime(now)} WIB
              </p>
            </div>
          )}

          {/* Kanan: tanggal mobile + theme toggle + keluar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Tanggal & jam — mobile */}
            {now && (
              <div className="lg:hidden flex flex-col items-end text-right mr-1">
                <p className="text-[10px] text-indigo-100/90 capitalize leading-tight">
                  {now.toLocaleDateString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="text-sm font-bold text-white tabular-nums">
                  {formatHeaderTime(now)} WIB
                </p>
              </div>
            )}

            <div className="p-0.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <ThemeToggle variant="header" />
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 px-3 py-2.5 rounded-xl text-sm font-semibold transition backdrop-blur-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
