"use client";

import { useState, useEffect } from "react";

interface Pengaturan {
  id: string;
  toleransiMenit: number;
  jamBerangkatMulai: string;
  jamBerangkatSelesai: string;
  jamPulangMulai: string;
  jamPulangSelesai: string;
  templatePesanWa: string;
}

export default function PengaturanPage() {
  const [form, setForm] = useState<Pengaturan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [error, setError] = useState("");

  async function fetchPengaturan() {
    const res = await fetch("/api/pengaturan");
    const data = await res.json();
    setForm(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchPengaturan();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSukses(false);

    const res = await fetch("/api/pengaturan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan");
    } else {
      setSukses(true);
      setTimeout(() => setSukses(false), 3000);
    }

    setSaving(false);
  }

  if (loading || !form) {
    return (
      <div className="p-8 text-center text-gray-400">Memuat pengaturan...</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-100 ">
          Pengaturan Sistem
        </h1>
        <p className="dark:text-gray-400  text-sm mt-1">
          Konfigurasi sistem EduPresence
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        {/* Toleransi */}
        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold dark:text-gray-100  mb-4">
            Toleransi Keterlambatan
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Menit toleransi
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={form.toleransiMenit}
              onChange={(e) =>
                setForm({ ...form, toleransiMenit: Number(e.target.value) })
              }
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Guru/staff yang scan dalam {form.toleransiMenit} menit setelah
              jadwal dianggap terlambat
            </p>
          </div>
        </div>

        {/* Jam Berangkat */}
        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold dark:text-gray-100  mb-4">
            Jam Absen Berangkat
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mulai
              </label>
              <input
                type="time"
                value={form.jamBerangkatMulai}
                onChange={(e) =>
                  setForm({ ...form, jamBerangkatMulai: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selesai
              </label>
              <input
                type="time"
                value={form.jamBerangkatSelesai}
                onChange={(e) =>
                  setForm({ ...form, jamBerangkatSelesai: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Jam Pulang */}
        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold dark:text-gray-100  mb-4">
            Jam Absen Pulang
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mulai
              </label>
              <input
                type="time"
                value={form.jamPulangMulai}
                onChange={(e) =>
                  setForm({ ...form, jamPulangMulai: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selesai
              </label>
              <input
                type="time"
                value={form.jamPulangSelesai}
                onChange={(e) =>
                  setForm({ ...form, jamPulangSelesai: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Template WA */}
        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold dark:text-gray-100  mb-1">
            Template Pesan WhatsApp
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Variabel yang tersedia: {"{nama}"}, {"{mapel}"}, {"{kelas}"},{" "}
            {"{jam}"}, {"{tanggal}"}
          </p>
          <textarea
            rows={6}
            value={form.templatePesanWa}
            onChange={(e) =>
              setForm({ ...form, templatePesanWa: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {sukses && (
          <p className="text-green-600 text-sm font-medium">
            ✅ Pengaturan berhasil disimpan!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </form>
    </div>
  );
}
