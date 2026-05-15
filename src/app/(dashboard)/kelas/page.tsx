"use client";

import { useState, useEffect } from "react";

interface Kelas {
  id: string;
  nama: string;
  tingkat: string;
}

export default function KelasPage() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Kelas | null>(null);
  const [form, setForm] = useState({ nama: "" });
  const [error, setError] = useState("");

  async function fetchKelas() {
    const res = await fetch("/api/kelas");
    const data = await res.json();
    const [kelas, setKelas] = useState<Kelas[]>([]);
    setKelas(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchKelas();
  }, []);

  function openTambah() {
    setEditData(null);
    setForm({ nama: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(k: Kelas) {
    setEditData(k);
    setForm({ nama: k.nama });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/kelas/${editData.id}` : "/api/kelas";

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
    fetchKelas();
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menonaktifkan kelas ini?")) return;
    await fetch(`/api/kelas/${id}`, { method: "DELETE" });
    fetchKelas();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Manajemen Kelas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Kelola data kelas sekolah
          </p>
        </div>
        <button
          onClick={openTambah}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Tambah Kelas
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            Memuat data...
          </div>
        ) : kelas.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            Belum ada data kelas
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  Nama Kelas
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  Tingkat
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {kelas.map((k) => (
                <tr
                  key={k.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {k.nama}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {k.tingkat}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(k)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
                        className="text-red-500 hover:text-red-600 font-medium"
                      >
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editData ? "Edit Kelas" : "Tambah Kelas"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ nama: e.target.value })}
                  placeholder="contoh: VII-A, VIII-B, IX-C"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Tingkat akan terdeteksi otomatis (VII, VIII, IX)
                </p>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  {editData ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
