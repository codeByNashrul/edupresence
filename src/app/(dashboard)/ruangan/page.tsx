"use client";

import { useState, useEffect } from "react";

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
    setRuangan(data);
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

  function handleCetakQr(ruangan: Ruangan) {
    const url = `${window.location.origin}/api/ruangan/${ruangan.id}/qr`;
    window.open(url, "_blank");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">
            Manajemen Ruangan
          </h1>
          <p className="dark:text-gray-400 text-sm mt-1">
            Kelola ruangan & QR Code absensi
          </p>
        </div>
        <button
          onClick={openTambah}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Tambah Ruangan
        </button>
      </div>

      <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : ruangan.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Belum ada data ruangan
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Nama Ruangan
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Kode QR
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {ruangan.map((r) => (
                <tr key={r.id} className="dark:divide-gray-700">
                  <td className="px-4 py-3 font-medium dark:text-gray-100">
                    {r.nama}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {r.kodeQr}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCetakQr(r)}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Cetak QR
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
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
              {editData ? "Edit Ruangan" : "Tambah Ruangan"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Ruangan
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ nama: e.target.value })}
                  placeholder="contoh: Ruang 1, Lab IPA, Lapangan"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                {!editData && (
                  <p className="text-xs text-gray-400 mt-1">
                    Kode QR akan di-generate otomatis
                  </p>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium dark:divide-gray-700"
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
