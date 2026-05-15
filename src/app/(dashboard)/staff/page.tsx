"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Staff {
  id: string;
  nama: string;
  nip: string;
  noWa: string | null;
  aktif: boolean;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    nama: "",
    nip: "",
    noWa: "",
    password: "",
  });
  const [error, setError] = useState("");

  async function fetchStaff() {
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaff(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchStaff();
  }, []);

  function openTambah() {
    setEditData(null);
    setForm({ nama: "", nip: "", noWa: "", password: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(s: Staff) {
    setEditData(s);
    setForm({ nama: s.nama, nip: s.nip, noWa: s.noWa ?? "", password: "" });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/staff/${editData.id}` : "/api/staff";

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
    fetchStaff();
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menonaktifkan staff ini?")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    fetchStaff();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Manajemen Staff
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Kelola data staff sekolah
          </p>
        </div>
        <button
          onClick={openTambah}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={18} />
          <span>Tambah Staff</span>
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            Memuat data...
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            Belum ada data staff
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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
              {staff.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {s.nama}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {s.nip}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {s.noWa ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="justify-center flex gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs font-semibold transition"
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
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
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editData ? "Edit Staff" : "Tambah Staff"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  value={form.noWa}
                  onChange={(e) => setForm({ ...form, noWa: e.target.value })}
                  placeholder="628xxxxxxxxxx"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password {editData && "(kosongkan jika tidak diubah)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required={!editData}
                />
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
