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

  totalPegawaiUnik: number;
  pegawaiHadirUnik: number;
  pegawaiTerlambatUnik: number;
  pegawaiTidakHadirUnik: number;

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
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  href?: string;
}) {
  const content = (
    <div
      className={`relative h-full overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient} ${href
        ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-xl"
        : ""
        }`}
    >
      <div className="absolute -right-3 -top-3 opacity-20">
        <Icon size={72} strokeWidth={1.5} />
      </div>

      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
            <Icon size={18} />
          </span>

          <p className="text-sm font-medium text-white/90">{label}</p>
        </div>

        <p className="text-3xl font-bold tracking-tight">{value}</p>

        {sub && <p className={`mt-1.5 text-xs font-medium ${accent}`}>{sub}</p>}

        {href && (
          <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-white/90">
            Lihat data
            <ArrowRight size={13} />
          </p>
        )}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      aria-label={`Buka ${label}`}
    >
      {content}
    </Link>
  );
}

function DirectoryCard({
  title,
  count,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  count: number;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-800"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:group-hover:bg-indigo-950">
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {count}
        </p>

        <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
          Lihat
          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
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
        {value} / {total} hadir atau terlambat
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
  showUpcomingEvents = true,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  pengumuman: PengumumanItem[];
  canCreatePengumuman: boolean;
  formPengumuman: {
    judul: string;
    isi: string;
  };
  setFormPengumuman: React.Dispatch<
    React.SetStateAction<{
      judul: string;
      isi: string;
    }>
  >;
  simpanPengumuman: () => void;
  showUpcomingEvents?: boolean;
}) {
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const [kalenderEvents, setKalenderEvents] = useState<
    {
      tanggalMulai: string;
      tanggalSelesai: string;
      tipe: string;
    }[]
  >([]);

  const days = useMemo(
    () => buildCalendar(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "id-ID",
    {
      month: "long",
      year: "numeric",
    },
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchKalender() {
      try {
        const res = await fetch(`/api/kalender-akademik?tahun=${viewYear}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          if (!cancelled) {
            setKalenderEvents([]);
          }

          return;
        }

        const result = await res.json();

        if (!cancelled) {
          setKalenderEvents(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        console.error("DASHBOARD_KALENDER_ERROR:", error);

        if (!cancelled) {
          setKalenderEvents([]);
        }
      }
    }

    void fetchKalender();

    return () => {
      cancelled = true;
    };
  }, [viewYear]);

  function getEventOnDate(dateIso: string) {
    return kalenderEvents.filter((event) => {
      const tanggalMulai = event.tanggalMulai.slice(0, 10);
      const tanggalSelesai = event.tanggalSelesai.slice(0, 10);

      return dateIso >= tanggalMulai && dateIso <= tanggalSelesai;
    });
  }

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
      setViewYear((currentYear) => currentYear - 1);
      return;
    }

    setViewMonth((currentMonth) => currentMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((currentYear) => currentYear + 1);
      return;
    }

    setViewMonth((currentMonth) => currentMonth + 1);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-gray-100">Kalender</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Bulan sebelumnya"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="min-w-[120px] text-center text-sm text-gray-500 dark:text-gray-400">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Bulan berikutnya"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((hari) => (
          <div key={hari} className="font-medium text-gray-400">
            {hari}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const fullDate = new Date(viewYear, viewMonth, day);
          const iso = formatDate(fullDate);

          const active = iso === selectedDate;
          const tanggalHariIni = iso === formatDate(new Date());

          const dayEvents = getEventOnDate(iso);

          const dots = [
            ...new Map(dayEvents.map((event) => [event.tipe, event])).values(),
          ].slice(0, 2);

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={`relative flex aspect-square flex-col items-center justify-start gap-0.5 rounded-xl pb-1 pt-1 text-sm font-medium transition ${active
                ? "bg-indigo-600 text-white"
                : tanggalHariIni
                  ? "border border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              <span>{day}</span>

              {dots.length > 0 && (
                <div className="flex justify-center gap-0.5">
                  {dots.map((event) => (
                    <span
                      key={event.tipe}
                      className={`h-1 w-1 rounded-full ${active
                        ? "bg-white/80"
                        : (TIPE_DOT[event.tipe] ?? "bg-gray-400")
                        }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showUpcomingEvents && <UpcomingEventsSidebar />}

      <div className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Pengumuman
        </h3>

        {canCreatePengumuman && (
          <div className="mb-4 space-y-2">
            <input
              value={formPengumuman.judul}
              onChange={(event) =>
                setFormPengumuman((current) => ({
                  ...current,
                  judul: event.target.value,
                }))
              }
              placeholder="Judul pengumuman"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />

            <textarea
              value={formPengumuman.isi}
              onChange={(event) =>
                setFormPengumuman((current) => ({
                  ...current,
                  isi: event.target.value,
                }))
              }
              placeholder="Isi pengumuman"
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />

            <button
              type="button"
              onClick={simpanPengumuman}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
                className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/40"
              >
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {item.judul}
                </p>

                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {item.isi}
                </p>

                <p className="mt-2 text-[11px] text-gray-400">
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
  const [dashboardError, setDashboardError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date()),
  );
  const [pengumuman, setPengumuman] = useState<PengumumanItem[]>([]);
  const [targets, setTargets] = useState<TargetAbsensi[]>([]);
  const [catatanHarian, setCatatanHarian] = useState<CatatanHarian | null>(
    null,
  );
  const [formPengumuman, setFormPengumuman] = useState({ judul: "", isi: "" });

  const [showUpcomingEvents, setShowUpcomingEvents] = useState(false);

  const userRoles = useMemo(() => {
    const roleUtama = session?.user?.role;

    const rolesTambahan = Array.isArray(session?.user?.roles)
      ? session.user.roles
      : [];

    return Array.from(
      new Set(
        [roleUtama, ...rolesTambahan].filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        ),
      ),
    );
  }, [session?.user?.role, session?.user?.roles]);

  const hasRole = (targetRole: string) => userRoles.includes(targetRole);

  const isManagement = hasRole("ADMIN") || hasRole("PIMPINAN");

  const isStaff = hasRole("STAFF");
  const isGuru = hasRole("GURU");

  const canScanAbsensi = isGuru || isStaff;
  const today = formatDate(new Date());
  const isToday = selectedDate === today;

  async function fetchDashboard() {
    setLoading(true);
    setDashboardError("");

    /*
     * Data dashboard adalah request utama.
     * Hanya kegagalan endpoint ini yang boleh menggagalkan halaman.
     */
    try {
      const dashboardRes = await fetch(
        `/api/dashboard?tanggal=${selectedDate}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const dashboardData = await dashboardRes.json().catch(() => null);

      if (!dashboardRes.ok) {
        throw new Error(
          dashboardData?.error ??
          `Gagal mengambil dashboard (${dashboardRes.status})`,
        );
      }

      if (
        !dashboardData ||
        typeof dashboardData !== "object" ||
        "error" in dashboardData
      ) {
        throw new Error(
          dashboardData?.error ?? "Respons dashboard tidak valid",
        );
      }

      setData(dashboardData as DashboardData);
    } catch (error) {
      console.error("DASHBOARD_MAIN_ERROR:", error);

      setData(null);
      setTargets([]);
      setCatatanHarian(null);

      setDashboardError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data dashboard",
      );

      setLoading(false);
      return;
    }

    /*
     * Dashboard utama sudah berhasil.
     * Request tambahan tidak boleh membuat seluruh halaman gagal.
     */
    setLoading(false);

    const optionalRequests: Promise<void>[] = [];

    // Pengumuman hanya dibutuhkan ADMIN dan PIMPINAN
    if (isManagement) {
      optionalRequests.push(
        (async () => {
          try {
            const res = await fetch("/api/pengumuman", {
              cache: "no-store",
              credentials: "include",
            });

            if (!res.ok) {
              setPengumuman([]);
              return;
            }

            const result = await res.json();

            setPengumuman(Array.isArray(result) ? result : []);
          } catch (error) {
            console.error("DASHBOARD_PENGUMUMAN_ERROR:", error);
            setPengumuman([]);
          }
        })(),
      );
    } else {
      setPengumuman([]);
    }

    // Target absensi
    if (canScanAbsensi && isToday) {
      optionalRequests.push(
        (async () => {
          try {
            const res = await fetch("/api/absensi/target", {
              cache: "no-store",
              credentials: "include",
            });

            if (!res.ok) {
              setTargets([]);
              return;
            }

            const result = await res.json();

            setTargets(Array.isArray(result) ? result : []);
          } catch (error) {
            console.error("DASHBOARD_TARGET_ERROR:", error);

            setTargets([]);
          }
        })(),
      );
    } else {
      setTargets([]);
    }

    // Catatan harian staff
    if (isStaff) {
      optionalRequests.push(
        (async () => {
          try {
            const res = await fetch(
              `/api/catatan-harian?tanggal=${selectedDate}`,
              {
                cache: "no-store",
                credentials: "include",
              },
            );

            if (!res.ok) {
              setCatatanHarian(null);
              return;
            }

            const result = await res.json();

            setCatatanHarian(
              Array.isArray(result) && result.length > 0 ? result[0] : null,
            );
          } catch (error) {
            console.error("DASHBOARD_CATATAN_ERROR:", error);

            setCatatanHarian(null);
          }
        })(),
      );
    } else {
      setCatatanHarian(null);
    }

    await Promise.allSettled(optionalRequests);
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
    if (isManagement || loading || !data) {
      setShowUpcomingEvents(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowUpcomingEvents(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isManagement, loading, data]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void fetchDashboard();
    }

    if (sessionStatus === "unauthenticated") {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, selectedDate, session?.user?.id]);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <AlertCircle className="mx-auto mb-3 text-amber-500" size={40} />

        <p className="font-semibold text-gray-900 dark:text-gray-100">
          Gagal memuat dashboard
        </p>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {dashboardError || "Terjadi gangguan saat mengambil data dashboard."}
        </p>

        <button
          type="button"
          onClick={fetchDashboard}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Muat Ulang
        </button>
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

  const totalPegawai =
    data.totalPegawaiUnik ?? (data.totalGuru ?? 0) + (data.totalStaff ?? 0);

  const pegawaiTercatat =
    (data.pegawaiHadirUnik ?? 0) + (data.pegawaiTerlambatUnik ?? 0);

  const guruTercatat = (data.guruHadir ?? 0) + (data.guruTerlambat ?? 0);

  const staffTercatat = (data.staffHadir ?? 0) + (data.staffTerlambat ?? 0);

  const siswaTercatat = (data.siswaHadir ?? 0) + (data.siswaTerlambat ?? 0);

  const pctGuru = pct(guruTercatat, data.totalGuru ?? 0);

  const pctStaff = pct(staffTercatat, data.totalStaff ?? 0);

  const pctSiswa = pct(siswaTercatat, data.totalSiswa ?? 0);

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
                      {pct(pegawaiTercatat, totalPegawai)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <School size={22} className="text-rose-300 shrink-0" />
                  <div>
                    <p className="text-xs text-indigo-200">Kehadiran siswa</p>
                    <p className="text-lg font-bold">
                      {pct(siswaTercatat, data.totalSiswa ?? 0)}%
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
              href="/guru"
            />
            <StatCard
              label="Total Staff"
              value={data.totalStaff ?? 0}
              sub="Tenaga kependidikan"
              icon={Briefcase}
              gradient="bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/25"
              accent="text-violet-200"
              href="/staff"
            />
            <StatCard
              label="Total Siswa"
              value={data.totalSiswa ?? 0}
              sub="Siswa aktif terdaftar"
              icon={School}
              gradient="bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25"
              accent="text-rose-100"
              href="/siswa"
            />
            <StatCard
              label="Kehadiran Guru"
              value={guruTercatat}
              sub={`${data.guruHadir ?? 0} hadir · ${data.guruTerlambat ?? 0
                } terlambat`}
              icon={UserCheck}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
              accent="text-emerald-100"
            />
            <StatCard
              label="Kehadiran Staff"
              value={staffTercatat}
              sub={`${data.staffHadir ?? 0} hadir · ${data.staffTerlambat ?? 0
                } terlambat`}
              icon={Users}
              gradient="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25"
              accent="text-sky-100"
            />
            <StatCard
              label="Kehadiran Siswa"
              value={siswaTercatat}
              sub={`${data.siswaHadir ?? 0} hadir · ${data.siswaTerlambat ?? 0
                } terlambat`}
              icon={UserCheck}
              gradient="bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/25"
              accent="text-orange-100"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Guru",
                value: guruTercatat,
                total: data.totalGuru ?? 0,
                color: CHART_COLORS.hadir,
                icon: GraduationCap,
                iconColor: "text-indigo-600",
              },
              {
                label: "Staff",
                value: staffTercatat,
                total: data.totalStaff ?? 0,
                color: CHART_COLORS.staff,
                icon: Briefcase,
                iconColor: "text-violet-600",
              },
              {
                label: "Siswa",
                value: siswaTercatat,
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white" />
          <div className="absolute -bottom-8 -left-4 h-32 w-32 rounded-full bg-white" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-200">
              {getGreeting()},
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">
                {userName}
              </h1>

              {isGuru && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  Guru
                </span>
              )}

              {isStaff && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  Staff
                </span>
              )}
            </div>

            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-indigo-100/90">
              <CalendarDays size={14} />
              {formatTanggalPanjang(selectedDate)}

              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  className="rounded-full bg-white/20 px-2 py-0.5 text-xs transition hover:bg-white/30"
                >
                  Kembali ke hari ini
                </button>
              )}
            </p>

            {isGuru && slotMengajar > 0 && (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-indigo-100">
                <BookOpen size={14} />
                {slotSudahScan} dari {slotMengajar} jadwal sudah tercatat
              </p>
            )}
          </div>

          {canScanAbsensi && isToday && (
            <Link
              href="/scan"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
            >
              <ScanLine size={18} />
              Scan Absensi
            </Link>
          )}
        </div>
      </div>

      {/* Absensi berangkat dan pulang */}
      {canScanAbsensi && isToday && (
        <div className="grid gap-4 sm:grid-cols-2">
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

      {(isGuru || isStaff) && showUpcomingEvents && (
        <UpcomingEventsInline />
      )}

      {/* Jadwal guru */}
      {isGuru && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
                <Clock size={18} className="text-indigo-600" />

                {isToday
                  ? "Jadwal Mengajar Hari Ini"
                  : `Jadwal ${formatTanggalPanjang(selectedDate)}`}
              </h2>

              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Jadwal dan status absensi mengajar
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              {jadwalDashboard.length} jadwal
            </span>
          </div>

          {jadwalDashboard.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CalendarDays
                size={40}
                className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
              />

              <p className="text-sm text-gray-500">
                Tidak ada jadwal mengajar
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {jadwalDashboard.map((jadwal) => (
                <div
                  key={jadwal.id}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {jadwal.mapel}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <GraduationCap size={14} />
                        Kelas {jadwal.kelas}
                      </span>

                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {jadwal.ruangan}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      <Clock size={14} />
                      {jadwal.jamMulai} – {jadwal.jamSelesai}
                    </div>

                    <StatusBadge status={jadwal.status} />

                    {jadwal.status === "BELUM" && isToday && (
                      <Link
                        href="/scan"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Scan
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Catatan harian staff */}
      {isStaff && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
                <NotebookPen size={18} className="text-indigo-600" />
                Catatan Harian
              </h2>

              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Ringkasan kegiatan staff hari ini
              </p>
            </div>

            <Link
              href="/catatan-harian"
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400"
            >
              {catatanHarian ? "Edit" : "Isi Catatan"}
            </Link>
          </div>

          {catatanHarian ? (
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Kegiatan
              </p>

              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                {catatanHarian.kegiatan}
              </p>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Hasil
              </p>

              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                {catatanHarian.hasil}
              </p>

              {catatanHarian.kendala && (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Kendala
                  </p>

                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    {catatanHarian.kendala}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <NotebookPen
                size={36}
                className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
              />

              <p className="text-sm text-gray-500">
                Belum ada catatan hari ini
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
