"use client";

// src/app/(dashboard)/rekap-pelanggaran/page.tsx
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
  TrendingDown,
  Shield,
  Calendar,
  FileUp,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────────
interface RekapItem {
  id: string;
  mingguKe: number;
  tahunAjaran: string;
  semester: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  subuhS: number;
  subuhI: number;
  subuhA: number;
  dzuhurS: number;
  dzuhurI: number;
  dzuhurA: number;
  asarS: number;
  asarI: number;
  asarA: number;
  magribS: number;
  magribI: number;
  magribA: number;
  isyaS: number;
  isyaI: number;
  isyaA: number;
  btaS: number;
  btaI: number;
  btaA: number;
  kbmS: number;
  kbmI: number;
  kbmA: number;
  ekskulS: number;
  ekskulI: number;
  ekskulA: number;
  vokasionalS: number;
  vokasionalI: number;
  vokasionalA: number;
  piketS: number;
  piketI: number;
  piketA: number;
  lain: number;
  apnMingguIni: number;
  appMingguIni: number;
  sisaApMingguIni: number;
  sisaApMingguLalu: number;
  apnTotal: number;
  appTotal: number;
  sisaApTotal: number;
  noUrut: number | null;
  pembimbingan: string | null;
  keterangan: string | null;
  siswa: {
    id: string;
    nama: string;
    nis: string;
    jenisKelamin: string | null;
    kelas: { id: string; nama: string } | null;
  };
}

interface Kelas {
  id: string;
  nama: string;
}

const TAHUN_AJARAN_OPTIONS = ["2024/2025", "2025/2026", "2026/2027"];
const SEMESTER_OPTIONS = ["GANJIL", "GENAP"];
const MINGGU_OPTIONS = [1, 2, 3, 4, 5];

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function SisaApBadge({ sisa }: { sisa: number }) {
  if (sisa <= 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 size={11} /> Lunas
      </span>
    );
  if (sisa <= 5)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
        <AlertTriangle size={11} /> {sisa}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
      <AlertTriangle size={11} /> {sisa}
    </span>
  );
}

function KeteranganBadge({ nilai }: { nilai: string | null }) {
  if (!nilai)
    return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  const isAktif = nilai.toLowerCase() === "aktif";
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
        isAktif
          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
      }`}
    >
      {nilai}
    </span>
  );
}

function PembimbinganBadge({ nilai }: { nilai: string | null }) {
  if (!nilai)
    return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  const isBK = nilai.toUpperCase().includes("BK");
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        isBK
          ? "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400"
          : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
      }`}
    >
      {nilai}
    </span>
  );
}

