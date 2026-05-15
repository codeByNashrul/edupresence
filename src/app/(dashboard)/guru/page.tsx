"use client";

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
      <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : guru.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Belum ada data guru
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Nama
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  NIP
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  No. WhatsApp
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {guru.map((g) => (
                <tr key={g.id} className="hover:dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium dark:text-gray-100">
                    {g.nama}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{g.nip}</td>
                  <td className="px-4 py-3 text-gray-600">{g.noWa ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(g)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
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
