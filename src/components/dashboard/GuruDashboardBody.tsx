"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Clock,
  GraduationCap,
  MapPin,
  ScanLine,
  School,
  ArrowRight,
} from "lucide-react";
import { ProgressRing, StatCard, StatusBadge } from "./dashboard-widgets";

export interface JadwalItem {
  id: string;
  jamMulai: string;
  jamSelesai: string;
  mapel: string;
  kelas: string;
  ruangan: string;
  status: string;
  waktuScan?: string | null;
}

export interface TargetAbsensi {
  jadwalId?: string;
  tipe: string;
  label: string;
  detail: string;
  status: string;
}

function pct(hadir: number, total: number) {
  if (total === 0) return 0;
  return Math.round((hadir / total) * 100);
}

function parseJamMenit(jam: string) {
  const [h, m] = jam.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function findSlotAktif(jadwal: JadwalItem[], isHariIni: boolean) {
  if (!jadwal.length || !isHariIni) return null;

  const menit = new Date().getHours() * 60 + new Date().getMinutes();
  const sorted = [...jadwal].sort(
    (a, b) => parseJamMenit(a.jamMulai) - parseJamMenit(b.jamMulai),
  );

  const berlangsung = sorted.find(
    (j) =>
      parseJamMenit(j.jamMulai) <= menit &&
      parseJamMenit(j.jamSelesai) >= menit,
  );
  if (berlangsung) return { mode: "berlangsung" as const, jadwal: berlangsung };

  const berikutnya = sorted.find((j) => parseJamMenit(j.jamMulai) > menit);
  if (berikutnya) return { mode: "berikutnya" as const, jadwal: berikutnya };

  const terakhir = sorted[sorted.length - 1];
  if (parseJamMenit(terakhir.jamSelesai) < menit) {
    return { mode: "selesai" as const, jadwal: terakhir };
  }

  return null;
}

export function GuruDashboardBody({
  jadwal,
  targets,
  isToday,
}: {
  jadwal: JadwalItem[];
  targets: TargetAbsensi[];
  isToday: boolean;
}) {
  const slotMengajar = jadwal.length;
  const STATUS_SUDAH_TERCATAT = [
    "HADIR",
    "TERLAMBAT",
    "IZIN",
    "SAKIT",
    "ALPHA",
  ];

  const slotSudahScan = jadwal.filter((j) =>
    STATUS_SUDAH_TERCATAT.includes(j.status),
  ).length;
  const slotBelum = slotMengajar - slotSudahScan;
  const slotAktif = findSlotAktif(jadwal, isToday);
  const targetMengajar = targets.filter((t) => t.tipe === "JAM_MENGAJAR");
  const kelasUnik = new Set(jadwal.map((j) => j.kelas)).size;

  return (
    <div className="space-y-6">
      {slotAktif && isToday && (
        <div
          className={`rounded-2xl border p-5 shadow-sm ${
            slotAktif.mode === "berlangsung"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
              : slotAktif.mode === "berikutnya"
                ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50"
                : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            {slotAktif.mode === "berlangsung"
              ? "Sedang mengajar"
              : slotAktif.mode === "berikutnya"
                ? "Kelas berikutnya"
                : "Jadwal hari ini selesai"}
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {slotAktif.jadwal.mapel}
              </p>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
                <Clock size={14} />
                {slotAktif.jadwal.jamMulai} – {slotAktif.jadwal.jamSelesai}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <GraduationCap size={14} />
                  {slotAktif.jadwal.kelas}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {slotAktif.jadwal.ruangan}
                </span>
              </div>
            </div>
            <StatusBadge status={slotAktif.jadwal.status} />
          </div>
          {slotAktif.mode !== "selesai" &&
            slotAktif.jadwal.status === "BELUM" && (
              <Link
                href="/scan"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Scan QR di ruangan
                <ArrowRight size={14} />
              </Link>
            )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Jam Mengajar"
          value={slotMengajar}
          sub="Slot hari ini"
          icon={BookOpen}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/25"
          accent="text-indigo-200"
        />
        <StatCard
          label="Sudah Tercatat"
          value={slotSudahScan}
          sub={`${pct(slotSudahScan, slotMengajar || 1)}% selesai`}
          icon={CheckCircle2}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
          accent="text-emerald-100"
        />
        <StatCard
          label="Belum Tercatat"
          value={slotBelum}
          sub="Belum ada status absensi"
          icon={CircleDashed}
          gradient="bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/25"
          accent="text-slate-200"
        />
        <StatCard
          label="Kelas Diajar"
          value={kelasUnik}
          sub="Kelas berbeda"
          icon={School}
          gradient="bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/25"
          accent="text-violet-200"
        />
      </div>

      {slotMengajar > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />
                Kehadiran Mengajar
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Scan QR di setiap ruangan sesuai jadwal
              </p>
            </div>
            <Link
              href="/jadwal"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Jadwal lengkap
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex justify-center">
            <ProgressRing
              label="Mengajar"
              value={slotSudahScan}
              total={slotMengajar}
              color="#22c55e"
            />
          </div>
        </div>
      )}

      {targetMengajar.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-950/20">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
              <ScanLine size={16} className="text-amber-600" />
              Checklist Absen per Jam
            </h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {targetMengajar.map((item, i) => (
              <li
                key={i}
                className="px-5 py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {item.detail}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
