"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck,
  FileSearch,
  FileText,
  Paperclip,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

interface Izin {
  id: string;
  jenisIzin: string;
  jenisCustom: string | null;
  tanggalMulai: string;
  tanggalAkhir: string;
  keterangan: string;
  suratUrl: string | null;
  status: string;
  createdAt: string;
  user: { id: string; nama: string; nip: string; role: string };
}

const jenisIzinOptions = [
  {
    value: "SAKIT",
    label: "Sakit",
    color:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  },
  {
    value: "IZIN",
    label: "Izin",
    color:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  {
    value: "DINAS_LUAR",
    label: "Dinas Luar",
    color:
      "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
  {
    value: "CUTI",
    label: "Cuti",
    color:
      "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
  },
  {
    value: "LAINNYA",
    label: "Lainnya",
    color:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
];

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  APPROVED: {
    label: "Disetujui",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  DITOLAK: {
    label: "Ditolak",
    icon: XCircle,
    className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    icon: AlertCircle,
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

const roleLabel: Record<string, string> = {
  GURU: "Guru",
  STAFF: "Staff",
};

function getJenisLabel(izin: Izin) {
  if (izin.jenisIzin === "LAINNYA") return izin.jenisCustom ?? "Lainnya";
  return (
    jenisIzinOptions.find((j) => j.value === izin.jenisIzin)?.label ??
    izin.jenisIzin
  );
}

function getJenisColor(jenisIzin: string) {
  return jenisIzinOptions.find((j) => j.value === jenisIzin)?.color ?? "";
}

function hitungHari(mulai: string, akhir: string) {
  const diff = new Date(akhir).getTime() - new Date(mulai).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function formatTanggal(tgl: string) {
  return new Date(tgl).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MonitorIzinPage() {
  const [izinList, setIzinList] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [bulan, setBulan] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  async function fetchIzin() {
    setLoading(true);
    const res = await fetch(`/api/izin?bulan=${bulan}`);
    const data = await res.json();
    setIzinList(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchIzin();
  }, [bulan]);

  async function handleBatalkan(id: string) {
    if (!confirm("Yakin ingin membatalkan izin ini?")) return;
    await fetch(`/api/izin/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DIBATALKAN" }),
    });
    fetchIzin();
  }

  // Filter
  const filtered = izinList.filter((izin) => {
    const matchSearch =
      search === "" ||
      izin.user.nama.toLowerCase().includes(search.toLowerCase()) ||
      izin.user.nip.includes(search);
    const matchJenis = filterJenis === "" || izin.jenisIzin === filterJenis;
    const matchRole = filterRole === "" || izin.user.role === filterRole;
    return matchSearch && matchJenis && matchRole;
  });

  // Statistik
  const totalApproved = izinList.filter((i) => i.status === "APPROVED").length;
  const totalSakit = izinList.filter(
    (i) => i.jenisIzin === "SAKIT" && i.status === "APPROVED",
  ).length;
  const totalIzin = izinList.filter(
    (i) => i.jenisIzin === "IZIN" && i.status === "APPROVED",
  ).length;
  const totalDinas = izinList.filter(
    (i) => i.jenisIzin === "DINAS_LUAR" && i.status === "APPROVED",
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Monitor Izin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pantau pengajuan izin guru & staff
          </p>
        </div>
        <input
          type="month"
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Pengajuan",
            value: totalApproved,
            color: "text-indigo-600",
          },
          { label: "Sakit", value: totalSakit, color: "text-red-500" },
          { label: "Izin", value: totalIzin, color: "text-amber-500" },
          { label: "Dinas Luar", value: totalDinas, color: "text-blue-500" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4 flex gap-3 flex-wrap items-center shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIP..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Jenis */}
        <select
          value={filterJenis}
          onChange={(e) => setFilterJenis(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Jenis</option>
          {jenisIzinOptions.map((j) => (
            <option key={j.value} value={j.value}>
              {j.label}
            </option>
          ))}
        </select>

        {/* Filter Role */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Guru & Staff</option>
          <option value="GURU">Guru</option>
          <option value="STAFF">Staff</option>
        </select>

        <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {filtered.length} pengajuan
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
          <FileSearch
            size={40}
            className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
          />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Tidak ada pengajuan izin
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Coba ubah filter atau periode bulan
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((izin) => {
            const sc = statusConfig[izin.status] ?? statusConfig.APPROVED;
            const StatusIcon = sc.icon;
            const hari = hitungHari(izin.tanggalMulai, izin.tanggalAkhir);

            return (
              <div
                key={izin.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
              >
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                      <FileCheck
                        size={15}
                        className="text-indigo-600 dark:text-indigo-400"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {izin.user.nama}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 font-mono">
                          {izin.user.nip}
                        </span>
                        <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium">
                          {roleLabel[izin.user.role] ?? izin.user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getJenisColor(izin.jenisIzin)}`}
                    >
                      {getJenisLabel(izin)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sc.className}`}
                    >
                      <StatusIcon size={12} />
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <CalendarDays size={15} className="text-indigo-500" />
                      <span>
                        {formatTanggal(izin.tanggalMulai)}
                        {izin.tanggalMulai !== izin.tanggalAkhir && (
                          <> — {formatTanggal(izin.tanggalAkhir)}</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock size={15} className="text-indigo-500" />
                      <span>{hari} hari</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
                    {izin.keterangan}
                  </p>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {izin.suratUrl ? (
                      <a
                        href={izin.suratUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-lg transition"
                      >
                        <Paperclip size={13} />
                        Lihat Surat Keterangan
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Tidak ada surat
                      </span>
                    )}

                    {izin.status === "APPROVED" && (
                      <button
                        onClick={() => handleBatalkan(izin.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg transition"
                      >
                        <X size={13} />
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
