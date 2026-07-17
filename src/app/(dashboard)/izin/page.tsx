"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  FileText,
  Paperclip,
  Plus,
  Trash2,
  X,
  XCircle,
  CalendarDays,
  Clock,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

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

export default function IzinPage() {
  const { data: session } = useSession();
  const [izinList, setIzinList] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulan, setBulan] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    jenisIzin: "SAKIT",
    jenisCustom: "",
    tanggalMulai: new Date().toISOString().split("T")[0],
    tanggalAkhir: new Date().toISOString().split("T")[0],
    keterangan: "",
    suratUrl: "",
    suratNama: "",
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

  async function handleUploadSurat(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/izin/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal upload file");
      return;
    }

    setForm((prev) => ({ ...prev, suratUrl: data.url, suratNama: file.name }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/izin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jenisIzin: form.jenisIzin,
        jenisCustom: form.jenisCustom,
        tanggalMulai: form.tanggalMulai,
        tanggalAkhir: form.tanggalAkhir,
        keterangan: form.keterangan,
        suratUrl: form.suratUrl || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan");
      return;
    }

    setShowForm(false);
    setForm({
      jenisIzin: "SAKIT",
      jenisCustom: "",
      tanggalMulai: new Date().toISOString().split("T")[0],
      tanggalAkhir: new Date().toISOString().split("T")[0],
      keterangan: "",
      suratUrl: "",
      suratNama: "",
    });
    fetchIzin();
  }

  async function handleBatalkan(id: string) {
    if (!confirm("Yakin ingin membatalkan pengajuan izin ini?")) return;
    await fetch(`/api/izin/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DIBATALKAN" }),
    });
    fetchIzin();
  }

  // Hitung ringkasan
  const totalHariIzin = izinList
    .filter((i) => i.status === "APPROVED")
    .reduce((acc, i) => acc + hitungHari(i.tanggalMulai, i.tanggalAkhir), 0);

  const totalSakit = izinList.filter(
    (i) => i.jenisIzin === "SAKIT" && i.status === "APPROVED",
  ).length;
  const totalIzin = izinList.filter(
    (i) => i.jenisIzin !== "SAKIT" && i.status === "APPROVED",
  ).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Izin & Sakit
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ajukan izin atau sakit secara online
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="month"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition"
          >
            <Plus size={16} />
            Ajukan Izin
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-indigo-600">{totalHariIzin}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total Hari Izin
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-500">{totalSakit}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sakit</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-500">{totalIzin}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Izin Lainnya
          </p>
        </div>
      </div>

      {/* List Izin */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Memuat data...</div>
      ) : izinList.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
          <FileCheck
            size={40}
            className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
          />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Belum ada pengajuan izin
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Klik tombol Ajukan Izin untuk memulai
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {izinList.map((izin) => {
            const sc = statusConfig[izin.status] ?? statusConfig.APPROVED;
            const StatusIcon = sc.icon;
            const hari = hitungHari(izin.tanggalMulai, izin.tanggalAkhir);
            const bisaBatalkan =
              izin.status === "APPROVED" &&
              new Date(izin.tanggalMulai) >= new Date();

            return (
              <div
                key={izin.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
              >
                {/* Card Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
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
                  {bisaBatalkan && (
                    <button
                      onClick={() => handleBatalkan(izin.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                    >
                      <X size={14} />
                      Batalkan
                    </button>
                  )}
                </div>

                {/* Card Body */}
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

                  {izin.suratUrl && (
                    <a
                      href={izin.suratUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-lg transition"
                    >
                      <Paperclip size={13} />
                      Lihat Surat Keterangan
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="relative overflow-hidden px-6 py-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-5 dark:opacity-10" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                    <FileCheck
                      size={18}
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      Ajukan Izin
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Langsung disetujui otomatis
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Jenis Izin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jenis Izin
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {jenisIzinOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, jenisIzin: opt.value })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        form.jenisIzin === opt.value
                          ? opt.color + " ring-2 ring-offset-1 ring-indigo-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jenis Custom */}
              {form.jenisIzin === "LAINNYA" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Sebutkan Jenis Izin
                  </label>
                  <input
                    type="text"
                    value={form.jenisCustom}
                    onChange={(e) =>
                      setForm({ ...form, jenisCustom: e.target.value })
                    }
                    placeholder="contoh: Keperluan keluarga"
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              {/* Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={form.tanggalMulai}
                    onChange={(e) =>
                      setForm({ ...form, tanggalMulai: e.target.value })
                    }
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={form.tanggalAkhir}
                    min={form.tanggalMulai}
                    onChange={(e) =>
                      setForm({ ...form, tanggalAkhir: e.target.value })
                    }
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Preview hari */}
              {form.tanggalMulai && form.tanggalAkhir && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-lg">
                  ⏱ Total: {hitungHari(form.tanggalMulai, form.tanggalAkhir)}{" "}
                  hari
                </p>
              )}

              {/* Keterangan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Keterangan
                </label>
                <textarea
                  rows={3}
                  value={form.keterangan}
                  onChange={(e) =>
                    setForm({ ...form, keterangan: e.target.value })
                  }
                  placeholder="Jelaskan alasan izin..."
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
              </div>

              {/* Upload Surat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Surat Keterangan{" "}
                  <span className="text-gray-400 text-xs">(opsional)</span>
                </label>

                {form.suratUrl ? (
                  <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                    <FileText size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 flex-1 truncate">
                      {form.suratNama}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, suratUrl: "", suratNama: "" })
                      }
                      className="text-red-500 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleUploadSurat}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-4 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Paperclip size={16} />
                      {uploading ? "Mengupload..." : "Upload surat keterangan"}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      Format: JPG, PNG, PDF. Maks 5MB
                    </p>
                  </>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-3.5 py-2.5 rounded-xl text-sm">
                  <XCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Ajukan Izin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
