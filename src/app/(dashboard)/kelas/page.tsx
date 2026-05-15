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
  const [form, setForm] = useState({
    nama: "",
    tingkat: "",
  });
  const [error, setError] = useState("");

  async function fetchKelas() {
    const res = await fetch("/api/kelas");
    const data = await res.json();
    setKelas(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchKelas();
  }, []);

  function openTambah() {
    setEditData(null);
    setForm({ nama: "", tingkat: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(k: Kelas) {
    setEditData(k);
    setForm({ nama: k.nama, tingkat: k.tingkat });
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
          <h1 className="text-2xl font-bold dark:text-gray-100">
            Manajemen Kelas
          </h1>
          <p className="dark:text-gray-400 text-sm mt-1">
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

      <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : kelas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Belum ada data kelas
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Nama Kelas
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Tingkat
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {kelas.map((k) => (
                <tr key={k.id} className="dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium dark:text-gray-100">
                    {k.nama}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{k.tingkat}</td>
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
          <div className="dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold dark:text-gray-100 mb-4">
              {editData ? "Edit Kelas" : "Tambah Kelas"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ nama: e.target.value })}
                  placeholder="contoh: X-A, XI-B, XII-IPA-1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Tingkat akan terdeteksi otomatis dari nama kelas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tingkat
                </label>
                <select
                  value={form.tingkat}
                  onChange={(e) =>
                    setForm({ ...form, tingkat: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih tingkat</option>
                  <option value="X">X</option>
                  <option value="XI">XI</option>
                  <option value="XII">XII</option>
                </select>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium dark:hover:bg-gray-700"
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