// ─── Modal Detail ─────────────────────────────────────────────────────────────────
function DetailModal({
  rekap,
  onClose,
}: {
  rekap: RekapItem;
  onClose: () => void;
}) {
  const kategori = [
    { label: "Subuh", s: rekap.subuhS, i: rekap.subuhI, a: rekap.subuhA },
    { label: "Dzuhur", s: rekap.dzuhurS, i: rekap.dzuhurI, a: rekap.dzuhurA },
    { label: "Asar", s: rekap.asarS, i: rekap.asarI, a: rekap.asarA },
    { label: "Magrib", s: rekap.magribS, i: rekap.magribI, a: rekap.magribA },
    { label: "Isya", s: rekap.isyaS, i: rekap.isyaI, a: rekap.isyaA },
    { label: "BTA/Kitab", s: rekap.btaS, i: rekap.btaI, a: rekap.btaA },
    { label: "KBM", s: rekap.kbmS, i: rekap.kbmI, a: rekap.kbmA },
    { label: "Ekskul", s: rekap.ekskulS, i: rekap.ekskulI, a: rekap.ekskulA },
    {
      label: "Vokasional",
      s: rekap.vokasionalS,
      i: rekap.vokasionalI,
      a: rekap.vokasionalA,
    },
    { label: "Piket", s: rekap.piketS, i: rekap.piketI, a: rekap.piketA },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 opacity-100" />
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-indigo-200 text-xs font-medium mb-0.5">
                  Detail Pelanggaran
                </p>
                <h2 className="font-bold text-white text-lg">
                  {rekap.siswa.nama}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="font-mono text-xs bg-white/20 text-white/90 px-2 py-0.5 rounded-lg">
                    {rekap.siswa.nis}
                  </span>
                  {rekap.siswa.jenisKelamin && (
                    <span className="text-xs font-semibold bg-white/20 text-white/90 px-2 py-0.5 rounded-lg">
                      {rekap.siswa.jenisKelamin}
                    </span>
                  )}
                  {rekap.siswa.kelas && (
                    <span className="text-xs text-indigo-200">
                      {rekap.siswa.kelas.nama}
                    </span>
                  )}
                  <span className="text-xs text-indigo-200">
                    Minggu {rekap.mingguKe} · {rekap.semester}{" "}
                    {rekap.tahunAjaran}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center">
                <p className="text-xs text-red-200 font-medium">
                  APN Minggu Ini
                </p>
                <p className="text-xl font-bold text-white">
                  {rekap.apnMingguIni}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center">
                <p className="text-xs text-emerald-200 font-medium">
                  APP Minggu Ini
                </p>
                <p className="text-xl font-bold text-white">
                  {rekap.appMingguIni}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center">
                <p className="text-xs text-blue-200 font-medium">
                  Sisa AP Lalu
                </p>
                <p className="text-xl font-bold text-white">
                  {rekap.sisaApMingguLalu}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center">
                <p className="text-xs text-red-200 font-medium">APN Total</p>
                <p className="text-xl font-bold text-white">{rekap.apnTotal}</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center">
                <p className="text-xs text-emerald-200 font-medium">
                  APP Total
                </p>
                <p className="text-xl font-bold text-white">{rekap.appTotal}</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center">
                <p className="text-xs text-white/70 font-medium">
                  Sisa AP Total
                </p>
                <p
                  className={`text-xl font-bold ${
                    rekap.sisaApTotal <= 0
                      ? "text-emerald-300"
                      : rekap.sisaApTotal <= 5
                        ? "text-amber-300"
                        : "text-red-300"
                  }`}
                >
                  {rekap.sisaApTotal}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-3 text-xs text-indigo-200 flex-wrap">
              <span className="flex items-center gap-1.5">
                Pembimbingan: <PembimbinganBadge nilai={rekap.pembimbingan} />
              </span>
              <span className="flex items-center gap-1.5">
                Status: <KeteranganBadge nilai={rekap.keterangan} />
              </span>
            </div>
          </div>
        </div>

        {/* Tabel detail */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kegiatan
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wider">
                  Sakit
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                  Izin
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wider">
                  Alpha
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {kategori.map((k) => {
                const total = k.s + k.i + k.a;
                return (
                  <tr
                    key={k.label}
                    className={`transition ${total > 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-900/30"}`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {k.label}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {k.s || (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {k.i || (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {k.a > 0 ? (
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {k.a}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {total > 0 ? (
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {total}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr
                className={`transition ${rekap.lain > 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-900/30"}`}
              >
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                  Lain-lain
                </td>
                <td className="px-4 py-3 text-center text-gray-300 dark:text-gray-600">
                  —
                </td>
                <td className="px-4 py-3 text-center text-gray-300 dark:text-gray-600">
                  —
                </td>
                <td className="px-4 py-3 text-center text-gray-300 dark:text-gray-600">
                  —
                </td>
                <td className="px-4 py-3 text-center">
                  {rekap.lain > 0 ? (
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {rekap.lain}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <p className="text-xs text-gray-400 text-center">
            Periode:{" "}
            {new Date(rekap.tanggalMulai).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
            })}{" "}
            –{" "}
            {new Date(rekap.tanggalAkhir).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          {[...Array(13)].map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div
                className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"
                style={{ width: j === 2 ? "120px" : "40px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${gradient}`}
    >
      <div className="absolute -right-3 -top-3 opacity-20">
        <Icon size={64} strokeWidth={1.5} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 rounded-lg bg-white/20">
            <Icon size={15} />
          </span>
          <p className="text-xs font-medium text-white/90">{label}</p>
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// ─── Filter Select ────────────────────────────────────────────────────────────────
const selectCls =
  "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";

function getBulanLabel(data: RekapItem[]): string {
  if (!data.length) return "";
  const tgl = new Date(data[0].tanggalMulai);
  return tgl.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

// ─── Main Page ────────────────────────────────────────────────────────────────────
export default function RekapPelanggaranPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const canImport = role === "ADMIN";
  const canFilterKelas = ["ADMIN", "PIMPINAN", "GURU", "STAFF"].includes(role);

  const [data, setData] = useState<RekapItem[]>([]);
  const [kelasList, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<RekapItem | null>(null);

  const [tahunAjaran, setTahunAjaran] = useState(TAHUN_AJARAN_OPTIONS[1]);
  const [semester, setSemester] = useState(SEMESTER_OPTIONS[1]);
  const [mingguKe, setMingguKe] = useState<number>(1);
  const [kelasId, setKelasId] = useState("");
  const [sortBy, setSortBy] = useState<"nama" | "apnTotal" | "sisaApTotal">(
    "nama",
  );
  const [sortAsc, setSortAsc] = useState(true);

  async function fetchRekap() {
    setLoading(true);
    const params = new URLSearchParams({
      tahunAjaran,
      semester,
      mingguKe: String(mingguKe),
      ...(kelasId ? { kelasId } : {}),
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/rekap-pelanggaran?${params}`);
    const json = await res.json();
    setData(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  async function fetchKelas() {
    const res = await fetch("/api/kelas");
    const json = await res.json();
    setKelas(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    fetchKelas();
  }, []);
  useEffect(() => {
    fetchRekap();
  }, [tahunAjaran, semester, mingguKe, kelasId]);
  useEffect(() => {
    const t = setTimeout(() => fetchRekap(), 400);
    return () => clearTimeout(t);
  }, [search]);

  const sorted = [...data].sort((a, b) => {
    let va: string | number, vb: string | number;
    if (sortBy === "nama") {
      va = a.siswa.nama;
      vb = b.siswa.nama;
    } else if (sortBy === "apnTotal") {
      va = a.apnTotal;
      vb = b.apnTotal;
    } else {
      va = a.sisaApTotal;
      vb = b.sisaApTotal;
    }
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortAsc((a) => !a);
    else {
      setSortBy(col);
      setSortAsc(true);
    }
  }

  function SortIcon({ col }: { col: typeof sortBy }) {
    if (sortBy !== col)
      return (
        <ChevronDown size={12} className="text-gray-300 dark:text-gray-600" />
      );
    return sortAsc ? (
      <ChevronUp size={12} className="text-indigo-500" />
    ) : (
      <ChevronDown size={12} className="text-indigo-500" />
    );
  }

  const bulanLabel = getBulanLabel(data);
  const totalSiswa = data.length;
  const avgApnTotal = totalSiswa
    ? Math.round(data.reduce((s, r) => s + r.apnTotal, 0) / totalSiswa)
    : 0;
  const siswaLunas = data.filter((r) => r.sisaApTotal <= 0).length;
  const siswaKritis = data.filter((r) => r.sisaApTotal > 10).length;

  return (
    <div className="space-y-6">
      {detail && <DetailModal rekap={detail} onClose={() => setDetail(null)} />}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <Shield size={14} />
              Data Pelanggaran Siswa
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Rekap Pelanggaran
            </h1>
            <p className="text-indigo-100/90 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
              Data pelanggaran siswa per minggu
              {!canImport && canFilterKelas && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-white/15 border border-white/20">
                  Hanya baca
                </span>
              )}
              {!loading && bulanLabel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/15 border border-white/20">
                  <Calendar size={10} /> {bulanLabel}
                </span>
              )}
            </p>
          </div>
          {canImport && (
            <Link
              href="/rekap-pelanggaran/import"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-sm font-semibold hover:bg-white/25 transition-all backdrop-blur-sm"
            >
              <FileUp size={16} />
              Import Excel
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      {!loading && data.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Siswa"
            value={totalSiswa}
            icon={Users}
            gradient="from-indigo-500 to-indigo-700"
          />
          <StatCard
            label="Rata-rata APN Total"
            value={avgApnTotal}
            icon={TrendingDown}
            gradient="from-red-500 to-rose-600"
          />
          <StatCard
            label="Siswa Lunas"
            value={siswaLunas}
            icon={CheckCircle2}
            gradient="from-emerald-500 to-teal-600"
          />
          <StatCard
            label="Siswa Kritis (>10)"
            value={siswaKritis}
            icon={AlertTriangle}
            gradient="from-amber-500 to-orange-600"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">
            <Filter size={14} />
            Filter
          </div>

          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            className={selectCls}
          >
            {TAHUN_AJARAN_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className={selectCls}
          >
            {SEMESTER_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={mingguKe}
            onChange={(e) => setMingguKe(Number(e.target.value))}
            className={selectCls}
          >
            {MINGGU_OPTIONS.map((m) => (
              <option key={m} value={m}>
                Minggu {m}
              </option>
            ))}
          </select>

          {canFilterKelas && (
            <select
              value={kelasId}
              onChange={(e) => setKelasId(e.target.value)}
              className={selectCls}
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full pl-8 pr-8 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  {[
                    "No",
                    "L/P",
                    "Siswa",
                    "Kelas",
                    "Sisa AP Lalu",
                    "APN",
                    "APP",
                    "APN Total",
                    "APP Total",
                    "Sisa AP",
                    "Pembimbingan",
                    "Status",
                    "Aksi",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SkeletonRows />
              </tbody>
            </table>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-indigo-400" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Tidak ada data rekap
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
              {canImport
                ? "Import data Excel untuk minggu ini terlebih dahulu"
                : "Belum ada rekap pelanggaran untuk periode ini"}
            </p>
            {canImport && (
              <Link
                href="/rekap-pelanggaran/import"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 hover:from-indigo-700 hover:to-violet-700 transition-all"
              >
                <FileUp size={15} />
                Import Excel
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    No
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    L/P
                  </th>
                  <th className="px-4 py-3.5 text-left">
                    <button
                      onClick={() => toggleSort("nama")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-indigo-600 transition"
                    >
                      Siswa <SortIcon col="nama" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                    Kelas
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-blue-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Sisa AP Lalu
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-red-400 uppercase tracking-wider text-center">
                    APN
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider text-center">
                    APP
                  </th>
                  <th className="px-4 py-3.5 text-left">
                    <button
                      onClick={() => toggleSort("apnTotal")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-500 uppercase tracking-wider hover:text-red-600 transition"
                    >
                      APN Total <SortIcon col="apnTotal" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-emerald-500 uppercase tracking-wider text-center whitespace-nowrap">
                    APP Total
                  </th>
                  <th className="px-4 py-3.5 text-left">
                    <button
                      onClick={() => toggleSort("sisaApTotal")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-indigo-600 transition"
                    >
                      Sisa AP <SortIcon col="sisaApTotal" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">
                    Pembimbingan
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sorted.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition group"
                  >
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs font-mono text-gray-400">
                        {r.noUrut ?? idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {r.siswa.jenisKelamin ? (
                        <span
                          className={`text-xs font-bold ${r.siswa.jenisKelamin === "L" ? "text-blue-600 dark:text-blue-400" : "text-pink-600 dark:text-pink-400"}`}
                        >
                          {r.siswa.jenisKelamin}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/80 transition">
                          <Users
                            size={15}
                            className="text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {r.siswa.nama}
                          </p>
                          <p className="font-mono text-xs text-gray-400 mt-0.5">
                            {r.siswa.nis}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                      {r.siswa.kelas?.nama ?? (
                        <span className="italic text-gray-300 dark:text-gray-600 text-xs">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`font-semibold text-sm ${r.sisaApMingguLalu > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600"}`}
                      >
                        {r.sisaApMingguLalu || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`font-bold text-sm ${r.apnMingguIni > 0 ? "text-red-500 dark:text-red-400" : "text-gray-300 dark:text-gray-600"}`}
                      >
                        {r.apnMingguIni || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`font-bold text-sm ${r.appMingguIni > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"}`}
                      >
                        {r.appMingguIni || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`font-bold text-base ${r.apnTotal > 0 ? "text-red-600 dark:text-red-400" : "text-gray-300 dark:text-gray-600"}`}
                      >
                        {r.apnTotal || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`font-bold text-base ${r.appTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"}`}
                      >
                        {r.appTotal || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <SisaApBadge sisa={r.sisaApTotal} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <PembimbinganBadge nilai={r.pembimbingan} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <KeteranganBadge nilai={r.keterangan} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setDetail(r)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 text-xs font-semibold transition whitespace-nowrap"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && sorted.length > 0 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Menampilkan {sorted.length} siswa · Minggu {mingguKe} · {semester}{" "}
            {tahunAjaran}
          </p>
          {bulanLabel && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Calendar size={11} /> {bulanLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
