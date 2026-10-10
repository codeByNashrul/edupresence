"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FileBarChart2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type Periode = "harian" | "mingguan" | "bulanan" | "custom";
type Scope = "semua" | "guru" | "staff";

type StatusLaporan =
  "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT" | "ALPHA" | "BELUM_ABSEN";

type StatusDetail = StatusLaporan | "BELUM_WAKTUNYA";

interface KehadiranDetail {
  tanggal: string;
  status: StatusDetail;
  waktuScan: string | null;
}

interface MengajarDetail {
  tanggal: string;
  jadwalId: string;
  jamMulai: string;
  jamSelesai: string;
  kelas: string;
  mataPelajaran: string;
  ruangan: string;
  sumber: "INDUK" | "TUKAR";
  status: StatusDetail;
  jp: number;
}

interface PegawaiReport {
  userId: string;
  nama: string;
  nip: string;
  roleUtama: string;

  roles: {
    guru: boolean;
    staff: boolean;
  };

  kehadiran: {
    hariKerjaSeharusnya: number;

    HADIR: number;
    TERLAMBAT: number;
    IZIN: number;
    SAKIT: number;
    ALPHA: number;
    BELUM_ABSEN: number;

    hadirFisik: number;
    persentaseKehadiranFisik: number | null;

    statusTercatat: number;
    persentaseStatusTercatat: number | null;

    detail: KehadiranDetail[];
  };

  mengajar: {
    berlaku: boolean;

    pertemuanTerjadwal: number;
    pertemuanBelumWaktunya: number;

    pertemuanSeharusnya: number;
    pertemuanTerlaksana: number;

    jpTerjadwal: number;
    jpBelumWaktunya: number;

    jpSeharusnya: number;
    jpTerlaksana: number;

    jpHadir: number;
    jpTerlambat: number;
    jpIzin: number;
    jpSakit: number;
    jpAlpha: number;
    jpBelumAbsen: number;

    HADIR: number;
    TERLAMBAT: number;
    IZIN: number;
    SAKIT: number;
    ALPHA: number;
    BELUM_ABSEN: number;

    persentaseKeterlaksanaanPertemuan: number | null;
    persentaseKeterlaksanaanJam: number | null;

    sumberJadwal: {
      induk: number;
      tukar: number;
    };

    detail: MengajarDetail[];
  };

  perluPerhatian: {
    kehadiran: boolean;
    mengajar: boolean;
  };
}

interface PerluPerhatianItem {
  userId: string;
  nama: string;
  nip: string;

  roles: {
    guru: boolean;
    staff: boolean;
  };

  kehadiran: {
    perluPerhatian: boolean;
    alpha: number;
    belumAbsen: number;
    tanggal: Array<{
      tanggal: string;
      status: StatusLaporan;
    }>;
  };

  mengajar: {
    perluPerhatian: boolean;
    alpha: number;
    belumAbsen: number;
    jpBelumAbsen: number;
    jadwal: MengajarDetail[];
  };
}

interface LaporanV2Data {
  period: {
    mode: Periode;
    from: string;
    to: string;
    effectiveTo: string;
    today: string;
    asOfTimeJakarta?: string;
  };

  summary: {
    pegawai: {
      total: number;
      guru: number;
      staff: number;

      kewajibanKehadiran: number;

      HADIR: number;
      TERLAMBAT: number;
      IZIN: number;
      SAKIT: number;
      ALPHA: number;
      BELUM_ABSEN: number;

      hadirFisik: number;
      persentaseKehadiranFisik: number | null;

      statusTercatat: number;
      persentaseStatusTercatat: number | null;

      perluPerhatian: number;
    };

    mengajar: {
      guruAktif: number;
      guruDenganJadwal: number;

      pertemuanTerjadwal: number;
      pertemuanBelumWaktunya: number;

      pertemuanSeharusnya: number;
      pertemuanTerlaksana: number;

      jpTerjadwal: number;
      jpBelumWaktunya: number;

      jpSeharusnya: number;
      jpTerlaksana: number;

      HADIR: number;
      TERLAMBAT: number;
      IZIN: number;
      SAKIT: number;
      ALPHA: number;
      BELUM_ABSEN: number;

      persentaseKeterlaksanaanPertemuan: number | null;
      perluPerhatian: number;
    };
  };

  pegawai: PegawaiReport[];
  perluPerhatian: PerluPerhatianItem[];

