"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

interface JadwalItem {
  id: string;
  jamMulai: string;
  jamSelesai: string;
  guru: string;
  guruId: string;
  noWa?: string;
  mapel: string;
  kelas: string;
  ruangan: string;
  status: string;
  waktuScan?: string | null;
}

interface DashboardData {
  totalGuru: number;
  totalStaff: number;

  guruHadir: number;
  guruTerlambat: number;
  guruTidakHadir: number;

  staffHadir: number;
  staffTerlambat: number;
  staffTidakHadir: number;

  jadwal: JadwalItem[];
}

interface PengumumanItem {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
  pembuat?: {
    nama: string;
  };
}

interface TargetAbsensi {
  tipe: string;
  label: string;
  detail: string;
  status: string;
  waktuScan: string | null;
  ruangan: string | null;
}

const COLORS = ["#4f46e5", "#f59e0b"];

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  return days;
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function CalendarPanel({
  selectedDate,
  onSelectDate,
  pengumuman,
  canCreatePengumuman,
  formPengumuman,
  setFormPengumuman,
  simpanPengumuman,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  pengumuman: PengumumanItem[];
  canCreatePengumuman: boolean;
  formPengumuman: { judul: string; isi: string };
  setFormPengumuman: React.Dispatch<
    React.SetStateAction<{ judul: string; isi: string }>
  >;
  simpanPengumuman: () => void;
}) {
  const current = new Date(selectedDate);
  const year = current.getFullYear();
  const month = current.getMonth();

  const days = useMemo(() => buildCalendar(year, month), [year, month]);

  const monthLabel = current.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            Kalender
          </h2>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {monthLabel}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs mb-3">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((h) => (
            <div key={h} className="text-gray-400 font-medium">
              {h}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            if (!day) return <div key={i} />;

            const fullDate = new Date(year, month, day);
            const iso = formatDate(fullDate);
            const active = iso === selectedDate;

            return (
              <button
                key={i}
                onClick={() => onSelectDate(iso)}
                className={`aspect-square rounded-xl text-sm font-medium ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">
            Pengumuman
          </h3>

          {canCreatePengumuman && (
            <div className="mb-4 space-y-2">
              <input
                value={formPengumuman.judul}
                onChange={(e) =>
                  setFormPengumuman({
                    ...formPengumuman,
                    judul: e.target.value,
                  })
                }
                placeholder="Judul pengumuman"
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              />

              <textarea
                value={formPengumuman.isi}
                onChange={(e) =>
                  setFormPengumuman({
                    ...formPengumuman,
                    isi: e.target.value,
                  })
                }
                placeholder="Isi pengumuman"
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              />

              <button
                onClick={simpanPengumuman}
                className="w-full bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700"
              >
                Tambah Pengumuman
              </button>
            </div>
          )}

          <div className="space-y-3">
            {pengumuman.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada pengumuman</p>
            ) : (
              pengumuman.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3"
                >
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    {item.judul}
                  </p>

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {item.isi}
                  </p>

                  <p className="text-[11px] text-gray-400 mt-2">
                    {item.pembuat?.nama ?? "Admin"} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [pengumuman, setPengumuman] = useState<PengumumanItem[]>([]);
  const [targets, setTargets] = useState<TargetAbsensi[]>([]);

  const [formPengumuman, setFormPengumuman] = useState({
    judul: "",
    isi: "",
  });

  const role = session?.user?.role ?? "";

  const isManagement = ["ADMIN", "PIMPINAN"].includes(role);

  async function fetchDashboard() {
    if (!isManagement) {
      const targetRes = await fetch("/api/absensi/target");
      const targetData = await targetRes.json();
      setTargets(Array.isArray(targetData) ? targetData : []);
    }
    try {
      setLoading(true);

      const res = await fetch(`/api/dashboard?tanggal=${selectedDate}`);

      const json = await res.json();

      setData(json);

      const pengumumanRes = await fetch("/api/pengumuman");
      const pengumumanData = await pengumumanRes.json();

      setPengumuman(Array.isArray(pengumumanData) ? pengumumanData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function simpanPengumuman() {
    if (!formPengumuman.judul || !formPengumuman.isi) return;

    await fetch("/api/pengumuman", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formPengumuman),
    });

    setFormPengumuman({
      judul: "",
      isi: "",
    });

    fetchDashboard();
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchDashboard();
    }
  }, [sessionStatus, selectedDate]);

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-gray-400">Memuat dashboard...</div>
    );
  }

  const jadwalDashboard = Array.isArray(data?.jadwal) ? data.jadwal : [];

  const komposisiData = [
    {
      name: "Guru",
      value: data.totalGuru,
    },
    {
      name: "Staff",
      value: data.totalStaff,
    },
  ];

  const kehadiranData = [
    {
      name: "Guru",
      Hadir: data.guruHadir,
      Terlambat: data.guruTerlambat,
      Belum: data.guruTidakHadir,
    },
    {
      name: "Staff",
      Hadir: data.staffHadir,
      Terlambat: data.staffTerlambat,
      Belum: data.staffTidakHadir,
    },
  ];

  const absenBerangkat = targets.find((item) => item.tipe === "BERANGKAT");
  const absenPulang = targets.find((item) => item.tipe === "PULANG");

  const statusStyle: Record<string, string> = {
    HADIR: "text-green-600",
    TERLAMBAT: "text-amber-600",
    BELUM: "text-gray-500",
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      {/* LEFT */}
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitoring kehadiran & aktivitas sekolah
          </p>
        </div>

        {/* MANAGEMENT */}
        {isManagement ? (
          <>
            {/* CARD */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Guru
                </p>

                <h2 className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">
                  {data.totalGuru}
                </h2>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Staff
                </p>

                <h2 className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">
                  {data.totalStaff}
                </h2>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Guru Hadir
                </p>

                <h2 className="text-3xl font-bold mt-2 text-green-600">
                  {data.guruHadir}
                </h2>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Staff Hadir
                </p>

                <h2 className="text-3xl font-bold mt-2 text-indigo-600">
                  {data.staffHadir}
                </h2>
              </div>
            </div>

            {/* CHART */}
            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Komposisi Guru & Staff
                </h2>

                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={komposisiData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {komposisiData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>

                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Grafik Kehadiran
                </h2>

                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kehadiranData}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />

                      <Bar
                        dataKey="Hadir"
                        fill="#22c55e"
                        radius={[6, 6, 0, 0]}
                      />

                      <Bar
                        dataKey="Terlambat"
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                      />

                      <Bar
                        dataKey="Belum"
                        fill="#94a3b8"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {!isManagement && (
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Absen Berangkat
              </p>
              <span className={statusStyle[absenBerangkat?.status ?? "BELUM"]}>
                {absenBerangkat?.status ?? "Belum Scan"}
              </span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Absen Pulang
              </p>
              <span className={statusStyle[absenPulang?.status ?? "BELUM"]}>
                {absenPulang?.status ?? "Belum Scan"}
              </span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {role === "GURU" ? "Jadwal Hari Ini" : "Kegiatan Hari Ini"}
              </p>
              <h2 className="text-xl font-bold mt-2 text-indigo-600">
                {role === "GURU"
                  ? `${jadwalDashboard.length} Jadwal`
                  : "Isi Kegiatan"}
              </h2>
            </div>
          </div>
        )}

        {/* JADWAL */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              Jadwal Hari Ini
            </h2>
          </div>

          {jadwalDashboard.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Tidak ada jadwal hari ini
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {jadwalDashboard.map((j) => (
                <div
                  key={j.id}
                  className="p-5 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {j.mapel}
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {j.kelas} • {j.ruangan}
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {j.jamMulai} - {j.jamSelesai}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {j.guru}
                    </p>

                    {isManagement ? (
                      <span
                        className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                          j.status === "HADIR"
                            ? "bg-green-100 text-green-700"
                            : j.status === "TERLAMBAT"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {j.status}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div>
        <CalendarPanel
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          pengumuman={pengumuman}
          canCreatePengumuman={isManagement}
          formPengumuman={formPengumuman}
          setFormPengumuman={setFormPengumuman}
          simpanPengumuman={simpanPengumuman}
        />
      </div>
    </div>
  );
}
