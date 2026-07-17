"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Shield,
  TrendingDown,
  Users,
} from "lucide-react";

interface PelanggaranStats {
  periode: {
    tahunAjaran: string;
    semester: string;
    mingguKe: number;
    bulanLabel: string;
  };
  summary: {
    totalSiswa: number;
    avgApnTotal: number;
    siswaLunas: number;
    siswaKritis: number;
  };
  kategori: { name: string; jumlah: number }[];
  topViolators: {
    siswaId: string;
    nama: string;
    nis: string;
    kelas: string;
    apnTotal: number;
    apnMingguIni: number;
    sisaApTotal: number;
  }[];
  statusDistribusi: { name: string; value: number }[];
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];
const BAR_COLOR = "#6366f1";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-gray-600 dark:text-gray-300">
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function PelanggaranDashboardSection() {
  const [stats, setStats] = useState<PelanggaranStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "/api/rekap-pelanggaran/stats?tahunAjaran=2025/2026&semester=GENAP&mingguKe=1",
        );
        const json = await res.json();
        if (res.ok && !json.error) setStats(json);
        else setStats(null);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm animate-pulse">
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="grid sm:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (!stats || stats.summary.totalSiswa === 0) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-8 text-center">
        <Shield className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={36} />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Belum ada data rekap pelanggaran untuk periode ini
        </p>
        <Link
          href="/rekap-pelanggaran"
          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 mt-2 hover:underline"
        >
          Lihat rekap pelanggaran
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const { summary, kategori, topViolators, statusDistribusi, periode } = stats;
  const topChartData = topViolators.map((s) => ({
    name: s.nama.split(" ")[0],
    fullName: s.nama,
    apn: s.apnTotal,
  }));

  return (
    <section className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield size={18} className="text-rose-600" />
            Rekap Pelanggaran Siswa
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Minggu {periode.mingguKe} · {periode.semester} {periode.tahunAjaran}
            {periode.bulanLabel && ` · ${periode.bulanLabel}`}
          </p>
        </div>
        <Link
          href="/rekap-pelanggaran"
          className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          Detail lengkap
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Siswa",
            value: summary.totalSiswa,
            icon: Users,
            grad: "from-indigo-500 to-indigo-700",
          },
          {
            label: "Rata-rata APN",
            value: summary.avgApnTotal,
            icon: TrendingDown,
            grad: "from-red-500 to-rose-600",
          },
          {
            label: "Siswa Lunas",
            value: summary.siswaLunas,
            icon: CheckCircle2,
            grad: "from-emerald-500 to-teal-600",
          },
          {
            label: "Siswa Kritis",
            value: summary.siswaKritis,
            icon: AlertTriangle,
            grad: "from-amber-500 to-orange-600",
          },
        ].map(({ label, value, icon: Icon, grad }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-xl p-4 text-white shadow-md bg-gradient-to-br ${grad}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className="opacity-90" />
              <p className="text-xs font-medium text-white/90">{label}</p>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
            Pelanggaran per Kategori
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kategori} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200 dark:stroke-gray-700"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="jumlah" name="Jumlah" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
            Status Sisa AP
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribusi}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {statusDistribusi.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {topViolators.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
            Siswa Paling Banyak Pelanggaran
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Berdasarkan APN total minggu ini
          </p>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChartData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                    horizontal={false}
                  />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v) => [v, "APN Total"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName ?? ""
                    }
                  />
                  <Bar dataKey="apn" fill="#ef4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {topViolators.map((s, i) => (
                <li
                  key={s.siswaId}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2.5 bg-gray-50/50 dark:bg-gray-900/30"
                >
                  <span className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {s.nama}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {s.kelas} · NIS {s.nis}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">{s.apnTotal}</p>
                    <p className="text-xs text-gray-400">APN total</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
