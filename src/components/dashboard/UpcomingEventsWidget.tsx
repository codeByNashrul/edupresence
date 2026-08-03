"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Flag,
  BookOpen,
  GraduationCap,
  PartyPopper,
  Layers,
  ArrowRight,
  Loader2,
  CircleDashed,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TipeKalender =
  "LIBUR_NASIONAL" | "LIBUR_SEKOLAH" | "UJIAN" | "KEGIATAN" | "SEMESTER";

interface KalenderEvent {
  id: string;
  judul: string;
  tipe: TipeKalender;
  tanggalMulai: string;
  tanggalSelesai: string;
}

// ─── Tipe config (mirror dari kalender-akademik page) ─────────────────────────
const TIPE_CONFIG: Record<
  TipeKalender,
  {
    label: string;
    color: string;
    bg: string;
    dot: string;
    icon: React.ElementType;
  }
> = {
  LIBUR_NASIONAL: {
    label: "Libur Nasional",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    dot: "bg-red-500",
    icon: Flag,
  },
  LIBUR_SEKOLAH: {
    label: "Libur Sekolah",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    dot: "bg-orange-500",
    icon: BookOpen,
  },
  UJIAN: {
    label: "Ujian",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    dot: "bg-violet-500",
    icon: GraduationCap,
  },
  KEGIATAN: {
    label: "Kegiatan Sekolah",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    dot: "bg-emerald-500",
    icon: PartyPopper,
  },
  SEMESTER: {
    label: "Semester",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    dot: "bg-indigo-500",
    icon: Layers,
  },
};

// Tipe yang ditampilkan untuk Guru (semua akademik — sesuai diskusi)
const TIPE_GURU: TipeKalender[] = [
  "LIBUR_NASIONAL",
  "LIBUR_SEKOLAH",
  "UJIAN",
  "KEGIATAN",
  "SEMESTER",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSingkat(iso: string): string {
  return dateFromIsoDate(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function hariLagi(iso: string): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const target = dateFromIsoDate(iso);

  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function labelHariLagi(iso: string): { text: string; urgent: boolean } {
  const hari = hariLagi(iso);
  if (hari < 0) return { text: "Berlangsung", urgent: true };
  if (hari === 0) return { text: "Hari ini", urgent: true };
  if (hari === 1) return { text: "Besok", urgent: true };
  if (hari <= 7) return { text: `${hari} hari lagi`, urgent: true };
  return { text: `${hari} hari lagi`, urgent: false };
}

function getDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function dateFromIsoDate(iso: string): Date {
  return new Date(`${getDateKey(iso)}T12:00:00`);
}

function endOfDateFromIso(iso: string): Date {
  return new Date(`${getDateKey(iso)}T23:59:59`);
}

// ─── Sidebar Variant (Admin & Pimpinan — masuk ke CalendarPanel) ───────────────
export function UpcomingEventsSidebar() {
  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      try {
        const tahun = new Date().getFullYear();
        const res = await fetch(`/api/kalender-akademik?tahun=${tahun}`);
        const data = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming: KalenderEvent[] = (Array.isArray(data) ? data : [])
          .filter((e: KalenderEvent) => {
            const selesai = new Date(e.tanggalSelesai);
            return selesai >= today;
          })
          .sort(
            (a: KalenderEvent, b: KalenderEvent) =>
              new Date(a.tanggalMulai).getTime() -
              new Date(b.tanggalMulai).getTime(),
          )
          .slice(0, 4);

        setEvents(upcoming);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  return (
    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <CalendarDays size={14} className="text-indigo-500" />
          Event Mendatang
        </h3>
        <Link
          href="/kalender-akademik"
          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
        >
          Lihat semua <ArrowRight size={10} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-indigo-400" />
        </div>
      ) : events.length === 0 ? (
        <div className="py-4 text-center">
          <CircleDashed
            size={22}
            className="mx-auto text-gray-300 dark:text-gray-600 mb-1.5"
          />
          <p className="text-xs text-gray-400">Tidak ada event mendatang</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => {
            const cfg = TIPE_CONFIG[e.tipe];
            const Icon = cfg.icon;
            const { text: hariText, urgent } = labelHariLagi(e.tanggalMulai);

            return (
              <li
                key={e.id}
                className="flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}
                >
                  <Icon size={13} className={cfg.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-snug">
                    {e.judul}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatSingkat(e.tanggalMulai)}
                  </p>
                </div>

                {/* Hari lagi badge */}
                <span
                  className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                    urgent
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {hariText}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Inline Variant (Guru — di main content antara absensi dan jadwal) ──────────
export function UpcomingEventsInline() {
  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      try {
        const tahun = new Date().getFullYear();
        const res = await fetch(`/api/kalender-akademik?tahun=${tahun}`);
        const data = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming: KalenderEvent[] = (Array.isArray(data) ? data : [])
          .filter((e: KalenderEvent) => {
            const selesai = endOfDateFromIso(e.tanggalSelesai);
            return selesai >= today && TIPE_GURU.includes(e.tipe);
          })
          .sort(
            (a: KalenderEvent, b: KalenderEvent) =>
              new Date(a.tanggalMulai).getTime() -
              new Date(b.tanggalMulai).getTime(),
          )
          .slice(0, 5);

        setEvents(upcoming);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  if (!loading && events.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/30">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CalendarDays size={18} className="text-indigo-600" />
          Event Akademik Mendatang
        </h2>
        <Link
          href="/kalender-akademik"
          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
        >
          Lihat kalender <ArrowRight size={12} />
        </Link>
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {events.map((e) => {
            const cfg = TIPE_CONFIG[e.tipe];
            const Icon = cfg.icon;
            const { text: hariText, urgent } = labelHariLagi(e.tanggalMulai);
            const mulai = dateFromIsoDate(e.tanggalMulai);

            const selesai = dateFromIsoDate(e.tanggalSelesai);
            const multiDay = mulai.toDateString() !== selesai.toDateString();

            return (
              <div
                key={e.id}
                className={`relative rounded-xl border p-3.5 flex flex-col gap-2 transition-all hover:shadow-md ${
                  urgent
                    ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"
                }`}
              >
                {/* Tipe + badge */}
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}
                  >
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      urgent
                        ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {hariText}
                  </span>
                </div>

                {/* Judul */}
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                  {e.judul}
                </p>

                {/* Tanggal */}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-auto">
                  {multiDay
                    ? `${formatSingkat(e.tanggalMulai)} – ${formatSingkat(e.tanggalSelesai)}`
                    : formatSingkat(e.tanggalMulai)}
                </p>

                {/* Tipe label */}
                <span
                  className={`self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}
                >
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
