"use client";

import { useEffect, useState } from "react";
import {
  FileBarChart2,
  FileSpreadsheet,
  Printer,
  CalendarDays,
  ChevronDown,
  Loader2,
  CircleDashed,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";

interface LaporanItem {
  nama: string;
  nip: string;
  role?: string;

  hadir: number;
  terlambat: number;

  tidakHadir?: number;
  izin?: number;
  sakit?: number;
  alpha?: number;

  total: number;
  persentase: number;
}

interface LaporanData {
  tipe: string;
  periode: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  laporan?: LaporanItem[];
}

export default function LaporanPage() {
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipe, setTipe] = useState("kehadiran");
  const [periode, setPeriode] = useState("bulanan");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split("T")[0],
  );

  const laporan = Array.isArray(data?.laporan) ? data.laporan : [];

  // Summary stats
  const totalHadir = laporan.reduce((s, i) => s + i.hadir, 0);
  const totalTerlambat = laporan.reduce((s, i) => s + i.terlambat, 0);
  const totalIzin = laporan.reduce((s, i) => s + (i.izin ?? 0), 0);

  const totalSakit = laporan.reduce((s, i) => s + (i.sakit ?? 0), 0);

  const totalAlpha = laporan.reduce((s, i) => s + (i.alpha ?? 0), 0);

  const totalBelumPulang = laporan.reduce((s, i) => s + (i.tidakHadir ?? 0), 0);

  const avgPersentase =
    laporan.length > 0
      ? Math.round(
          laporan.reduce((s, i) => s + i.persentase, 0) / laporan.length,
        )
      : 0;

  async function fetchLaporan() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/laporan?tipe=${tipe}&periode=${periode}&tanggal=${tanggal}`,
      );
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLaporan();
  }, [tipe, periode, tanggal]);

  function exportExcel() {
    if (laporan.length === 0) return;
    const headers = [
      "Nama",
      "NIP",
      "Role",
      "Hadir",
      "Terlambat",
      "Izin",
      "Sakit",
      "Alpha",
      "Total",
      "Persentase",
    ];
    const rows = laporan.map((item) => [
      item.nama,
      item.nip,
      item.role ?? "-",
      item.hadir,
      item.terlambat,
      item.izin ?? 0,
      item.sakit ?? 0,
      item.alpha ?? 0,
      item.total,
      `${item.persentase}%`,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-${tipe}-${periode}-${tanggal}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.print();
  }

  const formatTanggal = (tgl?: string) => {
    if (!tgl) return "";
    return new Date(tgl).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const periodeLabel: Record<string, string> = {
    harian: "Harian",
    mingguan: "Mingguan",
    bulanan: "Bulanan",
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <FileBarChart2 size={14} />
              Laporan Absensi
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
            <p className="text-indigo-100/90 text-sm mt-1.5">
              {data?.tanggalMulai && data?.tanggalSelesai
                ? `${formatTanggal(data.tanggalMulai)} – ${formatTanggal(data.tanggalSelesai)}`
                : "Pilih filter untuk menampilkan laporan"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              disabled={laporan.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 border border-white/20 text-sm font-semibold hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
            >
              <FileSpreadsheet size={15} />
              Excel
            </button>
            <button
              onClick={exportPdf}
              disabled={laporan.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 border border-white/20 text-sm font-semibold hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
            >
              <Printer size={15} />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Filter Laporan
        </p>
        <div className="flex gap-4 flex-wrap">
          {/* Jenis */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Jenis Laporan
            </label>
            <div className="relative">
              <select
                value={tipe}
                onChange={(e) => setTipe(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="kehadiran">Kehadiran (Guru & Staff)</option>
                <option value="kepulangan">Kepulangan (Guru & Staff)</option>
                <option value="mengajar">Mengajar (Guru)</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Periode */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Periode
            </label>
            <div className="relative">
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="harian">Harian</option>
                <option value="mingguan">Mingguan</option>
                <option value="bulanan">Bulanan</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Tanggal */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Tanggal
            </label>
            <div className="relative">
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && laporan.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {(tipe === "mengajar"
            ? [
                {
                  label: "Hadir",
                  value: totalHadir,
                  icon: CheckCircle2,
                  color: "text-emerald-600 dark:text-emerald-400",
                  bg: "bg-emerald-50 dark:bg-emerald-950/50",
                  border: "border-emerald-100 dark:border-emerald-900/50",
                },
                {
                  label: "Terlambat",
                  value: totalTerlambat,
                  icon: AlertCircle,
                  color: "text-amber-600 dark:text-amber-400",
                  bg: "bg-amber-50 dark:bg-amber-950/50",
                  border: "border-amber-100 dark:border-amber-900/50",
                },
                {
                  label: "Izin",
                  value: totalIzin,
                  icon: AlertCircle,
                  color: "text-blue-600 dark:text-blue-400",
                  bg: "bg-blue-50 dark:bg-blue-950/50",
                  border: "border-blue-100 dark:border-blue-900/50",
                },
                {
                  label: "Sakit",
                  value: totalSakit,
                  icon: AlertCircle,
                  color: "text-purple-600 dark:text-purple-400",
                  bg: "bg-purple-50 dark:bg-purple-950/50",
                  border: "border-purple-100 dark:border-purple-900/50",
                },
                {
                  label: "Alpha",
                  value: totalAlpha,
                  icon: XCircle,
                  color: "text-red-600 dark:text-red-400",
                  bg: "bg-red-50 dark:bg-red-950/50",
                  border: "border-red-100 dark:border-red-900/50",
                },
                {
                  label: "Rata-rata",
                  value: `${avgPersentase}%`,
                  icon: TrendingUp,
                  color: "text-indigo-600 dark:text-indigo-400",
                  bg: "bg-indigo-50 dark:bg-indigo-950/50",
                  border: "border-indigo-100 dark:border-indigo-900/50",
                },
              ]
            : tipe === "kepulangan"
              ? [
                  {
                    label: "Sudah Pulang",
                    value: totalHadir,
                    icon: CheckCircle2,
                    color: "text-emerald-600 dark:text-emerald-400",
                    bg: "bg-emerald-50 dark:bg-emerald-950/50",
                    border: "border-emerald-100 dark:border-emerald-900/50",
                  },
                  {
                    label: "Belum Pulang",
                    value: totalBelumPulang,
                    icon: XCircle,
                    color: "text-red-600 dark:text-red-400",
                    bg: "bg-red-50 dark:bg-red-950/50",
                    border: "border-red-100 dark:border-red-900/50",
                  },
                  {
                    label: "Rata-rata",
                    value: `${avgPersentase}%`,
                    icon: TrendingUp,
                    color: "text-indigo-600 dark:text-indigo-400",
                    bg: "bg-indigo-50 dark:bg-indigo-950/50",
                    border: "border-indigo-100 dark:border-indigo-900/50",
                  },
                ]
              : [
                  {
                    label: "Hadir",
                    value: totalHadir,
                    icon: CheckCircle2,
                    color: "text-emerald-600 dark:text-emerald-400",
                    bg: "bg-emerald-50 dark:bg-emerald-950/50",
                    border: "border-emerald-100 dark:border-emerald-900/50",
                  },
                  {
                    label: "Terlambat",
                    value: totalTerlambat,
                    icon: AlertCircle,
                    color: "text-amber-600 dark:text-amber-400",
                    bg: "bg-amber-50 dark:bg-amber-950/50",
                    border: "border-amber-100 dark:border-amber-900/50",
                  },
                  {
                    label: "Izin",
                    value: totalIzin,
                    icon: AlertCircle,
                    color: "text-blue-600 dark:text-blue-400",
                    bg: "bg-blue-50 dark:bg-blue-950/50",
                    border: "border-blue-100 dark:border-blue-900/50",
                  },
                  {
                    label: "Sakit",
                    value: totalSakit,
                    icon: AlertCircle,
                    color: "text-purple-600 dark:text-purple-400",
                    bg: "bg-purple-50 dark:bg-purple-950/50",
                    border: "border-purple-100 dark:border-purple-900/50",
                  },
                  {
                    label: "Alpha",
                    value: totalAlpha,
                    icon: XCircle,
                    color: "text-red-600 dark:text-red-400",
                    bg: "bg-red-50 dark:bg-red-950/50",
                    border: "border-red-100 dark:border-red-900/50",
                  },
                  {
                    label: "Rata-rata",
                    value: `${avgPersentase}%`,
                    icon: TrendingUp,
                    color: "text-indigo-600 dark:text-indigo-400",
                    bg: "bg-indigo-50 dark:bg-indigo-950/50",
                    border: "border-indigo-100 dark:border-indigo-900/50",
                  },
                ]
          ).map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 flex items-center gap-3`}
            >
              <div className={`shrink-0 ${stat.color}`}>
                <stat.icon size={20} />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {stat.label}
                </p>

                <p className={`text-xl font-bold tabular-nums ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CalendarDays size={17} className="text-indigo-600" />
              {tipe === "kehadiran"
                ? "Kehadiran Guru & Staff"
                : tipe === "mengajar"
                  ? "Jam Mengajar Guru"
                  : "Kepulangan Guru & Staff"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {periodeLabel[periode]} · {laporan.length} orang
            </p>
          </div>
          {loading && (
            <Loader2 size={18} className="animate-spin text-indigo-500" />
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-indigo-400 mb-3"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Memuat laporan...
            </p>
          </div>
        ) : laporan.length === 0 ? (
          <div className="p-12 text-center">
            <CircleDashed
              size={40}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tidak ada data untuk ditampilkan
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                    NIP
                  </th>
                  {tipe === "kehadiran" && (
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                      Role
                    </th>
                  )}

                  {tipe === "kepulangan" ? (
                    <>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                        Sudah Pulang
                      </th>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                        Belum Pulang
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                        Hadir
                      </th>

                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                        Terlambat
                      </th>

                      {(tipe === "mengajar" || tipe === "kehadiran") && (
                        <>
                          <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                            Izin
                          </th>
                          <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                            Sakit
                          </th>
                          <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                            Alpha
                          </th>
                        </>
                      )}
                    </>
                  )}
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {laporan.map((item, i) => (
                  <tr
                    key={`${item.nip}-${i}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-gray-100">
                      {item.nama}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {item.nip}
                    </td>
                    {tipe === "kehadiran" && (
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full ${
                            item.role === "GURU"
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {item.role ?? "-"}
                        </span>
                      </td>
                    )}
                    {tipe === "kepulangan" ? (
                      <>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                            {item.hadir}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 font-bold text-sm">
                            {item.tidakHadir ?? 0}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                            {item.hadir}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-sm">
                            {item.terlambat}
                          </span>
                        </td>
                      </>
                    )}

                    {(tipe === "mengajar" || tipe === "kehadiran") && (
                      <>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {item.izin ?? 0}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold text-sm">
                            {item.sakit ?? 0}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 font-bold text-sm">
                            {item.alpha ?? 0}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3.5 text-center text-gray-600 dark:text-gray-300 font-semibold">
                      {item.total}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          item.persentase >= 80
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : item.persentase >= 60
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                              : "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                        }`}
                      >
                        {Number.isFinite(Number(item.persentase))
                          ? `${Number(item.persentase)}%`
                          : "0%"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
