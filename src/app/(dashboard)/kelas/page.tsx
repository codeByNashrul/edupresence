"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  School,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

interface Kelas {
  id: string;
  nama: string;
  tingkat: string;
}

// ─── Toast ──────────────────────────────────────────────────────────────────────
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
          className={`pointer-events-auto flex items-center gap-3 bg-white dark:bg-gray-900 ${borders[t.type]} rounded-xl px-4 py-3 shadow-xl shadow-black/10 min-w-[260px] max-w-sm`}
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

// ─── Confirm Modal ───────────────────────────────────────────────────────────────
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
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${danger ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md shadow-red-500/20" : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </td>
          <td className="px-5 py-4">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </td>
          <td className="px-5 py-4">
            <div className="flex justify-center gap-2">
              <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Tingkat Badge ───────────────────────────────────────────────────────────────
const tingkatColor: Record<string, string> = {
  VII: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  VIII: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  IX: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

// ─── Main ────────────────────────────────────────────────────────────────────────
export default function KelasPage() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Kelas | null>(null);
  const [form, setForm] = useState({ nama: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const { toasts, show: showToast, remove: removeToast } = useToast();

  async function fetchKelas() {
    setLoading(true);
    const res = await fetch("/api/kelas");
    const data = await res.json();
    setKelas(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchKelas();
  }, []);

  function openTambah() {
    setEditData(null);
    setForm({ nama: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(k: Kelas) {
    setEditData(k);
    setForm({ nama: k.nama });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/kelas/${editData.id}` : "/api/kelas";

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
        ? `Kelas ${form.nama} berhasil diperbarui`
        : `Kelas ${form.nama} berhasil ditambahkan`,
      "success",
    );
    fetchKelas();
  }

  function handleDelete(k: Kelas) {
    setConfirm({
      open: true,
      title: "Nonaktifkan Kelas",
      description: `Yakin ingin menonaktifkan kelas ${k.nama}?`,
      confirmLabel: "Ya, Nonaktifkan",
      danger: true,
      onConfirm: async () => {
        setConfirm((prev) => ({ ...prev, open: false }));
        await fetch(`/api/kelas/${k.id}`, { method: "DELETE" });
        showToast(`Kelas ${k.nama} berhasil dinonaktifkan`, "info");
        fetchKelas();
      },
    });
  }

  const thClass =
    "text-left px-5 py-3.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider";

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

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Manajemen Kelas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola data kelas sekolah
          </p>
        </div>
        <button
          onClick={openTambah}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition"
        >
          <Plus size={16} />
          Tambah Kelas
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className={thClass}>Nama Kelas</th>
                  <th className={thClass}>Tingkat</th>
                  <th className={`${thClass} text-center`}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonRows />
              </tbody>
            </table>
          </div>
        ) : kelas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <School size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Belum ada data kelas
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Tambah kelas baru untuk memulai
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className={thClass}>Nama Kelas</th>
                  <th className={thClass}>Tingkat</th>
                  <th className={`${thClass} text-center`}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {kelas.map((k) => {
                  const badgeClass =
                    tingkatColor[k.tingkat] ??
                    "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
                  return (
                    <tr
                      key={k.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/80 transition">
                            <School
                              size={15}
                              className="text-indigo-600 dark:text-indigo-400"
                            />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {k.nama}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeClass}`}
                        >
                          Kelas {k.tingkat}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(k)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/70 text-xs font-semibold transition"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(k)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 text-xs font-semibold transition"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Modal Header */}
            <div className="relative overflow-hidden px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-5 dark:opacity-10" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                    <School
                      size={18}
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {editData ? "Edit Kelas" : "Tambah Kelas"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {editData
                        ? "Ubah nama kelas"
                        : "Tingkat terdeteksi otomatis"}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ nama: e.target.value })}
                  placeholder="contoh: VII-A, VIII-B, IX-C"
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                  required
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                  <Info size={11} />
                  Tingkat akan terdeteksi otomatis (VII, VIII, IX)
                </p>
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
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition disabled:opacity-60"
                >
                  {formLoading
                    ? "Menyimpan..."
                    : editData
                      ? "Simpan Perubahan"
                      : "Tambah Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
