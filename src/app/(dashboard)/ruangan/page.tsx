"use client";

import {
  DoorOpen,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Loader2,
  CircleDashed,
  AlertCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Ruangan {
  id: string;
  nama: string;
  kodeQr: string;
}

export default function RuanganPage() {
  const [ruangan, setRuangan] = useState<Ruangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Ruangan | null>(null);
  const [form, setForm] = useState({ nama: "" });
  const [error, setError] = useState("");

  async function fetchRuangan() {
    const res = await fetch("/api/ruangan");
    const data = await res.json();
    setRuangan(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchRuangan();
  }, []);

  function openTambah() {
    setEditData(null);
    setForm({ nama: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(r: Ruangan) {
    setEditData(r);
    setForm({ nama: r.nama });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/ruangan/${editData.id}` : "/api/ruangan";
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
    fetchRuangan();
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menonaktifkan ruangan ini?")) return;
    await fetch(`/api/ruangan/${id}`, { method: "DELETE" });
    fetchRuangan();
  }

  function handleCetakQr(r: Ruangan) {
    const url = `${window.location.origin}/api/ruangan/${r.id}/qr`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <DoorOpen size={14} />
              Manajemen Ruangan
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Ruangan</h1>
            <p className="text-indigo-100/90 text-sm mt-1.5">
              Kelola ruangan &amp; QR Code absensi
            </p>
          </div>
          <button
            onClick={openTambah}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-sm font-semibold hover:bg-white/25 transition-all backdrop-blur-sm"
          >
            <Plus size={16} />
            Tambah Ruangan
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DoorOpen size={16} className="text-indigo-600" />
              Daftar Ruangan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {ruangan.length} ruangan terdaftar
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
              Memuat data ruangan...
            </p>
          </div>
        ) : ruangan.length === 0 ? (
          <div className="p-12 text-center">
            <CircleDashed
              size={40}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
            />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Belum ada data ruangan
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Tambahkan ruangan pertama Anda
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  Nama Ruangan
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  Kode QR
                </th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {ruangan.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                        <DoorOpen
                          size={16}
                          className="text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {r.nama}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      {r.kodeQr}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleCetakQr(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold transition-colors"
                      >
                        <Printer size={13} />
                        Cetak QR
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold transition-colors"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 text-xs font-semibold transition-colors"
                      >
                        <Trash2 size={13} />
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                  <DoorOpen
                    size={18}
                    className="text-indigo-600 dark:text-indigo-400"
                  />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {editData ? "Edit Ruangan" : "Tambah Ruangan"}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {editData
                      ? "Ubah nama ruangan"
                      : "Kode QR otomatis di-generate"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Nama Ruangan
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ nama: e.target.value })}
                  placeholder="contoh: Ruang 1, Lab IPA, Lapangan"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 placeholder:text-gray-400 transition-all"
                  required
                />
                {!editData && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    Kode QR akan di-generate otomatis setelah ruangan dibuat
                  </p>
                )}
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
                  {editData ? "Simpan Perubahan" : "Tambah Ruangan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
