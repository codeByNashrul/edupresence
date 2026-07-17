"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  UserCheck,
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  GraduationCap,
  TrendingUp,
  ChevronRight,
  School,
  CalendarDays,
  ArrowRight,
  Loader2,
  Flag,
  BookOpen,
  PartyPopper,
  Layers,
} from "lucide-react";
import {
  UpcomingEventsSidebar,
  UpcomingEventsInline,
} from "@/components/dashboard/UpcomingEventsWidget";

interface SiswaInfo {
  id: string;
  nama: string;
  nis: string;
  jenisKelamin: string;
  kelas: { nama: string; tingkat: string };
}

interface RingkasanAbsensi {
  hadir: number;
  terlambat: number;
  tidakHadir: number;
}

interface RekapTerbaru {
  mingguKe: number;
  apnMingguIni: number;
  appMingguIni: number;
  sisaApMingguIni: number;
  apnTotal: number;
  appTotal: number;
  sisaApTotal: number;
  tanggalMulai: string;
  tanggalAkhir: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}
    >
      <div className="absolute -right-3 -top-3 opacity-20">
        <Icon size={72} strokeWidth={1.5} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon size={18} />
          </span>
          <p className="text-sm font-medium text-white/90">{label}</p>
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className={`text-xs mt-1.5 font-medium ${accent}`}>{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
  );
}

