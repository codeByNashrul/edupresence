"use client";

import { useEffect, useState } from "react";

interface Kegiatan {
  id: string;
  nama: string;
}

interface Laporan {
  id: string;
  nama: string;
  nis: string;
  jenisKelamin: string;
  kelas: string;
  status: string;
  waktuScan: string;
  kegiatan: string;
}

export default function LaporanKegiatanSiswaPage() {
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [kegiatanId, setKegiatanId] = useState("");

  const [loading, setLoading] = useState(true);

  async function fetchData(id?: string) {
    setLoading(true);

    const url = id
      ? `/api/laporan-kegiatan-siswa?kegiatanId=${id}`
      : "/api/laporan-kegiatan-siswa";

    const res = await fetch(url);
    const data = await res.json();

    setKegiatan(Array.isArray(data.kegiatan) ? data.kegiatan : []);
    setLaporan(Array.isArray(data.laporan) ? data.laporan : []);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleSelect(id: string) {
    setKegiatanId(id);
    fetchData(id);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Laporan Kegiatan Siswa
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Rekap absensi siswa berdasarkan kegiatan.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Pilih Kegiatan
        </label>

        <select
          value={kegiatanId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Pilih kegiatan</option>

          {kegiatan.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat laporan...</div>
        ) : laporan.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Belum ada data absensi kegiatan
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">NIS</th>
                  <th className="px-4 py-3 text-left">JK</th>
                  <th className="px-4 py-3 text-left">Kelas</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Waktu</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {laporan.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {item.nama}
                    </td>

                    <td className="px-4 py-3">{item.nis}</td>

                    <td className="px-4 py-3">
                      {item.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </td>

                    <td className="px-4 py-3">{item.kelas}</td>

                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {new Date(item.waktuScan).toLocaleTimeString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
