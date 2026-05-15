"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type DashboardData = {
  totalGuru: number;
  totalStaff: number;
  guruHadir: number;
  guruTerlambat: number;
  guruTidakHadir: number;
  staffHadir: number;
  staffTerlambat: number;
  staffTidakHadir: number;
  jadwal: any[];
};

type TargetAbsensi = {
  tipe: string;
  label: string;
  detail: string;
  status: string;
  waktuScan: string | null;
  ruangan: string | null;
};

type Jadwal = {
  id: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  guru: {
    user: {
      nama: string;
    };
  };
  kelas: {
    nama: string;
  };
  mataPelajaran: {
    nama: string;
  };
  ruangan: {
    nama: string;
  };
};

const statusColor: Record<string, string> = {
  HADIR: "bg-green-50 text-green-600",
  TERLAMBAT: "bg-amber-50 text-amber-600",
  TIDAK_HADIR: "bg-red-50 text-red-600",
  BELUM: "bg-gray-100 text-gray-500",
};

const statusLabel: Record<string, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  TIDAK_HADIR: "Tidak Hadir",
  BELUM: "Belum Scan",
};

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [data, setData] = useState<DashboardData | null>(null);
  const [targets, setTargets] = useState<TargetAbsensi[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);

  const role = session?.user?.role;
  const isAdminDashboard = role === "ADMIN" || role === "PIMPINAN";
  const isGuru = role === "GURU";
  const isStaff = role === "STAFF";

  const [kegiatanStaff, setKegiatanStaff] = useState<any[]>([]);
  const [savingKegiatan, setSavingKegiatan] = useState(false);
  const [formKegiatan, setFormKegiatan] = useState({
    jamMulai: "",
    jamSelesai: "",
    catatan: "",
  });

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hariMap: Record<number, string> = {
    1: "SENIN",
    2: "SELASA",
    3: "RABU",
    4: "KAMIS",
    5: "JUMAT",
    6: "SABTU",
  };

  const hariIni = hariMap[new Date().getDay()];

  async function simpanKegiatanStaff() {
    if (!formKegiatan.jamMulai || !formKegiatan.catatan) return;

    setSavingKegiatan(true);

    await fetch("/api/staff/kegiatan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formKegiatan),
    });

    setFormKegiatan({
      jamMulai: "",
      jamSelesai: "",
      catatan: "",
    });

    await fetchData();
    setSavingKegiatan(false);
  }
  async function fetchData() {
    if (!role) return;

    setLoading(true);

    if (isAdminDashboard) {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    }

    if (isGuru || isStaff) {
      const targetRes = await fetch("/api/absensi/target");
      const targetData = await targetRes.json();
      setTargets(Array.isArray(targetData) ? targetData : []);

      if (isGuru) {
        const jadwalRes = await fetch("/api/jadwal");
        const jadwalData = await jadwalRes.json();
        setJadwal(Array.isArray(jadwalData) ? jadwalData : []);
      }

      if (isStaff) {
        const kegiatanRes = await fetch("/api/staff/kegiatan");
        const kegiatanData = await kegiatanRes.json();
        setKegiatanStaff(Array.isArray(kegiatanData) ? kegiatanData : []);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus, role]);

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="p-8 text-center text-gray-400 dark:text-gray-500">
        Memuat dashboard...
      </div>
    );
  }

  const absenBerangkat =
    targets.find((item) => item.tipe === "BERANGKAT") ?? null;

  const absenPulang = targets.find((item) => item.tipe === "PULANG") ?? null;

  const jadwalHariIni = jadwal
    .filter((item) => item.hari === hariIni)
    .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));

  if (isGuru || isStaff) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {today}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Absen Berangkat
            </p>

            <div className="mt-3">
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  statusColor[absenBerangkat?.status ?? "BELUM"]
                }`}
              >
                {statusLabel[absenBerangkat?.status ?? "BELUM"]}
              </span>

              {absenBerangkat?.waktuScan && (
                <p className="text-xs text-gray-400 mt-2">
                  Scan pukul{" "}
                  {new Date(absenBerangkat.waktuScan).toLocaleTimeString(
                    "id-ID",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Absen Pulang
            </p>

            <div className="mt-3">
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  statusColor[absenPulang?.status ?? "BELUM"]
                }`}
              >
                {statusLabel[absenPulang?.status ?? "BELUM"]}
              </span>

              {absenPulang?.waktuScan && (
                <p className="text-xs text-gray-400 mt-2">
                  Scan pukul{" "}
                  {new Date(absenPulang.waktuScan).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {isGuru && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                Jadwal Pelajaran Hari Ini
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {hariIni ?? "Tidak ada jadwal"}
              </p>
            </div>

            {jadwalHariIni.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">
                Tidak ada jadwal pelajaran hari ini
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {jadwalHariIni.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {item.mataPelajaran.nama}
                      </p>

                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.kelas.nama} • {item.ruangan.nama} •{" "}
                        {item.guru.user.nama}
                      </p>
                    </div>

                    <div className="text-sm font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {item.jamMulai} - {item.jamSelesai}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isStaff && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              Kegiatan Hari Ini
            </h2>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Tulis kegiatan kerja harian berdasarkan waktu.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="time"
                value={formKegiatan.jamMulai}
                onChange={(e) =>
                  setFormKegiatan({ ...formKegiatan, jamMulai: e.target.value })
                }
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              />

              <input
                type="time"
                value={formKegiatan.jamSelesai}
                onChange={(e) =>
                  setFormKegiatan({
                    ...formKegiatan,
                    jamSelesai: e.target.value,
                  })
                }
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <textarea
              value={formKegiatan.catatan}
              onChange={(e) =>
                setFormKegiatan({ ...formKegiatan, catatan: e.target.value })
              }
              rows={4}
              placeholder="Contoh: Input data siswa, melayani administrasi, menyiapkan dokumen..."
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            />

            <button
              onClick={simpanKegiatanStaff}
              disabled={savingKegiatan}
              className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingKegiatan ? "Menyimpan..." : "Tambah Kegiatan"}
            </button>

            <div className="mt-5 divide-y divide-gray-100 dark:divide-gray-700">
              {kegiatanStaff.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Belum ada kegiatan hari ini
                </p>
              ) : (
                kegiatanStaff.map((item) => (
                  <div key={item.id} className="py-3">
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                      {item.jamMulai}
                      {item.jamSelesai ? ` - ${item.jamSelesai}` : ""}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {item.catatan}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{today}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Guru</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {data.totalGuru}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Guru Hadir</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {data.guruHadir}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Guru Terlambat
          </p>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {data.guruTerlambat}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Staff
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {data.totalStaff}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Staff Hadir
          </p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {data.staffHadir}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Staff Terlambat
          </p>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {data.staffTerlambat}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            Jadwal Hari Ini
          </h2>
        </div>

        {data.jadwal.length === 0 ? (
          <div className="p-6 text-sm text-gray-400 text-center">
            Tidak ada jadwal hari ini
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.jadwal.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {item.mapel}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {item.kelas} • {item.ruangan} • {item.guru}
                  </p>
                </div>

                <div className="text-sm font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {item.jamMulai} - {item.jamSelesai}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
