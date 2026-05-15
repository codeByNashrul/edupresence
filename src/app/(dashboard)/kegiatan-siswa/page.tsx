"use client";

import { useEffect, useState } from "react";

interface KegiatanSiswa {
  id: string;
  nama: string;
  tanggal: string;
  aktif: boolean;
}

export default function KegiatanSiswaPage() {
  const [kegiatan, setKegiatan] = useState<KegiatanSiswa[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nama: "",
    tanggal: new Date().toISOString().split("T")[0],
  });

  async function fetchKegiatan() {
    setLoading(true);

    const res = await fetch("/api/kegiatan-siswa");
    const data = await res.json();

    setKegiatan(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchKegiatan();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/kegiatan-siswa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setForm({
      nama: "",
      tanggal: new Date().toISOString().split("T")[0],
    });

    fetchKegiatan();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Kegiatan Siswa
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Buat kegiatan untuk absensi siswa berbasis QR.
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">
            Tambah Kegiatan
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={form.nama}
              onChange={(e) =>
                setForm({
                  ...form,
                  nama: e.target.value,
                })
              }
              placeholder="Nama kegiatan"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              required
            />

            <input
              type="date"
              value={form.tanggal}
              onChange={(e) =>
                setForm({
                  ...form,
                  tanggal: e.target.value,
                })
              }
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              required
            />

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-indigo-700"
            >
              Simpan Kegiatan
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              Daftar Kegiatan
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Memuat data...</div>
          ) : kegiatan.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Belum ada kegiatan
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {kegiatan.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.nama}
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-semibold">
                    Aktif
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
