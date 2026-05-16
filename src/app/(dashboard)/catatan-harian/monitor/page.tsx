"use client";

import { useState, useEffect } from "react";

interface CatatanHarian {
  id: string;
  tanggal: string;
  kegiatan: string;
  hasil: string;
  kendala: string | null;
  foto: string[];
  user: {
    id: string;
    nama: string;
    nip: string;
  };
}

interface Staff {
  id: string;
  nama: string;
  nip: string;
}

export default function MonitorCatatanHarianPage() {
  const [catatan, setCatatan] = useState<CatatanHarian[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedCatatan, setSelectedCatatan] = useState<CatatanHarian | null>(
    null,
  );

  async function fetchStaff() {
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaff(Array.isArray(data) ? data : []);
  }

  async function fetchCatatan() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tanggal) params.set("tanggal", tanggal);
      if (selectedStaff) params.set("userId", selectedStaff);

      const res = await fetch(`/api/catatan-harian?${params.toString()}`);
      const data = await res.json();
      setCatatan(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStaff();
  }, []);
  useEffect(() => {
    fetchCatatan();
  }, [tanggal, selectedStaff]);

  const formatTanggal = (tgl: string) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Catatan Harian Staff
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Monitor catatan kegiatan harian staff
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Staff
          </label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List Catatan */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Memuat data...</div>
      ) : catatan.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
          Tidak ada catatan untuk filter ini
        </div>
      ) : (
        <div className="space-y-4">
          {catatan.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {c.user.nama}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    NIP: {c.user.nip} · {formatTanggal(c.tanggal)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSelectedCatatan(selectedCatatan?.id === c.id ? null : c)
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {selectedCatatan?.id === c.id ? "Tutup" : "Lihat Detail"}
                </button>
              </div>

              {/* Preview singkat */}
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {c.kegiatan}
              </p>

              {/* Detail lengkap */}
              {selectedCatatan?.id === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Kegiatan
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {c.kegiatan}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Hasil
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {c.hasil}
                    </p>
                  </div>

                  {c.kendala && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Kendala
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {c.kendala}
                      </p>
                    </div>
                  )}

                  {/* Foto */}
                  {c.foto && c.foto.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Foto Bukti ({c.foto.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {c.foto.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={url}
                              alt={`Foto ${i + 1}`}
                              className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
