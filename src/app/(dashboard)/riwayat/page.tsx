"use client";

import { useState, useEffect } from "react";

interface Absensi {
  id: string;
  tipe: string;
  status: string;
  waktuScan: string;
  tanggal: string;
  ruangan: { nama: string } | null;
  jadwal: {
    jamMulai: string;
    mataPelajaran: { nama: string };
    kelas: { nama: string };
  } | null;
}

const tipeLabel: Record<string, string> = {
  BERANGKAT: "Berangkat",
  JAM_MENGAJAR: "Jam Mengajar",
  PULANG: "Pulang",
};

const statusColor: Record<string, string> = {
  HADIR: "bg-green-100 text-green-700",
  TERLAMBAT: "bg-amber-100 text-amber-700",
  IZIN: "bg-blue-100 text-blue-700",
  SAKIT: "bg-violet-100 text-violet-700",
  ALPHA: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPHA: "Alpha",
};

export default function RiwayatPage() {
  const [riwayat, setRiwayat] = useState<Absensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulan, setBulan] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [filterTipe, setFilterTipe] = useState("SEMUA");

  async function fetchRiwayat() {
    setLoading(true);
    const res = await fetch(`/api/absensi/riwayat?bulan=${bulan}`);
    const data = await res.json();
    setRiwayat(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchRiwayat();
  }, [bulan]);

  const riwayatFiltered = riwayat.filter((item) => {
    const cocokStatus =
      filterStatus === "SEMUA" || item.status === filterStatus;

    const cocokTipe = filterTipe === "SEMUA" || item.tipe === filterTipe;

    return cocokStatus && cocokTipe;
  });

  // Group by tanggal
  const grouped = riwayatFiltered.reduce(
    (acc, item) => {
      const tgl = new Date(item.tanggal).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!acc[tgl]) acc[tgl] = [];
      acc[tgl].push(item);
      return acc;
    },
    {} as Record<string, Absensi[]>,
  );

  // Hitung ringkasan
  const totalHadir = riwayat.filter((r) => r.status === "HADIR").length;

  const totalTerlambat = riwayat.filter((r) => r.status === "TERLAMBAT").length;

  const totalIzin = riwayat.filter((r) => r.status === "IZIN").length;

  const totalSakit = riwayat.filter((r) => r.status === "SAKIT").length;

  const totalAlpha = riwayat.filter((r) => r.status === "ALPHA").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100 ">
            Riwayat Absensi
          </h1>
          <p className="dark:text-gray-400  text-sm mt-1">
            Riwayat kehadiran Anda
          </p>
        </div>
        <input
          type="month"
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalHadir}</div>
          <div className="text-sm dark:text-gray-400 mt-1">Hadir</div>
        </div>

        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">
            {totalTerlambat}
          </div>
          <div className="text-sm dark:text-gray-400 mt-1">Terlambat</div>
        </div>

        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalIzin}</div>
          <div className="text-sm dark:text-gray-400 mt-1">Izin</div>
        </div>

        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-violet-600">{totalSakit}</div>
          <div className="text-sm dark:text-gray-400 mt-1">Sakit</div>
        </div>

        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{totalAlpha}</div>
          <div className="text-sm dark:text-gray-400 mt-1">Alpha</div>
        </div>
      </div>

      {/* Filter Riwayat */}
      <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="filter-status"
              className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
            >
              Status
            </label>

            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="HADIR">Hadir</option>
              <option value="TERLAMBAT">Terlambat</option>
              <option value="IZIN">Izin</option>
              <option value="SAKIT">Sakit</option>
              <option value="ALPHA">Alpha</option>
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="filter-tipe"
              className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
            >
              Tipe Absensi
            </label>

            <select
              id="filter-tipe"
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SEMUA">Semua Tipe</option>
              <option value="BERANGKAT">Berangkat</option>
              <option value="JAM_MENGAJAR">Jam Mengajar</option>
              <option value="PULANG">Pulang</option>
            </select>
          </div>

          {(filterStatus !== "SEMUA" || filterTipe !== "SEMUA") && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus("SEMUA");
                setFilterTipe("SEMUA");
              }}
              className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Reset
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Menampilkan {riwayatFiltered.length} dari {riwayat.length} riwayat
        </p>
      </div>

      {/* List Riwayat */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Memuat data...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 text-center text-gray-400">
          {riwayat.length === 0
            ? "Belum ada riwayat absensi bulan ini"
            : "Tidak ada riwayat yang sesuai dengan filter"}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([tanggal, items]) => (
            <div
              key={tanggal}
              className="dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden"
            >
              <div className="px-4 py-3 dark:bg-gray-900  border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">{tanggal}</p>
              </div>
              <div className="divide-y dark:divide-gray-700 ">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium dark:text-gray-100 ">
                        {tipeLabel[item.tipe] ?? item.tipe}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.ruangan?.nama ??
                          tipeLabel[item.tipe] ??
                          item.tipe}
                        {item.jadwal &&
                          ` · ${item.jadwal.mataPelajaran.nama} - ${item.jadwal.kelas.nama}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          statusColor[item.status] ??
                          "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {statusLabel[item.status] ?? item.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(item.waktuScan).toLocaleTimeString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
