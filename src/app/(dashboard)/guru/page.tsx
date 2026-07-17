"use client";

import {
  Download,
  GraduationCap,
  Pen,
  Plus,
  Trash2,
  Upload,
  Users,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

interface Guru {
  id: string;
  nama: string;
  nip: string;
  noWa: string | null;
  aktif: boolean;
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

function Toast({
  toasts,
  remove,
}: {
  toasts: ToastItem[];
  remove: (id: number) => void;
}) {
  const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
    error: <XCircle size={16} className="text-red-500 shrink-0" />,
    info: <Info size={16} className="text-indigo-500 shrink-0" />,
  };
  const borders = {
    success: "border-l-4 border-emerald-500",
    error: "border-l-4 border-red-500",
    info: "border-l-4 border-indigo-500",
  };

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 bg-white dark:bg-gray-900 ${borders[t.type]} rounded-xl px-4 py-3 shadow-xl shadow-black/10 min-w-[260px] max-w-sm animate-in slide-in-from-right-4 fade-in duration-200`}
        >
          {icons[t.type]}
          <p className="text-sm text-gray-800 dark:text-gray-100 font-medium flex-1">
            {t.message}
          </p>
          <button
            onClick={() => remove(t.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, remove };
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? "bg-red-50 dark:bg-red-950/50" : "bg-amber-50 dark:bg-amber-950/50"}`}
          >
            <AlertTriangle
              size={22}
              className={danger ? "text-red-500" : "text-amber-500"}
            />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            {description}
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
              danger
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md shadow-red-500/20"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </td>
          <td className="px-5 py-4">
            <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </td>
          <td className="px-5 py-4">
            <div className="flex justify-center gap-2">
              <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GuruPage() {
  const [guru, setGuru] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Guru | null>(null);
  const [form, setForm] = useState({
    nama: "",
    nip: "",
    noWa: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Confirm modal state
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const { toasts, show: showToast, remove: removeToast } = useToast();

  async function fetchGuru() {
    setLoading(true);
    const res = await fetch("/api/guru");
    const data = await res.json();
    setGuru(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchGuru();
  }, []);

  // ── Filter ──
  const filtered = guru.filter(
    (g) =>
      g.nama.toLowerCase().includes(search.toLowerCase()) ||
      g.nip.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Form helpers ──
  function openTambah() {
    setEditData(null);
    setForm({ nama: "", nip: "", noWa: "", password: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(g: Guru) {
    setEditData(g);
    setForm({ nama: g.nama, nip: g.nip, noWa: g.noWa ?? "", password: "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/guru/${editData.id}` : "/api/guru";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setFormLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error ?? "Terjadi kesalahan");
      return;
    }

    setShowForm(false);
    showToast(
      editData
        ? `Data ${form.nama} berhasil diperbarui`
        : `${form.nama} berhasil ditambahkan`,
      "success",
    );
    fetchGuru();
  }

  // ── Delete single ──
  function handleDelete(g: Guru) {
    setConfirm({
      open: true,
      title: "Nonaktifkan Guru",
      description: `Apakah kamu yakin ingin menonaktifkan ${g.nama}? Data dapat dipulihkan oleh administrator.`,
      confirmLabel: "Ya, Nonaktifkan",
      danger: true,
      onConfirm: async () => {
        setConfirm((prev) => ({ ...prev, open: false }));
        await fetch(`/api/guru/${g.id}`, { method: "DELETE" });
        showToast(`${g.nama} berhasil dinonaktifkan`, "info");
        fetchGuru();
      },
    });
  }

  // ── Delete all ──
  function handleDeleteAll() {
    setConfirm({
      open: true,
      title: "Hapus Semua Data Guru",
      description:
        "Tindakan ini akan menonaktifkan SEMUA data guru. Apakah kamu benar-benar yakin?",
      confirmLabel: "Hapus Semua",
      danger: true,
      onConfirm: async () => {
        setConfirm((prev) => ({ ...prev, open: false }));
        await fetch("/api/guru/delete-all", { method: "DELETE" });
        showToast("Semua data guru telah dinonaktifkan", "info");
        fetchGuru();
      },
    });
  }

  // ── Import CSV ──
  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(";").map((h) => h.trim().toLowerCase());

    const requiredCols = ["nama", "nip", "password"];
    const missingCols = requiredCols.filter((c) => !headers.includes(c));
    if (missingCols.length > 0) {
      showToast(
        `Kolom wajib tidak ditemukan: ${missingCols.join(", ")}`,
        "error",
      );
      e.target.value = "";
      return;
    }

    const rows = lines
      .slice(1)
      .map((line) => {
        const values = line.split(";").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] ?? "";
        });
        return row;
      })
      .filter((r) => r.nama && r.nip);

    if (rows.length === 0) {
      showToast("Tidak ada data valid di CSV", "error");
      e.target.value = "";
      return;
    }

    const res = await fetch("/api/guru/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error ?? "Gagal import CSV", "error");
    } else {
      showToast(
        `Import selesai — ${data.berhasil} berhasil, ${data.gagal} gagal`,
        "success",
      );
      fetchGuru();
    }

    e.target.value = "";
  }

  // ── Export CSV ──
  function exportCsv() {
    if (guru.length === 0) return;
    const headers = ["Nama", "NIP", "No. WhatsApp"];
    const rows = guru.map((g) => [g.nama, g.nip, g.noWa ?? ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data-guru.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${guru.length} data guru berhasil diekspor`, "success");
  }

  return (
    <div>
      <Toast toasts={toasts} remove={removeToast} />

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        danger={confirm.danger}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((prev) => ({ ...prev, open: false }))}
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Manajemen Guru
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola data guru sekolah
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDeleteAll}
            disabled={guru.length === 0}
            className="flex items-center gap-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition"
          >
            <Trash2 size={16} />
            Hapus Semua
          </button>

          <label className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition">
            <Upload size={16} />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCsv}
              className="hidden"
            />
          </label>

          <button
            onClick={exportCsv}
            disabled={guru.length === 0}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            onClick={openTambah}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition"
          >
            <Plus size={16} />
            Tambah Guru
          </button>
        </div>
      </div>

      {/* ── Info format CSV ── */}
      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 mb-4 text-sm text-indigo-700 dark:text-indigo-300">
        <strong>Format CSV Import:</strong> kolom dipisah titik koma (;) —{" "}
        <code className="mx-1 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded text-xs">
          nama;nip;noWa;password
        </code>{" "}
        — kolom{" "}
        <code className="mx-1 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded text-xs">
          noWa
        </code>{" "}
        opsional.
      </div>

      {/* ── Search + Stats Bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIP..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Badge total */}
        {!loading && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-2 rounded-xl text-sm font-semibold">
              <GraduationCap size={14} />
              {guru.length} guru aktif
            </span>
            {search && filtered.length !== guru.length && (
              <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-2 rounded-xl text-sm font-medium">
                {filtered.length} hasil
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Tabel ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    NIP
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    No. WhatsApp
                  </th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                <SkeletonRows />
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              {search ? (
                <Search size={24} className="text-gray-400" />
              ) : (
                <Users size={24} className="text-gray-400" />
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {search
                ? `Tidak ada guru dengan kata kunci "${search}"`
                : "Belum ada data guru"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {search
                ? "Coba kata kunci lain"
                : "Tambah manual atau import CSV"}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Hapus pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    NIP
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    No. WhatsApp
                  </th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/80 transition">
                          <GraduationCap
                            size={16}
                            className="text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {g.nama}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                        {g.nip}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                      {g.noWa ?? (
                        <span className="text-gray-300 dark:text-gray-600 italic text-xs">
                          Belum diisi
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(g)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/70 text-xs font-semibold transition"
                        >
                          <Pen size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(g)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 text-xs font-semibold transition"
                        >
                          <Trash2 size={14} />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Form ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="relative overflow-hidden px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-5 dark:opacity-10" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                    <GraduationCap
                      size={18}
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {editData ? "Edit Guru" : "Tambah Guru"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {editData
                        ? "Ubah data guru"
                        : "Tambah guru baru ke sistem"}
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

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {[
                {
                  key: "nama",
                  label: "Nama",
                  placeholder: "Nama lengkap guru",
                  type: "text",
                  required: true,
                },
                {
                  key: "nip",
                  label: "NIP",
                  placeholder: "Nomor Induk Pegawai",
                  type: "text",
                  required: true,
                },
                {
                  key: "noWa",
                  label: "No. WhatsApp",
                  placeholder: "628xxxxxxxxxx",
                  type: "text",
                  required: false,
                  optional: true,
                },
              ].map(({ key, label, placeholder, type, required, optional }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {label}{" "}
                    {optional && (
                      <span className="text-gray-400 text-xs">(opsional)</span>
                    )}
                  </label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    placeholder={placeholder}
                    required={required}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password{" "}
                  {editData && (
                    <span className="text-gray-400 text-xs">
                      (kosongkan jika tidak diubah)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={editData ? "••••••••" : "Minimal 6 karakter"}
                  required={!editData}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-3.5 py-2.5 rounded-xl text-sm">
                  <XCircle size={15} className="shrink-0" />
                  {formError}
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
                  disabled={formLoading}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {formLoading
                    ? "Menyimpan..."
                    : editData
                      ? "Simpan Perubahan"
                      : "Tambah Guru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