function formatTanggal(tanggal: string) {
  return new Date(tanggal).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Tipe config (sama dengan widget) ─────────────────────────────────────────
const TIPE_DOT: Record<string, string> = {
  LIBUR_NASIONAL: "bg-red-500",
  LIBUR_SEKOLAH: "bg-orange-500",
  UJIAN: "bg-violet-500",
  KEGIATAN: "bg-emerald-500",
  SEMESTER: "bg-indigo-500",
};

// ─── CalendarPanel dengan dot event ───────────────────────────────────────────
function CalendarPanel() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const monthLabel = today.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const [kalenderEvents, setKalenderEvents] = useState<
    { tanggalMulai: string; tanggalSelesai: string; tipe: string }[]
  >([]);

  useEffect(() => {
    async function fetchKalender() {
      try {
        const res = await fetch(`/api/kalender-akademik?tahun=${year}`);
        const data = await res.json();
        setKalenderEvents(Array.isArray(data) ? data : []);
      } catch {
        setKalenderEvents([]);
      }
    }
    fetchKalender();
  }, [year]);

  function getDotsForDay(day: number) {
    const date = new Date(year, month, day);
    date.setHours(12, 0, 0, 0);
    const events = kalenderEvents.filter((e) => {
      const mulai = new Date(e.tanggalMulai);
      const selesai = new Date(e.tanggalSelesai);
      mulai.setHours(0, 0, 0, 0);
      selesai.setHours(23, 59, 59, 999);
      return date >= mulai && date <= selesai;
    });
    return [...new Map(events.map((e) => [e.tipe, e])).values()].slice(0, 2);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">
        Kalender
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {monthLabel}
      </p>

      <div className="grid grid-cols-7 gap-2 text-center text-xs mb-3">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
          <span key={d} className="text-gray-400 font-semibold">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {days.map((day, i) =>
          day ? (
            <div
              key={i}
              className={`relative flex flex-col items-center justify-start pt-1 pb-1 gap-0.5 aspect-square rounded-xl text-sm ${
                day === today.getDate()
                  ? "bg-indigo-600 text-white font-bold"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span>{day}</span>
              {(() => {
                const dots = getDotsForDay(day);
                return dots.length > 0 ? (
                  <div className="flex gap-0.5 justify-center">
                    {dots.map((e, di) => (
                      <span
                        key={di}
                        className={`w-1 h-1 rounded-full ${
                          day === today.getDate()
                            ? "bg-white/80"
                            : (TIPE_DOT[e.tipe] ?? "bg-gray-400")
                        }`}
                      />
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div key={i} />
          ),
        )}
      </div>

      {/* Event Mendatang */}
      <UpcomingEventsSidebar />

      {/* Pengumuman */}
      <PengumumanTerbaru />
    </div>
  );
}

// ─── Pengumuman (dipindah ke dalam CalendarPanel) ─────────────────────────────
function PengumumanTerbaru() {
  const [data, setData] = useState<
    { id: string; judul: string; isi: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/ortu/pengumuman");
      const json = await res.json();
      setData(Array.isArray(json) ? json.slice(0, 3) : []);
    }
    load();
  }, []);

  return (
    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">
        Pengumuman Terbaru
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">Belum ada pengumuman.</p>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-3"
            >
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {item.judul}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {item.isi}
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                {new Date(item.createdAt).toLocaleDateString("id-ID")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrtuDashboardPage() {
  const { data: session } = useSession();

  const [siswa, setSiswa] = useState<SiswaInfo | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanAbsensi | null>(null);
  const [rekap, setRekap] = useState<RekapTerbaru | null>(null);
  const [loading, setLoading] = useState(true);

  const bulan = new Date().getMonth() + 1;
  const tahun = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      try {
        const [siswaRes, absenRes, rekapRes] = await Promise.all([
          fetch("/api/ortu/siswa"),
          fetch(`/api/ortu/absensi?bulan=${bulan}&tahun=${tahun}`),
          fetch("/api/ortu/pelanggaran?limit=1"),
        ]);
        const siswaData = await siswaRes.json();
        const absenData = await absenRes.json();
        const rekapData = await rekapRes.json();
        setSiswa(siswaData);
        setRingkasan(absenData.ringkasan ?? null);
        setRekap(
          Array.isArray(rekapData) && rekapData.length > 0
            ? rekapData[0]
            : null,
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bulan, tahun]);

  const userName = session?.user?.name ?? "Orang Tua";
  const totalAbsensi = ringkasan
    ? ringkasan.hadir + ringkasan.terlambat + ringkasan.tidakHadir
    : 0;
  const pctHadir =
    totalAbsensi > 0
      ? Math.round(
          (((ringkasan?.hadir ?? 0) + (ringkasan?.terlambat ?? 0)) /
            totalAbsensi) *
            100,
        )
      : 0;
  const bulanLabel = new Date(tahun, bulan - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6 min-w-0">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-xl shadow-indigo-500/20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white" />
            <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-white" />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-medium">
              {getGreeting()},
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">
              {userName}
            </h1>
            {loading ? (
              <div className="mt-3 h-5 w-48 rounded-full bg-white/20 animate-pulse" />
            ) : siswa ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                  <School size={16} className="text-indigo-200" />
                  <div>
                    <p className="text-xs text-indigo-200">Nama Siswa</p>
                    <p className="font-semibold text-sm">{siswa.nama}</p>
                  </div>
                </span>
                <span className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                  <GraduationCap size={16} className="text-indigo-200" />
                  <div>
                    <p className="text-xs text-indigo-200">Kelas</p>
                    <p className="font-semibold text-sm">{siswa.kelas.nama}</p>
                  </div>
                </span>
                <span className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                  <UserCheck size={16} className="text-indigo-200" />
                  <div>
                    <p className="text-xs text-indigo-200">NIS</p>
                    <p className="font-semibold text-sm">{siswa.nis}</p>
                  </div>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Absensi */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              Absensi — {bulanLabel}
            </h2>
            <Link
              href="/ortu/absensi"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline"
            >
              Lihat semua <ChevronRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard
                label="Hadir"
                value={ringkasan?.hadir ?? 0}
                sub={`${pctHadir}% kehadiran bulan ini`}
                icon={CheckCircle2}
                gradient="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                accent="text-emerald-100"
              />
              <StatCard
                label="Terlambat"
                value={ringkasan?.terlambat ?? 0}
                sub="Hari masuk tapi terlambat"
                icon={AlertCircle}
                gradient="bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25"
                accent="text-amber-100"
              />
              <StatCard
                label="Tidak Hadir"
                value={ringkasan?.tidakHadir ?? 0}
                sub="Alpha / tidak masuk"
                icon={CircleDashed}
                gradient="bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25"
                accent="text-rose-100"
              />
            </div>
          )}
        </div>

        {/* ── Event Akademik Mendatang ── */}
        <UpcomingEventsInline />

        {/* Rekap Pelanggaran */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-950/20">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp size={18} className="text-rose-500" />
              Rekap Pelanggaran Terbaru
            </h2>
            <Link
              href="/ortu/pelanggaran"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline"
            >
              Lihat semua <ChevronRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          ) : rekap ? (
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Minggu ke-{rekap.mingguKe}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {formatTanggal(rekap.tanggalMulai)} –{" "}
                    {formatTanggal(rekap.tanggalAkhir)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Sisa APN Total</p>
                  <p className="text-3xl font-black text-rose-600">
                    {rekap.sisaApTotal}
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4">
                  <p className="text-xs text-rose-500 font-semibold">
                    APN Minggu Ini
                  </p>
                  <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
                    {rekap.apnMingguIni}
                  </p>
                </div>
                <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-4">
                  <p className="text-xs text-green-500 font-semibold">
                    APP Minggu Ini
                  </p>
                  <p className="text-2xl font-black text-green-700 dark:text-green-300 mt-1">
                    {rekap.appMingguIni}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4">
                  <p className="text-xs text-amber-500 font-semibold">
                    Sisa APN Minggu Ini
                  </p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                    {rekap.sisaApMingguIni}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">
              Belum ada rekap pelanggaran terbaru.
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-6">
        <CalendarPanel />
      </aside>
    </div>
  );
}
