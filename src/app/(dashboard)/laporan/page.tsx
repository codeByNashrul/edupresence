"use client";

import { useEffect, useState } from "react";

interface LaporanItem {
  nama: string;
  nip: string;
  role?: string;
  hadir: number;
  terlambat: number;
  tidakHadir: number;
  total: number;
  persentase: number;
}

interface LaporanData {
  tipe: string;
  periode: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  laporan?: LaporanItem[];
}

export default function LaporanPage() {
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipe, setTipe] = useState("kehadiran");
  const [periode, setPeriode] = useState("bulanan");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split("T")[0],
  );

  const laporan = Array.isArray(data?.laporan) ? data.laporan : [];

  async function fetchLaporan() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/laporan?tipe=${tipe}&periode=${periode}&tanggal=${tanggal}`,
      );

      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLaporan();
  }, [tipe, periode, tanggal]);

  function exportExcel() {
    if (laporan.length === 0) return;

    const headers = [
      "Nama",
      "NIP",
      "Role",
      "Hadir",
      "Terlambat",
      "Tidak Hadir",
      "Total",
      "Persentase",
    ];

    const rows = laporan.map((item) => [
      item.nama,
      item.nip,
      item.role ?? "-",
      item.hadir,
      item.terlambat,
      item.tidakHadir,
      item.total,
      `${item.persentase}%`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `laporan-${tipe}-${periode}-${tanggal}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.print();
  }

  const formatTanggal = (tgl?: string) => {
    if (!tgl) return "";

    return new Date(tgl).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Laporan
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {data?.tanggalMulai && data?.tanggalSelesai
              ? `${formatTanggal(data.tanggalMulai)} – ${formatTanggal(
                  data.tanggalSelesai,
                )}`
              : "Pilih filter laporan"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            disabled={laporan.length === 0}
            className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 transition"
          >
            📊 Export Excel
          </button>

          <button
            onClick={exportPdf}
            disabled={laporan.length === 0}
            className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 transition"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Jenis Laporan
          </label>

          <select
            value={tipe}
            onChange={(e) => setTipe(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="kehadiran">Kehadiran (Guru & Staff)</option>
            <option value="mengajar">Mengajar (Guru)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Periode
          </label>

          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tanggal
          </label>

          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat laporan...</div>
        ) : laporan.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Tidak ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    Nama
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    NIP
                  </th>

                  {tipe === "kehadiran" && (
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                      Role
                    </th>
                  )}

                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    Hadir
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    Terlambat
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    Tidak Hadir
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                    %
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {laporan.map((item, i) => (
                  <tr
                    key={`${item.nip}-${i}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {item.nama}
                    </td>

                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {item.nip}
                    </td>

                    {tipe === "kehadiran" && (
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            item.role === "GURU"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {item.role ?? "-"}
                        </span>
                      </td>
                    )}

                    <td className="px-4 py-3 text-center text-green-600 font-medium">
                      {item.hadir}
                    </td>

                    <td className="px-4 py-3 text-center text-amber-500 font-medium">
                      {item.terlambat}
                    </td>

                    <td className="px-4 py-3 text-center text-red-500 font-medium">
                      {item.tidakHadir}
                    </td>

                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                      {item.total}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-medium ${
                          item.persentase >= 80
                            ? "text-green-600"
                            : item.persentase >= 60
                              ? "text-amber-500"
                              : "text-red-500"
                        }`}
                      >
                        {item.persentase}%
                      </span>
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