  holidays: Array<{
    id: string;
    judul: string;
    tipe: string;
    tanggalMulai: string;
    tanggalSelesai: string;
  }>;
}

const STATUS_LABEL: Record<StatusDetail, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPHA: "Alpha",
  BELUM_ABSEN: "Belum Absen",
  BELUM_WAKTUNYA: "Belum Waktunya",
};

const STATUS_CLASS: Record<StatusDetail, string> = {
  HADIR:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  TERLAMBAT:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  IZIN: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  SAKIT:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900",
  ALPHA:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  BELUM_ABSEN:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  BELUM_WAKTUNYA:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const METRIC_TONES = {
  indigo:
    "border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300",
  emerald:
    "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  blue: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  amber:
    "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
} as const;

function getJakartaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function firstDayOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function formatTanggal(date?: string) {
  if (!date) return "-";

  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatWaktuScan(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value}%`;
}

function percentageClass(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }

  if (value >= 90) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
  }

  if (value >= 70) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
  }

  return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300";
}

function StatusBadge({ status }: { status: StatusDetail }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function RoleBadges({
  roles,
}: {
  roles: {
    guru: boolean;
    staff: boolean;
  };
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.guru && (
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          Guru
        </span>
      )}

      {roles.staff && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Staff
        </span>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone: keyof typeof METRIC_TONES;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${METRIC_TONES[tone]}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {label}
        </p>

        <Icon size={18} />
      </div>

      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function LaporanPage() {
  const today = useMemo(() => getJakartaToday(), []);

  const [periode, setPeriode] = useState<Periode>("bulanan");
  const [scope, setScope] = useState<Scope>("semua");

  const [tanggal, setTanggal] = useState(today);
  const [from, setFrom] = useState(firstDayOfMonth(today));
  const [to, setTo] = useState(today);

  const [pegawaiFilter, setPegawaiFilter] = useState("semua");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const [activeTable, setActiveTable] = useState<"kehadiran" | "mengajar">(
    "kehadiran",
  );

  const [showAllAttention, setShowAllAttention] = useState(false);

  const [detailTab, setDetailTab] = useState<"kehadiran" | "mengajar">(
    "kehadiran",
  );

  const [data, setData] = useState<LaporanV2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          periode,
          scope,
        });

        if (periode === "custom") {
          params.set("from", from);
          params.set("to", to);
        } else {
          params.set("tanggal", tanggal);
        }

        const response = await fetch(`/api/laporan/v2?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "Gagal memuat laporan");
        }

        const result = json as LaporanV2Data;

        setData(result);

        setPegawaiFilter((current) => {
          if (current === "semua") return current;

          return result.pegawai.some((item) => item.userId === current)
            ? current
            : "semua";
        });

        setDetailUserId((current) => {
          if (!current) return null;

          return result.pegawai.some((item) => item.userId === current)
            ? current
            : null;
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        setData(null);

        setError(err instanceof Error ? err.message : "Gagal memuat laporan");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [periode, scope, tanggal, from, to, reloadKey]);

  const selectedPegawai =
    pegawaiFilter === "semua"
      ? null
      : (data?.pegawai.find((item) => item.userId === pegawaiFilter) ?? null);

  const displayedPegawai = selectedPegawai
    ? [selectedPegawai]
    : (data?.pegawai ?? []);

  const displayedGuru = displayedPegawai.filter(
    (item) => item.mengajar.berlaku,
  );

  const displayedAttention = useMemo(() => {
    if (!data) return [];

    const items =
      pegawaiFilter === "semua"
        ? data.perluPerhatian
        : data.perluPerhatian.filter((item) => item.userId === pegawaiFilter);

    return [...items].sort((a, b) => {
      const scoreA =
        a.kehadiran.alpha * 4 +
        a.kehadiran.belumAbsen +
        a.mengajar.alpha * 4 +
        a.mengajar.belumAbsen;

      const scoreB =
        b.kehadiran.alpha * 4 +
        b.kehadiran.belumAbsen +
        b.mengajar.alpha * 4 +
        b.mengajar.belumAbsen;

      return scoreB - scoreA;
    });
  }, [data, pegawaiFilter]);

  const visibleAttention = showAllAttention
    ? displayedAttention
    : displayedAttention.slice(0, 8);

  const detailPegawai =
    data?.pegawai.find((item) => item.userId === detailUserId) ?? null;

  const kehadiranFisikPct = selectedPegawai
    ? selectedPegawai.kehadiran.persentaseKehadiranFisik
    : data?.summary.pegawai.persentaseKehadiranFisik;

  const statusTercatatPct = selectedPegawai
    ? selectedPegawai.kehadiran.persentaseStatusTercatat
    : data?.summary.pegawai.persentaseStatusTercatat;

  const keterlaksanaanPct = selectedPegawai
    ? selectedPegawai.mengajar.persentaseKeterlaksanaanPertemuan
    : data?.summary.mengajar.persentaseKeterlaksanaanPertemuan;

  const attentionCount = selectedPegawai
    ? Number(
        selectedPegawai.perluPerhatian.kehadiran ||
          selectedPegawai.perluPerhatian.mengajar,
      )
    : (data?.perluPerhatian.length ?? 0);

  function handlePegawaiFilter(value: string) {
    setPegawaiFilter(value);
    setDetailUserId(null);
    setShowAllAttention(false);
  }

  async function handleExportExcel() {
    setExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        periode,
        scope,
      });

      if (periode === "custom") {
        params.set("from", from);
        params.set("to", to);
      } else {
        params.set("tanggal", tanggal);
      }

      if (pegawaiFilter !== "semua") {
        params.set("userId", pegawaiFilter);
      }

      const response = await fetch(
        `/api/laporan/v2/export?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const json = await response.json().catch(() => null);

        throw new Error(json?.error ?? "Gagal membuat file Excel");
      }

      const blob = await response.blob();

      const disposition = response.headers.get("Content-Disposition");

      const filenameMatch = disposition?.match(/filename="?([^";]+)"?/i);

      const filename =
        filenameMatch?.[1] ?? `Laporan-EduPresence-${tanggal}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal membuat file Excel",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-5 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-xs font-semibold">
              <FileBarChart2 size={14} />
              Laporan Kehadiran & KBM
            </div>

            <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>

            <p className="mt-1.5 text-sm text-indigo-100/90">
              {data
                ? `${formatTanggal(data.period.from)} – ${formatTanggal(
                    data.period.effectiveTo,
                  )}`
                : "Ringkasan kehadiran pegawai dan keterlaksanaan pembelajaran"}
            </p>

            {data?.period.asOfTimeJakarta && (
              <p className="mt-1 text-xs text-indigo-100/70">
                Data sampai pukul {data.period.asOfTimeJakarta} WIB
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={loading || exporting || !data}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3.5 py-2 text-sm font-semibold transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={15} />
              )}

              {exporting ? "Menyiapkan..." : "Excel"}
            </button>

            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3.5 py-2 text-sm font-semibold transition hover:bg-white/25 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Perbarui
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange
            size={17}
            className="text-indigo-600 dark:text-indigo-400"
          />

          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Filter Laporan
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Periode
            </label>

            <div className="relative">
              <select
                value={periode}
                onChange={(event) => setPeriode(event.target.value as Periode)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-9 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="harian">Harian</option>
                <option value="mingguan">Mingguan</option>
                <option value="bulanan">Bulanan</option>
                <option value="custom">Custom</option>
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {periode === "custom" ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Dari
                </label>

                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Sampai
                </label>

                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => setTo(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Tanggal Acuan
              </label>

              <input
                type="date"
                value={tanggal}
                onChange={(event) => setTanggal(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Kelompok
            </label>

            <div className="relative">
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as Scope)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-9 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="semua">Semua Pegawai</option>
                <option value="guru">Guru</option>
                <option value="staff">Staff</option>
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Pegawai
            </label>

            <div className="relative">
              <select
                value={pegawaiFilter}
                onChange={(event) => handlePegawaiFilter(event.target.value)}
                disabled={!data || loading}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-9 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="semua">Semua Pegawai</option>

                {(data?.pegawai ?? []).map((item) => (
                  <option key={item.userId} value={item.userId}>
                    {item.nama}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-14 text-center dark:border-gray-800 dark:bg-gray-900">
          <Loader2
            size={32}
            className="mx-auto mb-3 animate-spin text-indigo-500"
          />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Menyiapkan laporan...
          </p>
        </div>
      ) : data ? (
        <>
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {selectedPegawai ? "Ringkasan Pegawai" : "Ringkasan SMP"}
                </p>

                <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {selectedPegawai
                    ? selectedPegawai.nama
                    : "Kondisi periode terpilih"}
                </h2>
              </div>

              {!selectedPegawai && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data.summary.pegawai.total} pegawai ·{" "}
                  {data.summary.pegawai.guru} guru ·{" "}
                  {data.summary.pegawai.staff} staff
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard
                label="Kehadiran Fisik"
                value={formatPct(kehadiranFisikPct)}
                description="Hadir + terlambat dibanding kewajiban hadir."
                icon={UserCheck}
                tone="emerald"
              />

              <MetricCard
                label="Status Tercatat"
                value={formatPct(statusTercatatPct)}
                description="Kewajiban yang sudah memiliki status."
                icon={Users}
                tone="blue"
              />

              <MetricCard
                label="Keterlaksanaan KBM"
                value={formatPct(keterlaksanaanPct)}
                description="Pertemuan mengajar yang benar-benar terlaksana."
                icon={BookOpenCheck}
                tone="indigo"
              />

              <MetricCard
                label="Perlu Perhatian"
                value={attentionCount}
                description={
                  selectedPegawai
                    ? "Ada Alpha atau Belum Absen."
                    : "Pegawai unik dengan Alpha atau Belum Absen."
                }
                icon={AlertTriangle}
                tone="amber"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={18}
                    className="text-amber-600 dark:text-amber-400"
                  />

                  <h2 className="font-bold text-gray-900 dark:text-gray-100">
                    Perlu Perhatian
                  </h2>
                </div>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Prioritas pada Alpha dan Belum Absen.
                </p>
              </div>

              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {displayedAttention.length} pegawai
              </span>
            </div>

            {displayedAttention.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                Tidak ada Alpha atau Belum Absen pada filter ini.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {visibleAttention.map((item) => (
                  <button
                    type="button"
                    key={item.userId}
                    onClick={() => setDetailUserId(item.userId)}
                    className="rounded-xl border border-amber-200 bg-white p-3.5 text-left transition hover:border-amber-300 hover:shadow-sm dark:border-amber-900/60 dark:bg-gray-900 dark:hover:border-amber-800"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.nama}
                        </p>

                        <div className="mt-1">
                          <RoleBadges roles={item.roles} />
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-amber-600 dark:text-amber-400"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {item.kehadiran.alpha > 0 && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          {item.kehadiran.alpha} Alpha hadir
                        </span>
                      )}

                      {item.kehadiran.belumAbsen > 0 && (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                          {item.kehadiran.belumAbsen} Belum absen hadir
                        </span>
                      )}

                      {item.mengajar.alpha > 0 && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          {item.mengajar.alpha} Alpha mengajar
                        </span>
                      )}

                      {item.mengajar.belumAbsen > 0 && (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                          {item.mengajar.belumAbsen} Belum absen KBM ·{" "}
                          {item.mengajar.jpBelumAbsen} JP
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {displayedAttention.length > 8 && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllAttention((value) => !value)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-900/60 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                >
                  {showAllAttention
                    ? "Tampilkan lebih sedikit"
                    : `Lihat semua ${displayedAttention.length} pegawai`}
                  <ChevronDown
                    size={14}
                    className={
                      showAllAttention
                        ? "rotate-180 transition-transform"
                        : "transition-transform"
                    }
                  />
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTable("kehadiran")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTable === "kehadiran"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <UserCheck size={16} />
                  Kehadiran Pegawai
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      activeTable === "kehadiran"
                        ? "bg-white/15 text-white"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {displayedPegawai.length}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTable("mengajar")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTable === "mengajar"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <BookOpenCheck size={16} />
                  Keterlaksanaan Mengajar
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      activeTable === "mengajar"
                        ? "bg-white/15 text-white"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {displayedGuru.length}
                  </span>
                </span>
              </button>
            </div>
          </section>

          <section
            className={
              activeTable === "kehadiran"
                ? "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                : "hidden"
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  Kehadiran Pegawai
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Hadir fisik dan kelengkapan status pada hari kerja efektif.
                </p>
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                {displayedPegawai.length} pegawai
              </span>
            </div>

            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {[
                      "Pegawai",
                      "Hari",
                      "Hadir",
                      "Terlambat",
                      "Izin",
                      "Sakit",
                      "Alpha",
                      "Belum Absen",
                      "Fisik",
                      "Tercatat",
                      "",
                    ].map((label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {displayedPegawai.map((item) => (
                    <tr
                      key={item.userId}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.nama}
                        </p>

                        <div className="mt-1">
                          <RoleBadges roles={item.roles} />
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                        {item.kehadiran.hariKerjaSeharusnya}
                      </td>

                      <td className="px-4 py-3.5 tabular-nums">
                        {item.kehadiran.HADIR}
                      </td>

                      <td className="px-4 py-3.5 tabular-nums text-amber-600 dark:text-amber-400">
                        {item.kehadiran.TERLAMBAT}
                      </td>

                      <td className="px-4 py-3.5 tabular-nums text-blue-600 dark:text-blue-400">
                        {item.kehadiran.IZIN}
                      </td>

                      <td className="px-4 py-3.5 tabular-nums text-purple-600 dark:text-purple-400">
                        {item.kehadiran.SAKIT}
                      </td>

                      <td className="px-4 py-3.5 font-semibold tabular-nums text-red-600 dark:text-red-400">
                        {item.kehadiran.ALPHA}
                      </td>

                      <td className="px-4 py-3.5 font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                        {item.kehadiran.BELUM_ABSEN}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${percentageClass(
                            item.kehadiran.persentaseKehadiranFisik,
                          )}`}
                        >
                          {formatPct(item.kehadiran.persentaseKehadiranFisik)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${percentageClass(
                            item.kehadiran.persentaseStatusTercatat,
                          )}`}
                        >
                          {formatPct(item.kehadiran.persentaseStatusTercatat)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => setDetailUserId(item.userId)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                        >
                          Detail
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className={
              activeTable === "mengajar"
                ? "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                : "hidden"
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  Keterlaksanaan Mengajar
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Berdasarkan jadwal efektif, termasuk pertukaran jadwal yang
                  disetujui.
                </p>
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                {displayedGuru.length} guru
              </span>
            </div>

            {displayedGuru.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Tidak ada kewajiban mengajar pada filter ini.
              </div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {[
                        "Guru",
                        "Pertemuan",
                        "JP Seharusnya",
                        "JP Terlaksana",
                        "Izin",
                        "Sakit",
                        "Alpha",
                        "Belum Absen",
                        "Keterlaksanaan",
                        "",
                      ].map((label) => (
                        <th
                          key={label}
                          className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {displayedGuru.map((item) => (
                      <tr
                        key={item.userId}
                        className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {item.nama}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {item.mengajar.sumberJadwal.tukar > 0
                              ? `${item.mengajar.sumberJadwal.tukar} jadwal tukar`
                              : "Jadwal induk"}
                          </p>
                        </td>

                        <td className="px-4 py-3.5 tabular-nums">
                          {item.mengajar.pertemuanTerlaksana}
                          <span className="text-gray-400">
                            {" "}
                            / {item.mengajar.pertemuanSeharusnya}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-semibold tabular-nums">
                          {item.mengajar.jpSeharusnya}
                        </td>

                        <td className="px-4 py-3.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {item.mengajar.jpTerlaksana}
                        </td>

                        <td className="px-4 py-3.5 tabular-nums text-blue-600 dark:text-blue-400">
                          {item.mengajar.IZIN}
                        </td>

                        <td className="px-4 py-3.5 tabular-nums text-purple-600 dark:text-purple-400">
                          {item.mengajar.SAKIT}
                        </td>

                        <td className="px-4 py-3.5 font-semibold tabular-nums text-red-600 dark:text-red-400">
                          {item.mengajar.ALPHA}
                        </td>

                        <td className="px-4 py-3.5 font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                          {item.mengajar.BELUM_ABSEN}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${percentageClass(
                              item.mengajar.persentaseKeterlaksanaanPertemuan,
                            )}`}
                          >
                            {formatPct(
                              item.mengajar.persentaseKeterlaksanaanPertemuan,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => setDetailUserId(item.userId)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                          >
                            Detail
                            <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {detailPegawai &&
            typeof document !== "undefined" &&
            createPortal(
              <>
                <button
                  type="button"
                  aria-label="Tutup detail pegawai"
                  onClick={() => setDetailUserId(null)}
                  className="fixed inset-0 z-[199] bg-black/30 backdrop-blur-[1px]"
                />

                <section className="fixed inset-y-0 right-0 z-[200] w-full max-w-4xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                  <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Ringkasan Per Pegawai
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                        {detailPegawai.nama}
                      </h2>

                      <div className="mt-2 flex items-center gap-3">
                        <RoleBadges roles={detailPegawai.roles} />

                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          NIP {detailPegawai.nip}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailUserId(null)}
                      className="rounded-full border border-gray-200 bg-white p-2.5 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                      aria-label="Tutup detail"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Kehadiran Pegawai
                      </h3>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Kehadiran fisik
                          </p>

                          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                            {formatPct(
                              detailPegawai.kehadiran.persentaseKehadiranFisik,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Status tercatat
                          </p>

                          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                            {formatPct(
                              detailPegawai.kehadiran.persentaseStatusTercatat,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Keterlaksanaan Mengajar
                      </h3>

                      {detailPegawai.mengajar.berlaku ? (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Keterlaksanaan
                            </p>

                            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                              {formatPct(
                                detailPegawai.mengajar
                                  .persentaseKeterlaksanaanPertemuan,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              JP
                            </p>

                            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                              {detailPegawai.mengajar.jpTerlaksana}
                              <span className="text-sm font-medium text-gray-400">
                                {" "}
                                / {detailPegawai.mengajar.jpSeharusnya}
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                          Tidak memiliki kewajiban mengajar pada periode ini.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-6">
                    <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                      <button
                        type="button"
                        onClick={() => setDetailTab("kehadiran")}
                        className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                          detailTab === "kehadiran"
                            ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <UserCheck size={15} />
                          Kehadiran
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailTab("mengajar")}
                        className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                          detailTab === "mengajar"
                            ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <BookOpenCheck size={15} />
                          Mengajar
                        </span>
                      </button>
                    </div>
                    <div
                      className={
                        detailTab === "kehadiran"
                          ? "overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
                          : "hidden"
                      }
                    >
                      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Detail Kehadiran
                        </h3>
                      </div>

                      <div className="max-h-[460px] overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                                Tanggal
                              </th>

                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                                Status
                              </th>

                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                                Scan
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {detailPegawai.kehadiran.detail.map((item) => (
                              <tr key={item.tanggal}>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                  {formatTanggal(item.tanggal)}
                                </td>

                                <td className="px-4 py-3">
                                  <StatusBadge status={item.status} />
                                </td>

                                <td className="px-4 py-3 tabular-nums text-gray-500 dark:text-gray-400">
                                  {formatWaktuScan(item.waktuScan)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div
                      className={
                        detailTab === "mengajar"
                          ? "overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
                          : "hidden"
                      }
                    >
                      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Detail Mengajar
                        </h3>
                      </div>

                      {detailPegawai.mengajar.detail.length === 0 ? (
                        <div className="p-8 text-center">
                          <CircleDashed
                            size={30}
                            className="mx-auto mb-2 text-gray-300 dark:text-gray-600"
                          />

                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tidak ada jadwal mengajar.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[460px] overflow-auto">
                          <table className="w-full min-w-[720px] text-sm">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                                  Tanggal
                                </th>

                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                                  Jam
                                </th>

                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                                  Kelas / Mapel
                                </th>

                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                                  Status
                                </th>

                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">
                                  JP
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {detailPegawai.mengajar.detail.map((item) => (
                                <tr key={`${item.tanggal}-${item.jadwalId}`}>
                                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                    {formatTanggal(item.tanggal)}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-500 dark:text-gray-400">
                                    {item.jamMulai}–{item.jamSelesai}
                                  </td>

                                  <td className="px-4 py-3">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {item.kelas}
                                    </p>

                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {item.mataPelajaran}
                                      {item.sumber === "TUKAR"
                                        ? " · Tukar"
                                        : ""}
                                    </p>
                                  </td>

                                  <td className="px-4 py-3">
                                    <StatusBadge status={item.status} />
                                  </td>

                                  <td className="px-4 py-3 text-center font-semibold tabular-nums">
                                    {item.jp}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>,
              document.body,
            )}
        </>
      ) : (
        !loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <CircleDashed
              size={38}
              className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
            />

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tidak ada data laporan.
            </p>
          </div>
        )
      )}

      {loading && data && (
        <div className="fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <Loader2 size={14} className="animate-spin text-indigo-500" />
          Memperbarui laporan
        </div>
      )}
    </div>
  );
}
