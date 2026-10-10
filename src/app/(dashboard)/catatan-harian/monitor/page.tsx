"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PeriodMode = "daily" | "weekly" | "monthly" | "custom";

type ReadinessStatus =
  "LENGKAP" | "PERLU_DILENGKAPI" | "BELUM_LENGKAP" | "BELUM_ADA_HARI_KERJA";

interface StaffOption {
  id: string;
  nama: string;
  nip: string;
}

interface StaffSummary {
  id: string;
  nama: string;
  nip: string;
  expectedReports: number;
  submittedReports: number;
  missingReports: number;
  readiness: number | null;
  status: ReadinessStatus;
  withIssues: number;
  missingDates: string[];
}

interface CatatanRecord {
  id: string;
  tanggal: string;
  kegiatan: string;
  hasil: string;
  kendala: string | null;
  foto: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nama: string;
    nip: string;
  };
}

interface MonitorSummaryResponse {
  period: {
    from: string;
    to: string;
    effectiveTo: string | null;
    today: string;
    workWeek: "SENIN_SABTU";
    workingDays: string[];
    workingDayCount: number;
    futureDatesExcluded: boolean;
  };

  summary: {
    totalStaff: number;
    expectedReports: number;
    submittedReports: number;
    missingReports: number;
    readiness: number | null;
    status: ReadinessStatus;
    staffComplete: number;
    staffIncomplete: number;
    withIssues: number;
  };

  staff: StaffSummary[];

  holidays: {
    id: string;
    judul: string;
    tipe: string;
    tanggalMulai: string;
    tanggalSelesai: string;
  }[];

  records: CatatanRecord[];
}

function jakartaDateKey(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function weeklyRange(anchor: string) {
  const date = parseDateKey(anchor);
  const weekday = date.getUTCDay();
  const offsetFromMonday = (weekday + 6) % 7;

  const from = addDays(anchor, -offsetFromMonday);

  return {
    from,
    to: addDays(from, 6),
  };
}

function monthlyRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0));

  return {
    from,
    to: dateKey(lastDay),
  };
}

function formatTanggal(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDateKey(value));
}

function formatTanggalLengkap(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(value));
}

function hasIssue(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 && normalized !== "-";
}

function statusLabel(status: ReadinessStatus) {
  switch (status) {
    case "LENGKAP":
      return "Lengkap";
    case "PERLU_DILENGKAPI":
      return "Perlu Dilengkapi";
    case "BELUM_LENGKAP":
      return "Belum Lengkap";
    default:
      return "Belum Ada Hari Kerja";
  }
}

