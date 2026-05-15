"use client";

import { useState, useEffect } from "react";

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
  laporan: LaporanItem[];
}

export default function LaporanPage() {
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipe, setTipe] = useState("kehadiran");
  const [periode, setPeriode] = useState("bulanan");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split("T")[0],
  );

  async function fetchLaporan() {
    setLoading(true);
    const res = await fetch(
      `/api/laporan?tipe=${tipe}&periode=${periode}&tanggal=${tanggal}`,
    );
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    fetchLaporan();
  }, [tipe, periode, tanggal]);

  async function exportExcel() {
    if (!data) return;

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

    const rows = data.laporan.map((item) => [
      item.nama,
      item.nip,
      item.role ?? "GURU",
      item.hadir,
      item.terlambat,
      item.tidakHadir,
      item.total,
      `${item.persentase}%`,
    ]);

    // gunakan ; agar otomatis terpisah kolom di Excel Indonesia
    const csvContent = [headers, ...rows]
      .map((row) => row.join(";"))
      .join("\n");

    // tambahkan BOM UTF-8 agar karakter aman
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

  async function exportPdf() {
    window.print();
  }

  const formatTanggal = (tgl: string) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100 ">Laporan</h1>
          <p className="dark:text-gray-400  text-sm mt-1">
            {data &&
              `${formatTanggal(data.tanggalMulai)} – ${formatTanggal(data.tanggalSelesai)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:dark:bg-gray-900  transition"
          >
            📊 Export Excel
          </button>
          <button
            onClick={exportPdf}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:dark:bg-gray-900  transition"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="dark:bg-gray-800  rounded-xl border dark:border-gray-700 p-4 mb-6 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium dark:text-gray-400  mb-1">
            Jenis Laporan
          </label>
          <select
            value={tipe}
            onChange={(e) => setTipe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="kehadiran">Kehadiran (Guru & Staff)</option>
            <option value="mengajar">Mengajar (Guru)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium dark:text-gray-400  mb-1">
            Periode
          </label>
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium dark:text-gray-400  mb-1">
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="dark:bg-gray-800  rounded-xl border dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat laporan...</div>
        ) : !data || data.laporan.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Tidak ada data</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="dark:bg-gray-900  border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Nama
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  NIP
                </th>
                {tipe === "kehadiran" && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Role
                  </th>
                )}
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Hadir
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Terlambat
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Total
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700 ">
              {data.laporan.map((item, i) => (
                <tr key={i} className="hover:dark:bg-gray-900 ">
                  <td className="px-4 py-3 font-medium dark:text-gray-100 ">
                    {item.nama}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.nip}</td>
                  {tipe === "kehadiran" && (
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          item.role === "GURU"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-center text-green-600 font-medium">
                    {item.hadir}
                  </td>
                  <td className="px-4 py-3 text-center text-amber-500 font-medium">
                    {item.terlambat}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
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
        )}
      </div>
    </div>
  );
}
