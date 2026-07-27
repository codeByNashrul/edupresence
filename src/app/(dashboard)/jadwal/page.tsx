"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  Download,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CircleDashed,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Clock,
  ChevronDown,
  X,
  XCircle,
} from "lucide-react";

const HARI_LIST = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

interface Jadwal {
  id: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  guru: {
    id: string;
    user: { nama: string; noWa: string | null };
  };
  kelas: { id: string; nama: string };
  mataPelajaran: { id: string; nama: string };
  ruangan: { id: string; nama: string };
  absensiHariIni?: { status: string; waktuScan: string } | null;
}

interface Guru {
  id: string;
  nama: string;
  guru: { id: string };
}
interface Kelas {
  id: string;
  nama: string;
}
interface Mapel {
  id: string;
  nama: string;
  kode: string;
}
interface Ruangan {
  id: string;
  nama: string;
}

type StatusManual = "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT" | "ALPHA";

type ImportRowStatus = "VALID" | "ERROR" | "DUPLIKAT";

type SemesterAkademik = "GANJIL" | "GENAP";

function getTahunAjaranSekarang() {
  const now = new Date();
  const tahun = now.getFullYear();
  const bulan = now.getMonth() + 1;

  const tahunMulai = bulan >= 7 ? tahun : tahun - 1;

  return `${tahunMulai}/${tahunMulai + 1}`;
}

function getSemesterSekarang(): SemesterAkademik {
  const bulan = new Date().getMonth() + 1;

  return bulan >= 7 ? "GANJIL" : "GENAP";
}

interface ImportPreviewRow {
  rowNumber: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  nipGuru: string;
  namaGuru: string | null;
  kodeMapel: string;
  namaMapel: string | null;
  kelas: string;
  ruangan: string;
  status: ImportRowStatus;
  errors: string[];
}

interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  imported?: number;
}

interface ImportResponse {
  success?: boolean;
  action?: "preview" | "commit";
  message?: string;
  error?: string;

  periode?: {
    tahunAjaran: string;
    semester: SemesterAkademik;
  };

  summary?: ImportSummary;
  rows?: ImportPreviewRow[];
}

const inputCls =
  "w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";

const selectWrap = "relative";
const selectArrow = (
  <ChevronDown
    size={14}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
  />
);