function statusClass(status: ReadinessStatus) {
  switch (status) {
    case "LENGKAP":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "PERLU_DILENGKAPI":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    case "BELUM_LENGKAP":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

function readinessBarClass(status: ReadinessStatus) {
  switch (status) {
    case "LENGKAP":
      return "bg-emerald-500";
    case "PERLU_DILENGKAPI":
      return "bg-amber-500";
    case "BELUM_LENGKAP":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

export default function MonitorCatatanHarianPage() {
  const today = useMemo(() => jakartaDateKey(), []);

  const [mode, setMode] = useState<PeriodMode>("daily");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [selectedStaff, setSelectedStaff] = useState("");

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  const [data, setData] = useState<MonitorSummaryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDetailDate, setSelectedDetailDate] = useState<string | null>(
    null,
  );

  const [exporting, setExporting] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setStaffLoading(true);

      const res = await fetch("/api/staff", {
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error ?? "Gagal memuat daftar staff");
      }

      setStaffOptions(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("LOAD STAFF ERROR:", err);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!from || !to) {
      return;
    }

    if (from > to) {
      setError("Tanggal mulai tidak boleh setelah tanggal akhir.");
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSelectedRecordId(null);

      const params = new URLSearchParams({
        from,
        to,
      });

      if (selectedStaff) {
        params.set("userId", selectedStaff);
      }

      const res = await fetch(
        `/api/catatan-harian/monitor-summary?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result?.error ?? "Gagal memuat ringkasan catatan harian",
        );
      }

      setData(result as MonitorSummaryResponse);
    } catch (err) {
      console.error("LOAD CATATAN SUMMARY ERROR:", err);
      setData(null);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat ringkasan catatan harian",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, selectedStaff]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStaff();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchStaff]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSummary();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchSummary]);

  function changeMode(nextMode: PeriodMode) {
    setMode(nextMode);

    if (nextMode === "daily") {
      setFrom(today);
      setTo(today);
      return;
    }

    if (nextMode === "weekly") {
      const range = weeklyRange(today);
      setFrom(range.from);
      setTo(range.to);
      return;
    }

    if (nextMode === "monthly") {
      const range = monthlyRange(today.slice(0, 7));
      setFrom(range.from);
      setTo(range.to);
    }
  }

  function changeDaily(value: string) {
    setFrom(value);
    setTo(value);
  }

  function changeWeek(value: string) {
    const range = weeklyRange(value);
    setFrom(range.from);
    setTo(range.to);
  }

  function changeMonth(value: string) {
    const range = monthlyRange(value);
    setFrom(range.from);
    setTo(range.to);
  }

  const issueRecords = useMemo(
    () =>
      [...(data?.records ?? [])]
        .filter((record) => hasIssue(record.kendala))
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [data],
  );

  const visibleIssueRecords = useMemo(
    () => (showAllIssues ? issueRecords : issueRecords.slice(0, 5)),
    [issueRecords, showAllIssues],
  );

  const incompleteStaff = useMemo(
    () =>
      [...(data?.staff ?? [])]
        .filter(
          (staff) =>
            staff.status === "PERLU_DILENGKAPI" ||
            staff.status === "BELUM_LENGKAP",
        )
        .sort((a, b) => {
          const readinessA = a.readiness ?? 101;
          const readinessB = b.readiness ?? 101;

          if (readinessA !== readinessB) {
            return readinessA - readinessB;
          }

          return b.missingReports - a.missingReports;
        }),
    [data],
  );

  const sortedStaff = useMemo(
    () =>
      [...(data?.staff ?? [])].sort((a, b) => {
        const readinessA = a.readiness ?? 101;
        const readinessB = b.readiness ?? 101;

        if (readinessA !== readinessB) {
          return readinessA - readinessB;
        }

        return a.nama.localeCompare(b.nama, "id");
      }),
    [data],
  );

  const recordsByDate = useMemo(() => {
    const groups = new Map<string, CatatanRecord[]>();

    for (const record of data?.records ?? []) {
      const records = groups.get(record.tanggal) ?? [];
      records.push(record);
      groups.set(record.tanggal, records);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [data]);

  const readiness = data?.summary.readiness ?? 0;

  const executiveSummary = data
    ? `Dari ${data.summary.totalStaff} staff, ${data.summary.staffComplete} sudah lengkap dan ${data.summary.staffIncomplete} masih perlu melengkapi laporan. ${
        data.summary.withIssues > 0
          ? `${data.summary.withIssues} catatan kendala tercatat pada periode ini.`
          : "Tidak ada kendala yang tercatat pada periode ini."
      }`
    : "";

  async function handleExportExcel() {
    if (!data || exporting) {
      return;
    }

    try {
      setExporting(true);
      setError("");

      const selectedStaffName = selectedStaff
        ? (staffOptions.find((staff) => staff.id === selectedStaff)?.nama ??
          null)
        : null;

      const res = await fetch("/api/catatan-harian/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          from,
          to,
          selectedStaffName,
          data,
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);

        throw new Error(result?.error ?? "Gagal membuat file Excel laporan");
      }

      const blob = await res.blob();

      const disposition = res.headers.get("Content-Disposition");

      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);

      const filename =
        filenameMatch?.[1] ?? `Catatan_Staff_${from}_sampai_${to}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error("EXPORT EXCEL ERROR:", err);

      setError(
        err instanceof Error ? err.message : "Gagal membuat file Excel laporan",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-5 text-white shadow-lg shadow-indigo-500/15 sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              <ClipboardCheck size={14} />
              Ringkasan Laporan Staff
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Catatan Harian Staff
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
              Ringkasan kelengkapan laporan, kendala, dan aktivitas staff untuk
              kebutuhan monitoring pimpinan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={exporting || loading || !data}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}

              {exporting ? "Menyiapkan Excel..." : "Export Excel"}
            </button>

            <button
              type="button"
              onClick={() => void fetchSummary()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Muat Ulang
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            Periode Laporan
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Senin–Sabtu dihitung sebagai hari kerja. Minggu dan hari libur resmi
            sekolah tidak menurunkan persentase kelengkapan.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["daily", "Harian"],
              ["weekly", "Mingguan"],
              ["monthly", "Bulanan"],
              ["custom", "Custom"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeMode(value)}
              aria-pressed={mode === value}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
          <div>
            {mode === "daily" && (
              <FilterField label="Tanggal">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => changeDaily(e.target.value)}
                  className="input-report"
                />
              </FilterField>
            )}

            {mode === "weekly" && (
              <FilterField label="Pilih Minggu">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => changeWeek(e.target.value)}
                  className="input-report"
                />

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {formatTanggal(from)} – {formatTanggal(to)}
                </p>
              </FilterField>
            )}

            {mode === "monthly" && (
              <FilterField label="Bulan">
                <input
                  type="month"
                  value={from.slice(0, 7)}
                  onChange={(e) => changeMonth(e.target.value)}
                  className="input-report"
                />
              </FilterField>
            )}

            {mode === "custom" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FilterField label="Tanggal Mulai">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="input-report"
                  />
                </FilterField>

                <FilterField label="Tanggal Akhir">
                  <input
                    type="date"
                    min={from}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="input-report"
                  />
                </FilterField>
              </div>
            )}
          </div>

          <FilterField label="Staff">
            <select
              value={selectedStaff}
              disabled={staffLoading}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="input-report"
            >
              <option value="">Semua Staff</option>

              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.nama}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="text-center">
            <Loader2
              size={28}
              className="mx-auto animate-spin text-indigo-600"
            />

            <p className="mt-3 text-sm text-gray-500">
              Menyiapkan ringkasan laporan...
            </p>
          </div>
        </div>
      ) : data ? (
        <>
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">
              Ringkasan Periode
            </p>

            <p className="mt-2 max-w-4xl text-base font-semibold leading-7 text-gray-900 dark:text-gray-100">
              {executiveSummary}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{data.period.workingDayCount} hari kerja efektif</span>
              <span>•</span>
              <span>
                {formatTanggal(data.period.from)} –{" "}
                {formatTanggal(data.period.to)}
              </span>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <SummaryCard
              label="Total Staff"
              value={data.summary.totalStaff}
              detail="Staff aktif"
              icon={Users}
            />

            <SummaryCard
              label="Sudah Lengkap"
              value={data.summary.staffComplete}
              detail="Kelengkapan minimal 90%"
              icon={CheckCircle2}
            />

            <SummaryCard
              label="Perlu Dilengkapi"
              value={data.summary.staffIncomplete}
              detail="Staff belum lengkap"
              icon={Clock3}
            />

            <SummaryCard
              label="Laporan Belum Masuk"
              value={data.summary.missingReports}
              detail={`dari ${data.summary.expectedReports} laporan`}
              icon={XCircle}
            />

            <SummaryCard
              label="Ada Kendala"
              value={data.summary.withIssues}
              detail="Catatan perlu perhatian"
              icon={AlertTriangle}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Kelengkapan Laporan
                </p>

                <div className="mt-2 flex items-end gap-3">
                  <p className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                    {data.summary.readiness === null
                      ? "—"
                      : `${data.summary.readiness}%`}
                  </p>

                  <span
                    className={`mb-1 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                      data.summary.status,
                    )}`}
                  >
                    {statusLabel(data.summary.status)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {formatTanggal(data.period.from)}
                  {" – "}
                  {formatTanggal(data.period.to)}
                </p>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 md:text-right">
                <p>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {data.summary.staffComplete}
                  </span>{" "}
                  staff sudah lengkap
                </p>

                <p className="mt-1">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {data.summary.staffIncomplete}
                  </span>{" "}
                  staff masih perlu melengkapi
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${readinessBarClass(
                  data.summary.status,
                )}`}
                style={{
                  width: `${Math.min(Math.max(readiness, 0), 100)}%`,
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
              <span>🟢 90–100% Lengkap</span>
              <span>🟡 70–89% Perlu dilengkapi</span>
              <span>🔴 &lt;70% Belum lengkap</span>
            </div>

            {data.period.futureDatesExcluded && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
                Tanggal masa depan tidak dihitung. Readiness periode ini hanya
                dihitung sampai{" "}
                {data.period.effectiveTo
                  ? formatTanggal(data.period.effectiveTo)
                  : "hari ini"}
                .
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />

              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  Perlu Perhatian Pimpinan
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Staff dan kendala yang perlu dilihat lebih dulu.
                </p>
              </div>
            </div>

            {incompleteStaff.length === 0 && issueRecords.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={17} />
                  Tidak ada laporan atau kendala yang memerlukan perhatian.
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          Pelaporan Belum Lengkap
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Staff dengan kelengkapan terendah ditampilkan lebih
                          dulu.
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-300">
                        {incompleteStaff.length} staff
                      </span>
                    </div>
                  </div>

                  {incompleteStaff.length === 0 ? (
                    <p className="p-5 text-sm text-gray-400">
                      Semua staff sudah dalam kategori lengkap.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {incompleteStaff.map((staff) => (
                        <div key={staff.id} className="px-5 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {staff.nama}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {staff.submittedReports} dari{" "}
                                {staff.expectedReports} laporan masuk
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {staff.readiness === null
                                  ? "—"
                                  : `${staff.readiness}%`}
                              </p>

                              <p className="mt-0.5 text-[11px] font-semibold text-red-500">
                                {staff.missingReports} laporan belum diisi
                              </p>
                            </div>
                          </div>

                          {staff.missingDates.length > 0 && (
                            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                              Belum isi:{" "}
                              {staff.missingDates
                                .slice(0, 3)
                                .map(formatTanggal)
                                .join(", ")}
                              {staff.missingDates.length > 3
                                ? ` +${staff.missingDates.length - 3} lainnya`
                                : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          Kendala Tercatat
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Kendala terbaru dari catatan harian staff.
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-950/30 dark:text-amber-300">
                        {issueRecords.length} kendala
                      </span>
                    </div>
                  </div>

                  {issueRecords.length === 0 ? (
                    <p className="p-5 text-sm text-gray-400">
                      Tidak ada kendala pada periode ini.
                    </p>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {visibleIssueRecords.map((record) => (
                          <div key={record.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {record.user.nama}
                              </p>

                              <span className="shrink-0 text-xs text-gray-400">
                                {formatTanggal(record.tanggal)}
                              </span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-amber-700 dark:text-amber-300">
                              {record.kendala}
                            </p>
                          </div>
                        ))}
                      </div>

                      {issueRecords.length > 5 && (
                        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                          <button
                            type="button"
                            onClick={() =>
                              setShowAllIssues((current) => !current)
                            }
                            className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                          >
                            {showAllIssues
                              ? "Tampilkan lebih sedikit"
                              : `Lihat semua ${issueRecords.length} kendala`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                Kelengkapan per Staff
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-5 py-3">Staff</th>
                    <th className="px-5 py-3">Laporan</th>
                    <th className="px-5 py-3">Kelengkapan</th>
                    <th className="px-5 py-3">Kendala</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sortedStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{staff.nama}</p>
                        <p className="text-xs text-gray-400">
                          NIP: {staff.nip}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {staff.submittedReports}/{staff.expectedReports}
                      </td>

                      <td className="px-5 py-4 font-bold">
                        {staff.readiness === null ? "—" : `${staff.readiness}%`}
                      </td>

                      <td className="px-5 py-4">{staff.withIssues || "—"}</td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            staff.status,
                          )}`}
                        >
                          {statusLabel(staff.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  Detail Catatan Harian
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {data.records.length} catatan tersedia. Detail disusun per
                  tanggal agar lebih mudah dibaca.
                </p>
              </div>

              {data.records.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (showDetails) {
                      setSelectedDetailDate(null);
                      setSelectedRecordId(null);
                    }

                    setShowDetails((current) => !current);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp size={16} />
                      Tutup Detail
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Lihat {data.records.length} Catatan
                    </>
                  )}
                </button>
              )}
            </div>

            {data.records.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
                Belum ada catatan pada periode yang dipilih.
              </div>
            ) : !showDetails ? (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900/50 dark:hover:bg-indigo-950/10"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {data.records.length} catatan tersedia
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Klik untuk melihat catatan berdasarkan tanggal.
                  </p>
                </div>

                <ChevronDown size={18} className="text-gray-400" />
              </button>
            ) : (
              <div className="space-y-3">
                {recordsByDate.map(([tanggal, records]) => {
                  const dateOpen = selectedDetailDate === tanggal;

                  return (
                    <div
                      key={tanggal}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailDate(dateOpen ? null : tanggal);
                          setSelectedRecordId(null);
                        }}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      >
                        <div>
                          <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <CalendarDays
                              size={16}
                              className="text-indigo-500"
                            />
                            {formatTanggalLengkap(tanggal)}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {records.length} laporan staff
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
                            {records.length}
                          </span>

                          {dateOpen ? (
                            <ChevronUp size={18} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-400" />
                          )}
                        </div>
                      </button>

                      {dateOpen && (
                        <div className="border-t border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/20 sm:p-4">
                          <div className="space-y-2">
                            {records.map((record) => {
                              const recordOpen = selectedRecordId === record.id;

                              return (
                                <article
                                  key={record.id}
                                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedRecordId(
                                        recordOpen ? null : record.id,
                                      )
                                    }
                                    className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                          {record.user.nama}
                                        </p>

                                        {hasIssue(record.kendala) && (
                                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                            Ada Kendala
                                          </span>
                                        )}
                                      </div>

                                      {!recordOpen && (
                                        <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                                          {record.kegiatan}
                                        </p>
                                      )}
                                    </div>

                                    {recordOpen ? (
                                      <ChevronUp
                                        size={16}
                                        className="shrink-0 text-gray-400"
                                      />
                                    ) : (
                                      <ChevronDown
                                        size={16}
                                        className="shrink-0 text-gray-400"
                                      />
                                    )}
                                  </button>

                                  {recordOpen && (
                                    <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                                      <div className="grid gap-3 lg:grid-cols-2">
                                        <DetailBlock
                                          label="Kegiatan"
                                          value={record.kegiatan}
                                        />

                                        <DetailBlock
                                          label="Hasil"
                                          value={record.hasil}
                                        />
                                      </div>

                                      <div className="mt-3">
                                        <DetailBlock
                                          label="Kendala"
                                          value={
                                            hasIssue(record.kendala)
                                              ? record.kendala!
                                              : "Tidak ada kendala"
                                          }
                                        />
                                      </div>

                                      {record.foto.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {record.foto.map((url, index) => (
                                            <a
                                              key={`${record.id}-${index}`}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300"
                                            >
                                              Bukti {index + 1}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      <style jsx global>{`
        .input-report {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(209 213 219);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(17 24 39);
          outline: none;
        }

        .input-report:focus {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 3px rgb(99 102 241 / 0.15);
        }

        .dark .input-report {
          border-color: rgb(55 65 81);
          background: rgb(17 24 39);
          color: rgb(243 244 246);
        }
      `}</style>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
        <Icon size={18} />
      </div>

      <p className="text-2xl font-black">{value}</p>

      <p className="mt-1 text-xs font-semibold">{label}</p>

      <p className="mt-1 text-[11px] text-gray-400">{detail}</p>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
        {value}
      </p>
    </div>
  );
}
