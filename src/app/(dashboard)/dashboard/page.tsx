"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Users,
  UserCheck,
  GraduationCap,
  School,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  BookOpen,
  ScanLine,
  NotebookPen,
  Sun,
  Sunset,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  ArrowRight,
} from "lucide-react";
import { GuruDashboardBody } from "@/components/dashboard/GuruDashboardBody";
import { PelanggaranDashboardSection } from "@/components/dashboard/PelanggaranDashboardSection";
import {
  UpcomingEventsSidebar,
  UpcomingEventsInline,
} from "@/components/dashboard/UpcomingEventsWidget";

interface JadwalItem {
  id: string;
  jamMulai: string;
  jamSelesai: string;
  guru: string;
  guruId: string;
  noWa?: string;
  mapel: string;
  kelas: string;
  ruangan: string;
  status: string;
  waktuScan?: string | null;
}

interface DashboardData {
  totalGuru: number;
  totalStaff: number;
  totalSiswa: number;
  guruHadir: number;
  guruTerlambat: number;
  guruTidakHadir: number;
  staffHadir: number;
  staffTerlambat: number;
  staffTidakHadir: number;
  siswaHadir: number;
  siswaTerlambat: number;
  siswaTidakHadir: number;
  jadwal: JadwalItem[];
}

interface PengumumanItem {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
  pembuat?: { nama: string };
}

interface TargetAbsensi {
  jadwalId?: string;
  tipe: string;
  label: string;
  detail: string;
  status: string;
  waktuScan: string | null;
  ruangan: string | null;
}

interface CatatanHarian {
  id: string;
  tanggal: string;
  kegiatan: string;
  hasil: string;
  kendala: string | null;
  foto: string[];
}

const CHART_COLORS = {
  guru: "#6366f1",
  staff: "#8b5cf6",
  hadir: "#22c55e",
  terlambat: "#f59e0b",
  belum: "#cbd5e1",
};