export default function JadwalPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const isAdmin = role === "ADMIN";

  const canInputStatus = ["ADMIN", "PIKET"].includes(role);

  const canViewStatus = ["ADMIN", "PIMPINAN", "PIKET"].includes(role);
  const tahunAjaranBerjalan = getTahunAjaranSekarang();

  const semesterBerjalan =
    getSemesterSekarang() === "GANJIL" ? "Ganjil" : "Genap";

  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [guru, setGuru] = useState<Guru[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [mapel, setMapel] = useState<Mapel[]>([]);
  const [ruangan, setRuangan] = useState<Ruangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Jadwal | null>(null);
  const [hariAktif, setHariAktif] = useState("SENIN");
  const [error, setError] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualJadwal, setManualJadwal] = useState<Jadwal | null>(null);
  const [manualStatus, setManualStatus] = useState<StatusManual>("HADIR");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [showImportForm, setShowImportForm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportResponse | null>(
    null,
  );
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

  const [tahunAjaranImport, setTahunAjaranImport] = useState(
    getTahunAjaranSekarang(),
  );

  const [semesterImport, setSemesterImport] = useState<SemesterAkademik>(
    getSemesterSekarang(),
  );

  const [form, setForm] = useState({
    guruId: "",
    kelasId: "",
    mataPelajaranId: "",
    ruanganId: "",
    hari: "SENIN",
    jamMulai: "",
    jamSelesai: "",
  });

  async function fetchAll() {
    setLoading(true);
    const jadwalRes = await fetch("/api/jadwal");
    const jadwalData = await jadwalRes.json();
    setJadwal(Array.isArray(jadwalData) ? jadwalData : []);

    if (isAdmin) {
      const [g, k, m, r] = await Promise.all([
        fetch("/api/guru").then((res) => res.json()),
        fetch("/api/kelas").then((res) => res.json()),
        fetch("/api/mata-pelajaran").then((res) => res.json()),
        fetch("/api/ruangan").then((res) => res.json()),
      ]);
      setGuru(Array.isArray(g) ? g : []);
      setKelas(Array.isArray(k) ? k : []);
      setMapel(Array.isArray(m) ? m : []);
      setRuangan(Array.isArray(r) ? r : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, [isAdmin]);

  function openTambah() {
    if (!isAdmin) return;
    setEditData(null);
    setForm({
      guruId: "",
      kelasId: "",
      mataPelajaranId: "",
      ruanganId: "",
      hari: hariAktif,
      jamMulai: "",
      jamSelesai: "",
    });
    setError("");
    setShowForm(true);
  }

  function openManualStatus(j: Jadwal) {
    if (!canInputStatus) return;

    setManualJadwal(j);
    setManualStatus("HADIR");
    setManualError("");
    setManualSuccess("");
    setShowManualForm(true);
  }
  function openEdit(j: Jadwal) {
    if (!isAdmin) return;
    setEditData(j);
    setForm({
      guruId: j.guru.id,
      kelasId: j.kelas.id,
      mataPelajaranId: j.mataPelajaran.id,
      ruanganId: j.ruangan.id,
      hari: j.hari,
      jamMulai: j.jamMulai,
      jamSelesai: j.jamSelesai,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError("");
    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/jadwal/${editData.id}` : "/api/jadwal";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan");
      return;
    }
    setShowForm(false);
    fetchAll();
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canInputStatus || !manualJadwal) return;
    setManualLoading(true);
    setManualError("");
    setManualSuccess("");

    try {
      const res = await fetch("/api/absensi/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jadwalId: manualJadwal.id,
          status: manualStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setManualError(data.error ?? "Gagal menyimpan status");
        return;
      }

      setManualSuccess(data.message ?? "Status berhasil disimpan");

      await fetchAll();

      setTimeout(() => {
        setShowManualForm(false);
        setManualJadwal(null);
        setManualSuccess("");
      }, 800);
    } catch {
      setManualError("Gagal terhubung ke server");
    } finally {
      setManualLoading(false);
    }
  }

  function openImportForm() {
    if (!isAdmin) return;

    setImportFile(null);
    setImportPreview(null);
    setImportError("");

    setTahunAjaranImport(getTahunAjaranSekarang());
    setSemesterImport(getSemesterSekarang());

    setShowImportForm(true);
  }

  function closeImportForm() {
    if (importLoading) return;

    setShowImportForm(false);
    setImportFile(null);
    setImportPreview(null);
    setImportError("");
  }

  async function processImport(action: "preview" | "commit") {
    if (!isAdmin) return;

    if (!importFile) {
      setImportError("Pilih file Excel terlebih dahulu");
      return;
    }

    const tahunAjaranMatch = tahunAjaranImport.match(/^(\d{4})\/(\d{4})$/);

    if (!tahunAjaranMatch) {
      setImportError(
        "Tahun ajaran harus menggunakan format YYYY/YYYY, misalnya 2026/2027",
      );
      return;
    }

    const tahunMulai = Number(tahunAjaranMatch[1]);
    const tahunSelesai = Number(tahunAjaranMatch[2]);

    if (tahunSelesai !== tahunMulai + 1) {
      setImportError("Tahun akhir harus satu tahun setelah tahun awal");
      return;
    }

    setImportLoading(true);
    setImportError("");

    try {
      const formData = new FormData();

      formData.append("file", importFile);
      formData.append("action", action);

      formData.append("tahunAjaran", tahunAjaranImport);

      formData.append("semester", semesterImport);

      const res = await fetch("/api/jadwal/import", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as ImportResponse;

      if (!res.ok) {
        setImportError(data.error ?? "Gagal memproses file Excel");

        if (data.summary && data.rows) {
          setImportPreview(data);
        }

        return;
      }

      setImportPreview(data);

      if (action === "commit") {
        await fetchAll();
      }
    } catch {
      setImportError("Gagal terhubung ke server");
    } finally {
      setImportLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm("Yakin ingin menghapus jadwal ini?")) return;
    await fetch(`/api/jadwal/${id}`, { method: "DELETE" });
    fetchAll();
  }

  const jadwalHariIni = jadwal.filter((j) => j.hari === hariAktif);
  const jadwalPerKelas = jadwalHariIni.reduce(
    (acc, item) => {
      const n = item.kelas.nama;
      if (!acc[n]) acc[n] = [];
      acc[n].push(item);
      return acc;
    },
    {} as Record<string, Jadwal[]>,
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <CalendarDays size={14} />
              {canViewStatus ? "Jadwal Pelajaran" : "Jadwal Mengajar"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {canViewStatus ? "Jadwal Pelajaran" : "Jadwal Mata Pelajaran"}
            </h1>
            <p className="text-indigo-100/90 text-sm mt-1.5">
              {canViewStatus
                ? `Tahun Akademik ${tahunAjaranBerjalan} · Semester ${semesterBerjalan}`
                : `Jadwal mengajar Tahun Akademik ${tahunAjaranBerjalan} · Semester ${semesterBerjalan}`}
            </p>
          </div>

          {isAdmin && (
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <a
                href="/api/jadwal/import/template"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Template</span>
              </a>

              <button
                type="button"
                onClick={openImportForm}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">Import Excel</span>
              </button>

              <button
                type="button"
                onClick={openTambah}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Tambah Jadwal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hari tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-2">
        <div className="flex gap-1.5 flex-wrap">
          {HARI_LIST.map((hari) => (
            <button
              key={hari}
              onClick={() => setHariAktif(hari)}
              className={`flex-1 min-w-[60px] px-3 py-2 rounded-xl text-xs font-semibold transition-all ${hariAktif === hari
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
            >
              {hari}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
          <Loader2
            size={32}
            className="mx-auto animate-spin text-indigo-400 mb-3"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Memuat jadwal...
          </p>
        </div>
      ) : Object.keys(jadwalPerKelas).length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
          <CircleDashed
            size={40}
            className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Belum ada jadwal untuk hari {hariAktif}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(jadwalPerKelas)
            .sort(([a], [b]) =>
              a.localeCompare(b, "id-ID", {
                numeric: true,
                sensitivity: "base",
              }),
            )
            .map(([kelasNama, items]) => (
              <div
                key={kelasNama}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <CalendarDays size={16} className="text-indigo-600" />
                      Kelas {kelasNama}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {items.length} jadwal pelajaran
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                    {hariAktif}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[150px]" />
                      <col className="w-[220px]" />
                      <col className="w-[200px]" />
                      <col className="w-[150px]" />

                      {canViewStatus && <col className="w-[150px]" />}

                      {canInputStatus && (
                        <col className={isAdmin ? "w-[260px]" : "w-[130px]"} />
                      )}
                    </colgroup>
                    <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                      <tr>
                        {["Jam", "Mata Pelajaran", "Guru", "Ruangan"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ),
                        )}
                        {canViewStatus && (
                          <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            Status
                          </th>
                        )}
                        {canInputStatus && (
                          <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {[...items]
                        .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai))
                        .map((j) => (
                          <tr
                            key={j.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                          >
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                <Clock size={11} className="text-indigo-500" />
                                {j.jamMulai}–{j.jamSelesai}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-gray-100">
                              <p
                                className="truncate"
                                title={j.mataPelajaran.nama}
                              >
                                {j.mataPelajaran.nama}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">
                              <p className="truncate" title={j.guru.user.nama}>
                                {j.guru.user.nama}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">
                              <p className="truncate" title={j.ruangan.nama}>
                                {j.ruangan.nama}
                              </p>
                            </td>

                            {canViewStatus && (
                              <td className="px-4 py-3.5 align-middle">
                                {j.absensiHariIni ? (
                                  <div>
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${j.absensiHariIni.status === "HADIR"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                        : j.absensiHariIni.status ===
                                          "TERLAMBAT"
                                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                          : j.absensiHariIni.status === "IZIN"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                                            : j.absensiHariIni.status ===
                                              "SAKIT"
                                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400"
                                              : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                                        }`}
                                    >
                                      {j.absensiHariIni.status === "HADIR" ? (
                                        <CheckCircle2 size={10} />
                                      ) : j.absensiHariIni.status ===
                                        "ALPHA" ? (
                                        <XCircle size={10} />
                                      ) : (
                                        <AlertCircle size={10} />
                                      )}
                                      {j.absensiHariIni.status}
                                    </span>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(
                                        j.absensiHariIni.waktuScan,
                                      ).toLocaleTimeString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                ) : j.guru.user.noWa ? (
                                  <a
                                    href={`https://wa.me/${j.guru.user.noWa}?text=${encodeURIComponent(
                                      `Yth. Bapak/Ibu ${j.guru.user.nama}, anda terjadwal untuk mengajar ${j.mataPelajaran.nama} kelas ${j.kelas.nama} pada jam ${j.jamMulai}–${j.jamSelesai} di ruangan ${j.ruangan.nama} hari ${j.hari}. Mohon konfirmasi kehadiran Anda, Terima kasih.`,
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"
                                  >
                                    <MessageCircle size={10} />
                                    WA Guru
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Belum scan
                                  </span>
                                )}
                              </td>
                            )}

                            {canInputStatus && (
                              <td className="px-4 py-3.5 align-middle">
                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => openManualStatus(j)}
                                    disabled={Boolean(j.absensiHariIni)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${j.absensiHariIni
                                      ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800"
                                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                                      }`}
                                    title={
                                      j.absensiHariIni
                                        ? "Jadwal ini sudah memiliki absensi"
                                        : "Catat absensi mengajar secara manual"
                                    }
                                  >
                                    <CheckCircle2 size={11} />
                                    Status
                                  </button>

                                  {isAdmin && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openEdit(j)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/60"
                                      >
                                        <Pencil size={11} />
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDelete(j.id)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-900/60"
                                      >
                                        <Trash2 size={11} />
                                        Hapus
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal import jadwal Excel */}
      {isAdmin && showImportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  Import Jadwal dari Excel
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Periksa file terlebih dahulu sebelum jadwal disimpan
                </p>
              </div>

              <button
                type="button"
                onClick={closeImportForm}
                disabled={importLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Isi modal */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              {/* Periode akademik */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Periode Akademik
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Semua jadwal dalam satu file akan dimasukkan ke periode yang
                    sama.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Tahun Ajaran
                    </label>

                    <input
                      type="text"
                      value={tahunAjaranImport}
                      placeholder="2026/2027"
                      disabled={importLoading}
                      onChange={(e) => {
                        setTahunAjaranImport(e.target.value);
                        setImportPreview(null);
                        setImportError("");
                      }}
                      className={inputCls}
                    />

                    <p className="mt-1.5 text-xs text-gray-400">
                      Format: 2026/2027
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Semester
                    </label>

                    <div className={selectWrap}>
                      <select
                        value={semesterImport}
                        disabled={importLoading}
                        onChange={(e) => {
                          setSemesterImport(e.target.value as SemesterAkademik);
                          setImportPreview(null);
                          setImportError("");
                        }}
                        className={inputCls}
                      >
                        <option value="GANJIL">Semester Ganjil</option>
                        <option value="GENAP">Semester Genap</option>
                      </select>

                      {selectArrow}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pilih file */}
              <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 p-5 dark:border-indigo-800 dark:bg-indigo-950/20">
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;

                      setImportFile(file);
                      setImportPreview(null);
                      setImportError("");
                    }}
                  />

                  <div className="text-center">
                    <Upload
                      size={30}
                      className="mx-auto mb-3 text-indigo-500"
                    />

                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {importFile ? importFile.name : "Pilih file jadwal Excel"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Format .xlsx, maksimal 5 MB
                    </p>

                    <span className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
                      Pilih File
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                  href="/api/jadwal/import/template"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Download size={15} />
                  Download template Excel
                </a>

                <button
                  type="button"
                  onClick={() => processImport("preview")}
                  disabled={!importFile || importLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  Periksa File
                </button>
              </div>

              {importError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 dark:border-red-900/50 dark:bg-red-950/40">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-red-500"
                  />

                  <p className="text-sm text-red-600 dark:text-red-400">
                    {importError}
                  </p>
                </div>
              )}

              {importPreview?.message && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />

                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {importPreview.message}
                  </p>
                </div>
              )}

              {importPreview?.periode && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-900/50 dark:bg-indigo-950/30">
                  <CalendarDays
                    size={16}
                    className="shrink-0 text-indigo-500"
                  />

                  <span className="text-gray-500 dark:text-gray-400">
                    Periode:
                  </span>

                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                    {importPreview.periode.tahunAjaran} · Semester{" "}
                    {importPreview.periode.semester === "GANJIL"
                      ? "Ganjil"
                      : "Genap"}
                  </span>
                </div>
              )}

              {importPreview?.summary && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                      {importPreview.summary.total}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Valid
                    </p>
                    <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {importPreview.summary.valid}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Bermasalah
                    </p>
                    <p className="mt-1 text-xl font-bold text-red-700 dark:text-red-400">
                      {importPreview.summary.invalid}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Duplikat
                    </p>
                    <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">
                      {importPreview.summary.duplicate}
                    </p>
                  </div>
                </div>
              )}

              {importPreview?.rows && importPreview.rows.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1000px] w-full text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/70">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                            Baris
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                            Hari & Jam
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                            Guru
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                            Pelajaran
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                            Kelas
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                            Ruangan
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {importPreview.rows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className="align-top hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          >
                            <td className="px-3 py-3 font-mono text-xs text-gray-500">
                              {row.rowNumber}
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {row.hari || "-"}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {row.jamMulai || "--:--"}–
                                {row.jamSelesai || "--:--"}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {row.namaGuru ?? "Tidak ditemukan"}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {row.nipGuru}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {row.namaMapel ?? "Tidak ditemukan"}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {row.kodeMapel}
                              </p>
                            </td>

                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                              {row.kelas}
                            </td>

                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                              {row.ruangan}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${row.status === "VALID"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                  : row.status === "DUPLIKAT"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                                  }`}
                              >
                                {row.status === "VALID" ? (
                                  <CheckCircle2 size={10} />
                                ) : row.status === "DUPLIKAT" ? (
                                  <AlertCircle size={10} />
                                ) : (
                                  <XCircle size={10} />
                                )}

                                {row.status}
                              </span>

                              {row.errors.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs text-red-500 dark:text-red-400">
                                  {row.errors.map((errorItem) => (
                                    <li key={errorItem}>• {errorItem}</li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeImportForm}
                disabled={importLoading}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {importPreview?.summary?.imported !== undefined
                  ? "Selesai"
                  : "Batal"}
              </button>

              {importPreview?.summary &&
                importPreview.summary.valid > 0 &&
                importPreview.summary.imported === undefined && (
                  <button
                    type="button"
                    onClick={() => processImport("commit")}
                    disabled={importLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Mengimpor...
                      </>
                    ) : (
                      <>
                        <Upload size={15} />
                        Import {importPreview.summary.valid} Jadwal
                      </>
                    )}
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal input status absensi mengajar */}
      {canInputStatus && showManualForm && manualJadwal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  Catat Absensi Mengajar
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Digunakan jika guru tidak dapat melakukan scan QR
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-5">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Guru
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                    {manualJadwal.guru.user.nama}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Mata Pelajaran
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                    {manualJadwal.mataPelajaran.nama}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Kelas
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {manualJadwal.kelas.nama}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Jadwal
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {manualJadwal.hari}, {manualJadwal.jamMulai}–
                    {manualJadwal.jamSelesai}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>

                <div className={selectWrap}>
                  <select
                    value={manualStatus}
                    onChange={(e) =>
                      setManualStatus(e.target.value as StatusManual)
                    }
                    className={inputCls}
                    required
                  >
                    <option value="HADIR">Hadir</option>
                    <option value="TERLAMBAT">Terlambat</option>
                    <option value="IZIN">Izin</option>
                    <option value="SAKIT">Sakit</option>
                    <option value="ALPHA">Alpha</option>
                  </select>

                  {selectArrow}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Status hadir atau terlambat hanya dicatat setelah kehadiran
                  guru diverifikasi oleh admin.
                </p>
              </div>

              {manualError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3.5 py-3">
                  <AlertCircle
                    size={15}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {manualError}
                  </p>
                </div>
              )}

              {manualSuccess && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-3.5 py-3">
                  <CheckCircle2
                    size={15}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {manualSuccess}
                  </p>
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  disabled={manualLoading}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={manualLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-60"
                >
                  {manualLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Status"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal form */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  {editData ? "Edit Jadwal" : "Tambah Jadwal"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {editData
                    ? "Ubah data jadwal yang ada"
                    : "Isi data jadwal baru"}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Hari */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Hari
                </label>
                <div className={selectWrap}>
                  <select
                    value={form.hari}
                    onChange={(e) => setForm({ ...form, hari: e.target.value })}
                    className={inputCls}
                    required
                  >
                    {HARI_LIST.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {selectArrow}
                </div>
              </div>

              {/* Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={form.jamMulai}
                    onChange={(e) =>
                      setForm({ ...form, jamMulai: e.target.value })
                    }
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={form.jamSelesai}
                    onChange={(e) =>
                      setForm({ ...form, jamSelesai: e.target.value })
                    }
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* Guru */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Guru
                </label>
                <div className={selectWrap}>
                  <select
                    value={form.guruId}
                    onChange={(e) =>
                      setForm({ ...form, guruId: e.target.value })
                    }
                    className={inputCls}
                    required
                  >
                    <option value="">Pilih guru</option>
                    {guru.map((g) => (
                      <option key={g.id} value={g.guru?.id}>
                        {g.nama}
                      </option>
                    ))}
                  </select>
                  {selectArrow}
                </div>
              </div>

              {/* Mapel */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Mata Pelajaran
                </label>
                <div className={selectWrap}>
                  <select
                    value={form.mataPelajaranId}
                    onChange={(e) =>
                      setForm({ ...form, mataPelajaranId: e.target.value })
                    }
                    className={inputCls}
                    required
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {mapel.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                  {selectArrow}
                </div>
              </div>

              {/* Kelas */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Kelas
                </label>
                <div className={selectWrap}>
                  <select
                    value={form.kelasId}
                    onChange={(e) =>
                      setForm({ ...form, kelasId: e.target.value })
                    }
                    className={inputCls}
                    required
                  >
                    <option value="">Pilih kelas</option>
                    {kelas.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                  {selectArrow}
                </div>
              </div>

              {/* Ruangan */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Ruangan
                </label>
                <div className={selectWrap}>
                  <select
                    value={form.ruanganId}
                    onChange={(e) =>
                      setForm({ ...form, ruanganId: e.target.value })
                    }
                    className={inputCls}
                    required
                  >
                    <option value="">Pilih ruangan</option>
                    {ruangan.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama}
                      </option>
                    ))}
                  </select>
                  {selectArrow}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3.5 py-3">
                  <AlertCircle
                    size={15}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
                >
                  {editData ? "Simpan Perubahan" : "Tambah Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
