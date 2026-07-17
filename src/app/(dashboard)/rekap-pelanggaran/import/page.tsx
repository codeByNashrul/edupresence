"use client";

// src/app/(dashboard)/rekap-pelanggaran/import/page.tsx
import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";

// ─── Tipe ──────────────────────────────────────────────────────────────────────
interface ParsedRow {
  nis: string;
  nama?: string;

  // Sholat
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

  // Kegiatan
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

  // Minggu ini
  apnMingguIni: number;
  appMingguIni: number;

  // Akumulasi minggu lalu (diisi manual dari Excel)
  sisaApMingguLalu: number;

  // Akumulasi keseluruhan
  apnTotal: number;
  appTotal: number;
  sisaApTotal: number;
  noUrut: number | null;

  // Pembimbingan & keterangan
  pembimbingan: string | null;
  keterangan: string | null;
}

// ─── Mapping header Excel → field internal ────────────────────────────────────
// Dukung berbagai variasi penulisan nama kolom di Excel (spasi, underscore, case-insensitive)
const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  // Identitas
  nis: "nis",
  "no. induk": "nis",
  "no induk": "nis",
  nama: "nama",
  "nama santri": "nama",
  "nama siswa": "nama",

  // Subuh
  "subuh s": "subuhS",
  subuh_s: "subuhS",
  "subuh i": "subuhI",
  subuh_i: "subuhI",
  "subuh a": "subuhA",
  subuh_a: "subuhA",

  // Dzuhur
  "dzuhur s": "dzuhurS",
  dzuhur_s: "dzuhurS",
  "dzuhur i": "dzuhurI",
  dzuhur_i: "dzuhurI",
  "dzuhur a": "dzuhurA",
  dzuhur_a: "dzuhurA",

  // Asar
  "asar s": "asarS",
  asar_s: "asarS",
  "asar i": "asarI",
  asar_i: "asarI",
  "asar a": "asarA",
  asar_a: "asarA",

  // Magrib
  "magrib s": "magribS",
  magrib_s: "magribS",
  "magrib i": "magribI",
  magrib_i: "magribI",
  "magrib a": "magribA",
  magrib_a: "magribA",

  // Isya
  "isya s": "isyaS",
  isya_s: "isyaS",
  "isya i": "isyaI",
  isya_i: "isyaI",
  "isya a": "isyaA",
  isya_a: "isyaA",

  // BTA/Kitab
  "bta s": "btaS",
  bta_s: "btaS",
  "kitab s": "btaS",
  "bta i": "btaI",
  bta_i: "btaI",
  "kitab i": "btaI",
  "bta a": "btaA",
  bta_a: "btaA",
  "kitab a": "btaA",

  // KBM
  "kbm s": "kbmS",
  kbm_s: "kbmS",
  "kbm i": "kbmI",
  kbm_i: "kbmI",
  "kbm a": "kbmA",
  kbm_a: "kbmA",

  // Ekskul
  "ekskul s": "ekskulS",
  ekskul_s: "ekskulS",
  "ekstrakurikuler s": "ekskulS",
  "ekskul i": "ekskulI",
  ekskul_i: "ekskulI",
  "ekstrakurikuler i": "ekskulI",
  "ekskul a": "ekskulA",
  ekskul_a: "ekskulA",
  "ekstrakurikuler a": "ekskulA",

  // Vokasional
  "vokasional s": "vokasionalS",
  vokasional_s: "vokasionalS",
  "vokasional i": "vokasionalI",
  vokasional_i: "vokasionalI",
  "vokasional a": "vokasionalA",
  vokasional_a: "vokasionalA",

  // Piket
  "piket s": "piketS",
  piket_s: "piketS",
  "piket i": "piketI",
  piket_i: "piketI",
  "piket a": "piketA",
  piket_a: "piketA",

  // Lain-lain
  lain: "lain",
  "lain-lain": "lain",
  lainnya: "lain",

  // Minggu ini
  apn: "apnMingguIni",
  "apn minggu ini": "apnMingguIni",
  "angka pelanggaran": "apnMingguIni",
  app: "appMingguIni",
  "app minggu ini": "appMingguIni",
  penebusan: "appMingguIni",

  // Akumulasi minggu lalu
  "sisa ap lalu": "sisaApMingguLalu",
  "sisa ap minggu lalu": "sisaApMingguLalu",
  "akumulasi lalu": "sisaApMingguLalu",

  // Akumulasi keseluruhan
  "apn total": "apnTotal",
  "total apn": "apnTotal",
  "akumulasi apn": "apnTotal",
  "app total": "appTotal",
  "total app": "appTotal",
  "akumulasi app": "appTotal",
  "sisa ap": "sisaApTotal",
  "sisa ap total": "sisaApTotal",
  "total sisa ap": "sisaApTotal",
  "no urut": "noUrut",
  "no. urut": "noUrut",
  "nomor urut": "noUrut",

  // Pembimbingan & keterangan
  pembimbingan: "pembimbingan",
  "pembimbingan kepada": "pembimbingan",
  keterangan: "keterangan",
  status: "keterangan",
};

