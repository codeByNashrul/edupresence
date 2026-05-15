"use client";

import { Pen, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Guru {
  id: string;
  nama: string;
  nip: string;
  noWa: string | null;
  aktif: boolean;
}

export default function GuruPage() {
  const [guru, setGuru] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Guru | null>(null);
  const [form, setForm] = useState({
    nama: "",
    nip: "",
    noWa: "",
    password: "",
  });
  const [error, setError] = useState("");

  async function fetchGuru() {
    const res = await fetch("/api/guru");
    const data = await res.json();
    setGuru(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchGuru();
  }, []);

  function openTambah() {
    setEditData(null);
    setForm({ nama: "", nip: "", noWa: "", password: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(g: Guru) {
    setEditData(g);
    setForm({ nama: g.nama, nip: g.nip, noWa: g.noWa ?? "", password: "" });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/guru/${editData.id}` : "/api/guru";

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
    fetchGuru();
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menonaktifkan guru ini?")) return;
    await fetch(`/api/guru/${id}`, { method: "DELETE" });
    fetchGuru();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">
            Manajemen Guru
          </h1>
          <p className="dark:text-gray-400 text-sm mt-1">
            Kelola data guru sekolah
          </p>
        </div>
        <button
          onClick={openTambah}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Tambah Guru
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : guru.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Belum ada data guru
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">NIP</th>
                  <th className="text-left px-4 py-3 font-medium">
                    No. WhatsApp
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {guru.map((g) => (
                  <tr key={g.id} className="hover:dark:bg-gray-900">
                    <td className="px-4 py-3 font-medium dark:text-gray-100">
                      {g.nama}
                    </td>
                    <td className="px-4 py-3 ">{g.nip}</td>
                    <td className="px-4 py-3 ">{g.noWa ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="justify-center flex gap-2">
                        <button
                          onClick={() => openEdit(g)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs font-semibold transition"
                        >
                          <Pen size={16} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-200 text-red-600 hover:bg-red-100 text-xs font-semibold transition"
                        >
                          <Trash2 size={16} />
                          <span>Hapus</span>
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold dark:text-gray-100 mb-4">
              {editData ? "Edit Guru" : "Tambah Guru"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  value={form.noWa}
                  onChange={(e) => setForm({ ...form, noWa: e.target.value })}
                  placeholder="628xxxxxxxxxx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editData && "(kosongkan jika tidak diubah)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required={!editData}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:dark:bg-gray-900"
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