const PIE_COLORS = ["#6366f1", "#a78bfa", "#f43f5e"];

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);
  return days;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function formatTanggalPanjang(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function pct(hadir: number, total: number) {
  if (total === 0) return 0;
  return Math.round((hadir / total) * 100);
}

// ─── Stat Card (sama seperti admin) ───────────────────────────────────────────
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

// ─── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = pct(value, total);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-100 dark:text-gray-700"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {percent}%
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-2">
        {label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {value} / {total} hadir
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800 lg:col-span-1" />
        <div className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800 lg:col-span-2" />
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-gray-600 dark:text-gray-300">
          <span
            className="inline-block w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      className: string;
      icon: React.ElementType;
    }
  > = {
    HADIR: {
      label: "Hadir",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
      icon: CheckCircle2,
    },

    TERLAMBAT: {
      label: "Terlambat",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
      icon: AlertCircle,
    },

    IZIN: {
      label: "Izin",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
      icon: AlertCircle,
    },

    SAKIT: {
      label: "Sakit",
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
      icon: AlertCircle,
    },

    ALPHA: {
      label: "Alpha",
      className: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
      icon: AlertCircle,
    },

    BELUM: {
      label: "Belum Absen",
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      icon: CircleDashed,
    },
  };

  const c = config[status] ?? config.BELUM;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.className}`}
    >
      <Icon size={13} />
      {c.label}
    </span>
  );
}

// Ganti seluruh fungsi CalendarPanel dengan ini
// Tambahkan import UpcomingEventsSidebar dari UpcomingEventsWidget
// dan pastikan import { useEffect } sudah ada di bagian atas file

function CalendarPanel({
  selectedDate,
  onSelectDate,
  pengumuman,
  canCreatePengumuman,
  formPengumuman,
  setFormPengumuman,
  simpanPengumuman,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  pengumuman: PengumumanItem[];
  canCreatePengumuman: boolean;
  formPengumuman: { judul: string; isi: string };
  setFormPengumuman: React.Dispatch<
    React.SetStateAction<{ judul: string; isi: string }>
  >;
  simpanPengumuman: () => void;
}) {
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [kalenderEvents, setKalenderEvents] = useState<
    { tanggalMulai: string; tanggalSelesai: string; tipe: string }[]
  >([]);

  const days = useMemo(
    () => buildCalendar(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" },
  );

  // Fetch kalender akademik setiap kali tahun berubah
  useEffect(() => {
    async function fetchKalender() {
      try {
        const res = await fetch(`/api/kalender-akademik?tahun=${viewYear}`);
        const data = await res.json();
        setKalenderEvents(Array.isArray(data) ? data : []);
      } catch {
        setKalenderEvents([]);
      }
    }
    fetchKalender();
  }, [viewYear]);

  // Cek apakah suatu tanggal punya event
  function getEventOnDate(dateIso: string) {
    return kalenderEvents.filter((event) => {
      const tanggalMulai = event.tanggalMulai.slice(0, 10);
      const tanggalSelesai = event.tanggalSelesai.slice(0, 10);

      return dateIso >= tanggalMulai && dateIso <= tanggalSelesai;
    });
  }

  // Dot color per tipe
  const TIPE_DOT: Record<string, string> = {
    LIBUR_NASIONAL: "bg-red-500",
    LIBUR_SEKOLAH: "bg-orange-500",
    UJIAN: "bg-violet-500",
    KEGIATAN: "bg-emerald-500",
    SEMESTER: "bg-indigo-500",
  };

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      {/* ── Kalender ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-gray-900 dark:text-gray-100">Kalender</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Bulan sebelumnya"
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[120px] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Bulan berikutnya"
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs mb-3">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((h) => (
          <div key={h} className="text-gray-400 font-medium">
            {h}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const fullDate = new Date(viewYear, viewMonth, day);
          const iso = formatDate(fullDate);
          const active = iso === selectedDate;
          const isToday = iso === formatDate(new Date());
          const dayEvents = getEventOnDate(iso);
          // Ambil max 2 dot unik tipe
          const dots = [
            ...new Map(dayEvents.map((e) => [e.tipe, e])).values(),
          ].slice(0, 2);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(iso)}
              className={`relative flex flex-col items-center justify-start pt-1 pb-1 gap-0.5 rounded-xl text-sm font-medium transition aspect-square ${
                active
                  ? "bg-indigo-600 text-white"
                  : isToday
                    ? "border border-indigo-400 text-indigo-600 dark:text-indigo-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              <span>{day}</span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 justify-center">
                  {dots.map((e, di) => (
                    <span
                      key={di}
                      className={`w-1 h-1 rounded-full ${
                        active
                          ? "bg-white/80"
                          : (TIPE_DOT[e.tipe] ?? "bg-gray-400")
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Event Mendatang ── */}
      <UpcomingEventsSidebar />

      {/* ── Pengumuman ── */}
      <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">
          Pengumuman
        </h3>
        {canCreatePengumuman && (
          <div className="mb-4 space-y-2">
            <input
              value={formPengumuman.judul}
              onChange={(e) =>
                setFormPengumuman({ ...formPengumuman, judul: e.target.value })
              }
              placeholder="Judul pengumuman"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={formPengumuman.isi}
              onChange={(e) =>
                setFormPengumuman({ ...formPengumuman, isi: e.target.value })
              }
              placeholder="Isi pengumuman"
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={simpanPengumuman}
              className="w-full bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700"
            >
              Tambah Pengumuman
            </button>
          </div>
        )}
        <div className="space-y-3">
          {pengumuman.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada pengumuman</p>
          ) : (
            pengumuman.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3"
              >
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {item.judul}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {item.isi}
                </p>
                <p className="text-[11px] text-gray-400 mt-2">
                  {item.pembuat?.nama ?? "Admin"} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("id-ID")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Absensi Status Card (premium, setara admin StatCard) ─────────────────────
function AbsensiCard({
  title,
  target,
  icon: Icon,
  href,
}: {
  title: string;
  target: TargetAbsensi | undefined;
  icon: React.ElementType;
  href: string;
}) {
  const statusConfig: Record<
    string,
    {
      label: string;
      gradient: string;
      accent: string;
      badgeClass: string;
      statusIcon: React.ElementType;
    }
  > = {
    HADIR: {
      label: "Hadir",
      gradient:
        "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25",
      accent: "text-emerald-100",
      badgeClass: "bg-white/20",
      statusIcon: CheckCircle2,
    },
    TERLAMBAT: {
      label: "Terlambat",
      gradient:
        "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25",
      accent: "text-amber-100",
      badgeClass: "bg-white/20",
      statusIcon: AlertCircle,
    },
    BELUM: {
      label: "Belum Scan",
      gradient:
        "bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/25",
      accent: "text-slate-200",
      badgeClass: "bg-white/20",
      statusIcon: CircleDashed,
    },
  };

  const st = statusConfig[target?.status ?? "BELUM"] ?? statusConfig.BELUM;
  const StatusIcon = st.statusIcon;

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${st.gradient} transition hover:scale-[1.02] hover:shadow-xl`}
    >
      <div className="absolute -right-3 -top-3 opacity-20">
        <Icon size={72} strokeWidth={1.5} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className={`p-2 rounded-xl ${st.badgeClass} backdrop-blur-sm`}>
            <Icon size={18} />
          </span>
          <p className="text-sm font-medium text-white/90">{title}</p>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <StatusIcon size={20} />
          <p className="text-2xl font-bold tracking-tight">{st.label}</p>
        </div>
        {target?.waktuScan ? (
          <p
            className={`text-xs mt-1 font-medium flex items-center gap-1 ${st.accent}`}
          >
            <Clock size={11} />
            {new Date(target.waktuScan).toLocaleTimeString("id-ID", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        ) : (
          <p
            className={`text-xs mt-1 font-medium flex items-center gap-1.5 ${st.accent}`}
          >
            <ArrowRight size={12} />
            Tap untuk scan
          </p>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date()),
  );
  const [pengumuman, setPengumuman] = useState<PengumumanItem[]>([]);
  const [targets, setTargets] = useState<TargetAbsensi[]>([]);
  const [catatanHarian, setCatatanHarian] = useState<CatatanHarian | null>(
    null,
  );
  const [formPengumuman, setFormPengumuman] = useState({ judul: "", isi: "" });

  const role = session?.user?.role ?? "";
  const isManagement = ["ADMIN", "PIMPINAN"].includes(role);
  const isStaff = role === "STAFF";
  const isGuru = role === "GURU";
  const canScanAbsensi = isGuru || isStaff;
  const today = formatDate(new Date());
  const isToday = selectedDate === today;

  async function fetchDashboard() {
    try {
      setLoading(true);

      const [dashboardRes, pengumumanRes] = await Promise.all([
        fetch(`/api/dashboard?tanggal=${selectedDate}`, {
          cache: "no-store",
        }),
        fetch("/api/pengumuman", {
          cache: "no-store",
        }),
      ]);

      if (!dashboardRes.ok) {
        throw new Error("Gagal mengambil data dashboard");
      }

      const dashboardData = await dashboardRes.json();
      setData(dashboardData);

      if (pengumumanRes.ok) {
        const pengumumanData = await pengumumanRes.json();

        setPengumuman(Array.isArray(pengumumanData) ? pengumumanData : []);
      } else {
        setPengumuman([]);
      }

      /*
       * Endpoint target absensi hanya menggambarkan target hari ini.
       * Jangan tampilkan ketika kalender memilih tanggal lain.
       */
      if (canScanAbsensi && isToday) {
        const targetRes = await fetch("/api/absensi/target", {
          cache: "no-store",
        });

        if (targetRes.ok) {
          const targetData = await targetRes.json();

          setTargets(Array.isArray(targetData) ? targetData : []);
        } else {
          setTargets([]);
        }
      } else {
        setTargets([]);
      }

      /*
       * Catatan staff mengikuti tanggal yang sedang dipilih,
       * bukan selalu tanggal hari ini.
       */
      if (isStaff) {
        const catatanRes = await fetch(
          `/api/catatan-harian?tanggal=${selectedDate}`,
          {
            cache: "no-store",
          },
        );

        if (catatanRes.ok) {
          const catatanData = await catatanRes.json();

          setCatatanHarian(
            Array.isArray(catatanData) && catatanData.length > 0
              ? catatanData[0]
              : null,
          );
        } else {
          setCatatanHarian(null);
        }
      } else {
        setCatatanHarian(null);
      }
    } catch (error) {
      console.error("FETCH_DASHBOARD_ERROR:", error);
      setData(null);
      setTargets([]);
      setCatatanHarian(null);
    } finally {
      setLoading(false);
    }
  }

  async function simpanPengumuman() {
    if (!formPengumuman.judul || !formPengumuman.isi) return;
    await fetch("/api/pengumuman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPengumuman),
    });
    setFormPengumuman({ judul: "", isi: "" });
    fetchDashboard();
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchDashboard();
    }

    if (sessionStatus === "unauthenticated") {
      setLoading(false);
    }
  }, [sessionStatus, selectedDate, isStaff, isGuru, isManagement, isToday]);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
        <p className="text-gray-600 dark:text-gray-400">
          Gagal memuat dashboard. Silakan muat ulang halaman.
        </p>
      </div>
    );
  }

  const jadwalDashboard = Array.isArray(data.jadwal) ? data.jadwal : [];
  const jadwalPerKelas = jadwalDashboard.reduce(
    (acc, item) => {
      const kelas = item.kelas || "Tanpa Kelas";
      if (!acc[kelas]) acc[kelas] = [];
      acc[kelas].push(item);
      return acc;
    },
    {} as Record<string, JadwalItem[]>,
  );
  const kelasJadwal = Object.entries(jadwalPerKelas).sort(([a], [b]) =>
    a.localeCompare(b, "id-ID", { numeric: true }),
  );
  const slotMengajar = jadwalDashboard.length;
  const STATUS_SUDAH_TERCATAT = [
    "HADIR",
    "TERLAMBAT",
    "IZIN",
    "SAKIT",
    "ALPHA",
  ];

  const slotSudahScan = jadwalDashboard.filter((j) =>
    STATUS_SUDAH_TERCATAT.includes(j.status),
  ).length;
  const absenBerangkat = targets.find((item) => item.tipe === "BERANGKAT");
  const absenPulang = targets.find((item) => item.tipe === "PULANG");
  const userName = session?.user?.name ?? "Pengguna";

  const totalPegawai = (data.totalGuru ?? 0) + (data.totalStaff ?? 0);
  const pctGuru = pct(data.guruHadir ?? 0, data.totalGuru ?? 0);
  const pctStaff = pct(data.staffHadir ?? 0, data.totalStaff ?? 0);
  const pctSiswa = pct(data.siswaHadir ?? 0, data.totalSiswa ?? 0);

  const kehadiranData = [
    {
      name: "Guru",
      Hadir: data.guruHadir ?? 0,
      Terlambat: data.guruTerlambat ?? 0,
      Belum: data.guruTidakHadir ?? 0,
    },
    {
      name: "Staff",
      Hadir: data.staffHadir ?? 0,
      Terlambat: data.staffTerlambat ?? 0,
      Belum: data.staffTidakHadir ?? 0,
    },
    {
      name: "Siswa",
      Hadir: data.siswaHadir ?? 0,
      Terlambat: data.siswaTerlambat ?? 0,
      Belum: data.siswaTidakHadir ?? 0,
    },
  ];

  // ─── MANAGEMENT VIEW ────────────────────────────────────────────────────────
  if (isManagement) {
    const komposisiData = [
      { name: "Guru", value: data.totalGuru ?? 0 },
      { name: "Staff", value: data.totalStaff ?? 0 },
      { name: "Siswa", value: data.totalSiswa ?? 0 },
    ];
    const totalKomunitas = totalPegawai + (data.totalSiswa ?? 0);

    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 max-w-[1600px]">
        <div className="min-w-0">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 mb-6 text-white shadow-xl shadow-indigo-500/20">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white" />
              <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-white" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-indigo-200 text-sm font-medium">
                  {getGreeting()},
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">
                  {userName}
                </h1>
                <p className="text-indigo-100/90 text-sm mt-2 flex items-center gap-2 flex-wrap">
                  <CalendarDays size={14} />
                  {formatTanggalPanjang(selectedDate)}
                  {!isToday && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(today)}
                      className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full transition"
                    >
                      Kembali ke hari ini
                    </button>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <TrendingUp size={22} className="text-emerald-300 shrink-0" />
                  <div>
                    <p className="text-xs text-indigo-200">Kehadiran pegawai</p>
                    <p className="text-lg font-bold">
                      {pct(
                        (data.guruHadir ?? 0) + (data.staffHadir ?? 0),
                        totalPegawai,
                      )}
                      %
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <School size={22} className="text-rose-300 shrink-0" />
                  <div>
                    <p className="text-xs text-indigo-200">Kehadiran siswa</p>
                    <p className="text-lg font-bold">
                      {pct(data.siswaHadir ?? 0, data.totalSiswa ?? 0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <StatCard
              label="Total Guru"
              value={data.totalGuru ?? 0}
              sub="Tenaga pengajar aktif"
              icon={GraduationCap}
              gradient="bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/25"
              accent="text-indigo-200"
            />
            <StatCard
              label="Total Staff"
              value={data.totalStaff ?? 0}
              sub="Tenaga kependidikan"
              icon={Briefcase}
              gradient="bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/25"
              accent="text-violet-200"
            />
            <StatCard
              label="Total Siswa"
              value={data.totalSiswa ?? 0}
              sub="Siswa aktif terdaftar"
              icon={School}
              gradient="bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25"
              accent="text-rose-100"
            />
            <StatCard
              label="Guru Hadir"
              value={data.guruHadir ?? 0}
              sub={`${pctGuru}% dari ${data.totalGuru ?? 0} guru`}
              icon={UserCheck}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
              accent="text-emerald-100"
            />
            <StatCard
              label="Staff Hadir"
              value={data.staffHadir ?? 0}
              sub={`${pctStaff}% dari ${data.totalStaff ?? 0} staff`}
              icon={Users}
              gradient="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25"
              accent="text-sky-100"
            />
            <StatCard
              label="Siswa Hadir"
              value={data.siswaHadir ?? 0}
              sub={`${pctSiswa}% dari ${data.totalSiswa ?? 0} siswa`}
              icon={UserCheck}
              gradient="bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/25"
              accent="text-orange-100"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Guru",
                value: data.guruHadir ?? 0,
                total: data.totalGuru ?? 0,
                color: CHART_COLORS.hadir,
                icon: GraduationCap,
                iconColor: "text-indigo-600",
              },
              {
                label: "Staff",
                value: data.staffHadir ?? 0,
                total: data.totalStaff ?? 0,
                color: CHART_COLORS.staff,
                icon: Briefcase,
                iconColor: "text-violet-600",
              },
              {
                label: "Siswa",
                value: data.siswaHadir ?? 0,
                total: data.totalSiswa ?? 0,
                color: "#f43f5e",
                icon: School,
                iconColor: "text-rose-600",
              },
            ].map(({ label, value, total, color, icon: Icon, iconColor }) => (
              <div
                key={label}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Icon size={18} className={iconColor} />
                  Tingkat Kehadiran {label}
                </h2>
                <div className="flex justify-center">
                  <ProgressRing
                    label={label}
                    value={value}
                    total={total}
                    color={color}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                Komposisi Sekolah
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Guru, staff & siswa aktif
              </p>
              <div className="h-[240px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={komposisiData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {komposisiData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {totalKomunitas}
                  </span>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {komposisiData.map((item, i) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i] }}
                    />
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                Grafik Kehadiran
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Guru, staff & siswa — {formatTanggalPanjang(selectedDate)}{" "}
              </p>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kehadiranData} barGap={4}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-200 dark:stroke-gray-700"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="Hadir"
                      fill={CHART_COLORS.hadir}
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Terlambat"
                      fill={CHART_COLORS.terlambat}
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Belum"
                      fill={CHART_COLORS.belum}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <PelanggaranDashboardSection />

          {/* Jadwal */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-950/20">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock size={18} className="text-violet-600" />
                {isToday
                  ? "Jadwal Hari Ini"
                  : `Jadwal ${formatTanggalPanjang(selectedDate)}`}
              </h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                {jadwalDashboard.length} jadwal
              </span>
            </div>
            {jadwalDashboard.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays
                  size={40}
                  className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
                />
                <p className="text-gray-500">Tidak ada jadwal hari ini</p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {kelasJadwal.map(([kelas, jadwal]) => (
                  <div
                    key={kelas}
                    className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"
                  >
                    <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <GraduationCap size={17} className="text-violet-600" />
                        Kelas {kelas}
                      </h3>
                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/50 px-2.5 py-1 rounded-full">
                        {jadwal.length} jadwal
                      </span>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {jadwal.map((j) => (
                        <div
                          key={j.id}
                          className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {j.mapel}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {j.guru}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {j.ruangan}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                              <Clock size={14} />
                              {j.jamMulai} – {j.jamSelesai}
                            </div>
                            <StatusBadge status={j.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kalender mobile — hanya tampil di bawah xl */}
          <div className="block xl:hidden mt-6">
            <CalendarPanel
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              pengumuman={pengumuman}
              canCreatePengumuman={isManagement}
              formPengumuman={formPengumuman}
              setFormPengumuman={setFormPengumuman}
              simpanPengumuman={simpanPengumuman}
            />
          </div>
        </div>

        <aside className="hidden xl:block sticky top-[96px] self-start max-h-[calc(100vh-120px)] overflow-y-auto">
          <CalendarPanel
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            pengumuman={pengumuman}
            canCreatePengumuman={isManagement}
            formPengumuman={formPengumuman}
            setFormPengumuman={setFormPengumuman}
            simpanPengumuman={simpanPengumuman}
          />
        </aside>
      </div>
    );
  }

  // ─── GURU & STAFF VIEW ───────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 max-w-[1600px]">
      <div className="min-w-0">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 mb-6 text-white shadow-xl shadow-indigo-500/20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white" />
            <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-white" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">
                {getGreeting()},
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <h1 className="text-2xl sm:text-3xl font-bold">{userName}</h1>
                {isGuru && (
                  <span className="text-xs font-semibold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
                    Dashboard Guru
                  </span>
                )}
                {isStaff && (
                  <span className="text-xs font-semibold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
                    Dashboard Staff
                  </span>
                )}
              </div>
              <p className="text-indigo-100/90 text-sm mt-2 flex items-center gap-2 flex-wrap">
                <CalendarDays size={14} />
                {formatTanggalPanjang(selectedDate)}
                {!isToday && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(today)}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full transition"
                  >
                    Kembali ke hari ini
                  </button>
                )}
              </p>
              {isGuru && slotMengajar > 0 && (
                <p className="text-sm mt-2 text-indigo-100 font-medium flex items-center gap-2">
                  <BookOpen size={14} />
                  Mengajar: {slotSudahScan}/{slotMengajar} Jadwal Sudah Tercatat
                </p>
              )}
            </div>
            {canScanAbsensi && isToday && (
              <Link
                href="/scan"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition shadow-lg shrink-0"
              >
                <ScanLine size={18} />
                Scan Absensi
              </Link>
            )}
          </div>
        </div>

        {/* ── Absensi harian ── */}
        {canScanAbsensi && isToday && (
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <AbsensiCard
              title="Absen Berangkat"
              target={absenBerangkat}
              icon={Sun}
              href="/scan"
            />

            <AbsensiCard
              title="Absen Pulang"
              target={absenPulang}
              icon={Sunset}
              href="/scan"
            />
          </div>
        )}

        {isGuru && <UpcomingEventsInline />}

        {isGuru && (
          <div className="mb-6">
            <GuruDashboardBody
              jadwal={jadwalDashboard.map((j) => ({
                id: j.id,
                jamMulai: j.jamMulai,
                jamSelesai: j.jamSelesai,
                mapel: j.mapel,
                kelas: j.kelas,
                ruangan: j.ruangan,
                status: j.status,
                waktuScan: j.waktuScan,
              }))}
              targets={isToday ? targets : []}
              isToday={isToday}
            />
          </div>
        )}
        <PelanggaranDashboardSection />

        {/* ── Catatan Harian (STAFF only) ── */}
        {isStaff && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/30">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <NotebookPen size={18} className="text-indigo-600" />
                Catatan Harian
              </h2>
              <Link
                href="/catatan-harian"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg transition"
              >
                {catatanHarian ? "Edit Catatan" : "Isi Catatan"}
              </Link>
            </div>
            {catatanHarian ? (
              <div className="p-5 grid sm:grid-cols-3 gap-4">
                {[
                  { key: "Kegiatan", val: catatanHarian.kegiatan },
                  { key: "Hasil", val: catatanHarian.hasil },
                  ...(catatanHarian.kendala
                    ? [{ key: "Kendala", val: catatanHarian.kendala }]
                    : []),
                ].map((block) => (
                  <div
                    key={block.key}
                    className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 border border-gray-100 dark:border-gray-700"
                  >
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                      {block.key}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-4">
                      {block.val}
                    </p>
                  </div>
                ))}
                {catatanHarian.foto && catatanHarian.foto.length > 0 && (
                  <div className="sm:col-span-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Foto ({catatanHarian.foto.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {catatanHarian.foto.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-indigo-400 transition"
                        >
                          <img
                            src={url}
                            alt={`Foto ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center">
                <NotebookPen
                  size={40}
                  className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
                />
                <p className="text-gray-500 text-sm mb-4">
                  Belum ada catatan hari ini
                </p>
                <Link
                  href="/catatan-harian"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-500/25"
                >
                  <NotebookPen size={16} />
                  Isi Catatan Sekarang
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Jadwal (GURU only) ── */}
        {isGuru && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-950/20">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock size={18} className="text-violet-600" />
                {isToday
                  ? "Jadwal Mengajar Hari Ini"
                  : `Jadwal Mengajar ${formatTanggalPanjang(selectedDate)}`}
              </h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                {jadwalDashboard.length} slot
              </span>
            </div>
            {jadwalDashboard.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays
                  size={40}
                  className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
                />
                <p className="text-gray-500">
                  Tidak ada jadwal mengajar hari ini
                </p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {kelasJadwal.map(([kelas, jadwal]) => (
                  <div
                    key={kelas}
                    className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30"
                  >
                    <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <GraduationCap size={17} className="text-violet-600" />
                        Kelas {kelas}
                      </h3>
                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/50 px-2.5 py-1 rounded-full">
                        {jadwal.length} slot
                      </span>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {jadwal.map((j) => (
                        <div
                          key={j.id}
                          className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {j.mapel}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {j.ruangan}
                              </span>
                              {j.waktuScan && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={14} />
                                  {["IZIN", "SAKIT", "ALPHA"].includes(j.status)
                                    ? "Dicatat"
                                    : "Scan"}{" "}
                                  {new Date(j.waktuScan).toLocaleTimeString(
                                    "id-ID",
                                    {
                                      timeZone: "Asia/Jakarta",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                              <Clock size={14} />
                              {j.jamMulai} – {j.jamSelesai}
                            </div>
                            <StatusBadge status={j.status} />
                            {j.status === "BELUM" && isToday && (
                              <Link
                                href="/scan"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Scan sekarang
                                <ArrowRight size={12} />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kalender mobile — hanya tampil di bawah xl */}
        <div className="block xl:hidden mt-6">
          <CalendarPanel
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            pengumuman={pengumuman}
            canCreatePengumuman={false}
            formPengumuman={formPengumuman}
            setFormPengumuman={setFormPengumuman}
            simpanPengumuman={simpanPengumuman}
          />
        </div>
      </div>

      {/* ── Sidebar Kalender ── */}
      <aside className="hidden xl:block sticky top-[96px] self-start max-h-[calc(100vh-120px)] overflow-y-auto">
        <CalendarPanel
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          pengumuman={pengumuman}
          canCreatePengumuman={false}
          formPengumuman={formPengumuman}
          setFormPengumuman={setFormPengumuman}
          simpanPengumuman={simpanPengumuman}
        />
      </aside>
    </div>
  );
}