const TAHUN_AJARAN_OPTIONS = ["2024/2025", "2025/2026", "2026/2027"];
const SEMESTER_OPTIONS = ["GANJIL", "GENAP"];
const MINGGU_OPTIONS = [1, 2, 3, 4, 5];

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  return String(v).trim();
}

// ─── Komponen detail kategori (collapsed) ─────────────────────────────────────
function KategoriDetail({ row }: { row: ParsedRow }) {
  const [open, setOpen] = useState(false);

  const kategori = [
    { label: "Subuh", s: row.subuhS, i: row.subuhI, a: row.subuhA },
    { label: "Dzuhur", s: row.dzuhurS, i: row.dzuhurI, a: row.dzuhurA },
    { label: "Asar", s: row.asarS, i: row.asarI, a: row.asarA },
    { label: "Magrib", s: row.magribS, i: row.magribI, a: row.magribA },
    { label: "Isya", s: row.isyaS, i: row.isyaI, a: row.isyaA },
    { label: "BTA/Kitab", s: row.btaS, i: row.btaI, a: row.btaA },
    { label: "KBM", s: row.kbmS, i: row.kbmI, a: row.kbmA },
    { label: "Ekskul", s: row.ekskulS, i: row.ekskulI, a: row.ekskulA },
    {
      label: "Vokasional",
      s: row.vokasionalS,
      i: row.vokasionalI,
      a: row.vokasionalA,
    },
    { label: "Piket", s: row.piketS, i: row.piketI, a: row.piketA },
  ];

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        Detail{" "}
        <ChevronDown
          size={12}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">
                  Kategori
                </th>
                <th className="px-3 py-1.5 text-blue-500 font-medium">S</th>
                <th className="px-3 py-1.5 text-amber-500 font-medium">I</th>
                <th className="px-3 py-1.5 text-red-500 font-medium">A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {kategori.map((k) => (
                <tr key={k.label}>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                    {k.label}
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400">
                    {k.s || "—"}
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400">
                    {k.i || "—"}
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400">
                    {k.a || "—"}
                  </td>
                </tr>
              ))}
              {/* Lain-lain */}
              {row.lain > 0 && (
                <tr>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                    Lain-lain
                  </td>
                  <td
                    colSpan={3}
                    className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400"
                  >
                    {row.lain}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ImportRekapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/rekap-pelanggaran");
    }
  }, [status, session, router]);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [parseError, setParseError] = useState("");

  // Meta minggu
  const [mingguKe, setMingguKe] = useState<number>(1);
  const [tahunAjaran, setTahunAjaran] = useState(TAHUN_AJARAN_OPTIONS[1]); // default 2025/2026
  const [semester, setSemester] = useState(SEMESTER_OPTIONS[1]); // default GENAP
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    berhasil: number;
    gagal: number;
    errors: string[];
  } | null>(null);

  // ── Parse Excel ──────────────────────────────────────────────────────────────
  function parseFile(file: File) {
    setParseError("");
    setRows([]);
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: 0,
        });

        if (raw.length === 0) {
          setParseError("File Excel kosong atau format tidak dikenali");
          return;
        }

        const parsed: ParsedRow[] = raw
          .map((r) => {
            // Map semua kolom Excel ke field internal
            const mapped: Record<string, unknown> = {};
            Object.entries(r).forEach(([k, v]) => {
              const key = COLUMN_MAP[k.toLowerCase().trim()];
              if (key) mapped[key] = v;
            });

            return {
              nis: String(mapped.nis ?? ""),
              nama: String(mapped.nama ?? ""),

              subuhS: num(mapped.subuhS),
              subuhI: num(mapped.subuhI),
              subuhA: num(mapped.subuhA),
              dzuhurS: num(mapped.dzuhurS),
              dzuhurI: num(mapped.dzuhurI),
              dzuhurA: num(mapped.dzuhurA),
              asarS: num(mapped.asarS),
              asarI: num(mapped.asarI),
              asarA: num(mapped.asarA),
              magribS: num(mapped.magribS),
              magribI: num(mapped.magribI),
              magribA: num(mapped.magribA),
              isyaS: num(mapped.isyaS),
              isyaI: num(mapped.isyaI),
              isyaA: num(mapped.isyaA),

              btaS: num(mapped.btaS),
              btaI: num(mapped.btaI),
              btaA: num(mapped.btaA),
              kbmS: num(mapped.kbmS),
              kbmI: num(mapped.kbmI),
              kbmA: num(mapped.kbmA),
              ekskulS: num(mapped.ekskulS),
              ekskulI: num(mapped.ekskulI),
              ekskulA: num(mapped.ekskulA),
              vokasionalS: num(mapped.vokasionalS),
              vokasionalI: num(mapped.vokasionalI),
              vokasionalA: num(mapped.vokasionalA),
              piketS: num(mapped.piketS),
              piketI: num(mapped.piketI),
              piketA: num(mapped.piketA),
              lain: num(mapped.lain),

              apnMingguIni: num(mapped.apnMingguIni),
              appMingguIni: num(mapped.appMingguIni),
              sisaApMingguLalu: num(mapped.sisaApMingguLalu),

              apnTotal: num(mapped.apnTotal),
              appTotal: num(mapped.appTotal),
              sisaApTotal: num(mapped.sisaApTotal),
              noUrut:
                mapped.noUrut != null && mapped.noUrut !== 0
                  ? num(mapped.noUrut)
                  : null,

              pembimbingan: str(mapped.pembimbingan),
              keterangan: str(mapped.keterangan),
            };
          })
          .filter((r) => r.nis && r.nis !== "0"); // buang baris tanpa NIS

        if (parsed.length === 0) {
          setParseError(
            "Tidak ada baris valid (pastikan kolom NIS ada dan terisi)",
          );
          return;
        }

        setRows(parsed);
      } catch (err) {
        setParseError("Gagal membaca file. Pastikan format .xlsx valid.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }, []);

  function clearFile() {
    setRows([]);
    setFileName("");
    setParseError("");
    setResult(null);
  }

  async function handleSubmit() {
    if (!rows.length || !tanggalMulai || !tanggalAkhir) return;
    setSubmitting(true);
    setResult(null);

    const res = await fetch("/api/rekap-pelanggaran/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows,
        mingguKe,
        tahunAjaran,
        semester,
        tanggalMulai,
        tanggalAkhir,
      }),
    });

    const data = await res.json();
    setResult(data);
    setSubmitting(false);
    if (data.berhasil > 0) {
      setRows([]);
      setFileName("");
    }
  }

  const canSubmit =
    rows.length > 0 && tanggalMulai && tanggalAkhir && !submitting;

  if (
    status === "loading" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return (
      <div className="max-w-5xl p-12 text-center text-gray-500">
        Memuat...
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Import Rekap Pelanggaran
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload file Excel rekap mingguan dari TU
        </p>
      </div>

      {/* Result Banner */}
      {result && (
        <div
          className={`mb-6 rounded-2xl p-4 border flex items-start gap-3 ${
            result.gagal === 0
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
          }`}
        >
          {result.gagal === 0 ? (
            <CheckCircle2
              size={20}
              className="text-emerald-500 shrink-0 mt-0.5"
            />
          ) : (
            <AlertTriangle
              size={20}
              className="text-amber-500 shrink-0 mt-0.5"
            />
          )}
          <div className="flex-1">
            <p
              className={`font-semibold text-sm ${result.gagal === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
            >
              Import selesai — {result.berhasil} berhasil, {result.gagal} gagal
            </p>
            {result.errors?.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5"
                  >
                    <XCircle size={12} /> {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Panel Kiri: Meta + Upload ── */}
        <div className="space-y-4">
          {/* Meta minggu */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm flex items-center gap-2">
              <Info size={15} className="text-indigo-600" />
              Informasi Minggu
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Tahun Ajaran
                </label>
                <select
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TAHUN_AJARAN_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SEMESTER_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Minggu Ke
                </label>
                <select
                  value={mingguKe}
                  onChange={(e) => setMingguKe(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {MINGGU_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      Minggu {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Tanggal Mulai (Senin)
                </label>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Tanggal Akhir (Ahad)
                </label>
                <input
                  type="date"
                  value={tanggalAkhir}
                  onChange={(e) => setTanggalAkhir(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Upload area */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-emerald-600" />
              File Excel
            </h2>

            {!fileName ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition ${
                  dragging
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                  <Upload size={22} className="text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drop file di sini
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    atau klik untuk pilih file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <FileSpreadsheet
                  size={20}
                  className="text-emerald-600 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                    {fileName}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {rows.length} baris ditemukan
                  </p>
                </div>
                <button
                  onClick={clearFile}
                  className="text-gray-400 hover:text-red-500 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {parseError && (
              <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-3 py-2.5 rounded-xl text-xs">
                <XCircle size={14} className="shrink-0" />
                {parseError}
              </div>
            )}
          </div>

          {/* Info format kolom */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 text-xs text-indigo-700 dark:text-indigo-300">
            <p className="font-semibold mb-1.5">
              Format kolom Excel yang didukung:
            </p>
            <div className="space-y-1 font-mono opacity-80 leading-relaxed">
              <p>NIS | Nama | Subuh S/I/A | Dzuhur S/I/A</p>
              <p>Asar S/I/A | Magrib S/I/A | Isya S/I/A</p>
              <p>BTA S/I/A | KBM S/I/A | Ekskul S/I/A</p>
              <p>Vokasional S/I/A | Piket S/I/A | Lain</p>
              <p>APN | APP | Sisa AP Lalu</p>
              <p>APN Total | APP Total | Sisa AP Total</p>
              <p>No Urut | Pembimbingan | Keterangan</p>
            </div>
          </div>

          {/* Tombol submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-3 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Upload size={16} /> Import{" "}
                {rows.length > 0 ? `${rows.length} Siswa` : ""}
              </>
            )}
          </button>
        </div>

        {/* ── Panel Kanan: Preview Tabel ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
              Preview Data
            </h2>
            {rows.length > 0 && (
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-full font-medium">
                {rows.length} siswa
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Belum ada file dipilih
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Upload file Excel untuk melihat preview
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      NIS
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Nama
                    </th>
                    {/* Minggu ini */}
                    <th className="text-center px-4 py-3 text-xs font-semibold text-red-400 uppercase tracking-wider whitespace-nowrap">
                      APN
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                      APP
                    </th>
                    {/* Akumulasi */}
                    <th className="text-center px-4 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wider whitespace-nowrap">
                      Sisa AP Lalu
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wider whitespace-nowrap">
                      APN Total
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-emerald-500 uppercase tracking-wider whitespace-nowrap">
                      APP Total
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Sisa AP
                    </th>
                    {/* Pembimbingan */}
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Pembimbingan
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    {/* Detail */}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
                    >
                      {/* NIS */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg">
                          {row.nis}
                        </span>
                      </td>

                      {/* Nama */}
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {row.nama || (
                          <span className="italic text-gray-400 text-xs">
                            —
                          </span>
                        )}
                      </td>

                      {/* APN minggu ini */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-sm ${row.apnMingguIni > 0 ? "text-red-500 dark:text-red-400" : "text-gray-300 dark:text-gray-600"}`}
                        >
                          {row.apnMingguIni || "—"}
                        </span>
                      </td>

                      {/* APP minggu ini */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-sm ${row.appMingguIni > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"}`}
                        >
                          {row.appMingguIni || "—"}
                        </span>
                      </td>

                      {/* Sisa AP Lalu */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-semibold text-sm ${row.sisaApMingguLalu > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600"}`}
                        >
                          {row.sisaApMingguLalu || "—"}
                        </span>
                      </td>

                      {/* APN Total */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-sm ${row.apnTotal > 0 ? "text-red-600 dark:text-red-400" : "text-gray-300 dark:text-gray-600"}`}
                        >
                          {row.apnTotal || "—"}
                        </span>
                      </td>

                      {/* APP Total */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-sm ${row.appTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"}`}
                        >
                          {row.appTotal || "—"}
                        </span>
                      </td>

                      {/* Sisa AP Total */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center font-bold text-sm min-w-[2.5rem] h-7 px-2 rounded-lg ${
                            row.sisaApTotal > 10
                              ? "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                              : row.sisaApTotal > 0
                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {row.sisaApTotal}
                        </span>
                      </td>

                      {/* Pembimbingan */}
                      <td className="px-4 py-3 text-center">
                        {row.pembimbingan ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              row.pembimbingan.toUpperCase().includes("BK")
                                ? "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400"
                                : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {row.pembimbingan}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">
                            —
                          </span>
                        )}
                      </td>

                      {/* Status/Keterangan */}
                      <td className="px-4 py-3 text-center">
                        {row.keterangan ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              row.keterangan.toLowerCase() === "aktif"
                                ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                            }`}
                          >
                            {row.keterangan}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">
                            —
                          </span>
                        )}
                      </td>

                      {/* Detail S/I/A per kategori */}
                      <td className="px-4 py-3">
                        <KategoriDetail row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
