"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  GraduationCap,
  BookOpen,
  Loader2,
} from "lucide-react";

interface JadwalItem {
  id: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  mataPelajaran: { nama: string; kode: string };
  guru: { user: { nama: string } };
  ruangan: { nama: string };
}

const hariOrder = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const hariLabel: Record<string, string> = {
  SENIN: "Senin",
  SELASA: "Selasa",
  RABU: "Rabu",
  KAMIS: "Kamis",
  JUMAT: "Jumat",
  SABTU: "Sabtu",
};
const hariColors: Record<string, string> = {
  SENIN:
    "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900",
  SELASA:
    "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900",
  RABU: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
  KAMIS:
    "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
  JUMAT: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900",
  SABTU: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900",
};
const hariDotColors: Record<string, string> = {
  SENIN: "bg-indigo-500",
  SELASA: "bg-violet-500",
  RABU: "bg-emerald-500",
  KAMIS: "bg-amber-500",
  JUMAT: "bg-rose-500",
  SABTU: "bg-sky-500",
};
const hariTextColors: Record<string, string> = {
  SENIN: "text-indigo-600 dark:text-indigo-400",
  SELASA: "text-violet-600 dark:text-violet-400",
  RABU: "text-emerald-600 dark:text-emerald-400",
  KAMIS: "text-amber-600 dark:text-amber-400",
  JUMAT: "text-rose-600 dark:text-rose-400",
  SABTU: "text-sky-600 dark:text-sky-400",
};

function getTodayHari() {
  const map: Record<number, string> = {
    1: "SENIN",
    2: "SELASA",
    3: "RABU",
    4: "KAMIS",
    5: "JUMAT",
    6: "SABTU",
  };
  return map[new Date().getDay()] ?? null;
}

export default function OrtuJadwalPage() {
  const [jadwal, setJadwal] = useState<JadwalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHari, setActiveHari] = useState<string>(
    getTodayHari() ?? "SENIN",
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ortu/jadwal");
        const data = await res.json();
        setJadwal(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const grouped = hariOrder.reduce<Record<string, JadwalItem[]>>(
    (acc, hari) => {
      acc[hari] = jadwal.filter((j) => j.hari === hari);
      return acc;
    },
    {},
  );

  const hariAktif = grouped[activeHari] ?? [];
  const todayHari = getTodayHari();
  const totalMapel = jadwal.length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <CalendarDays size={14} />
              Jadwal Pelajaran
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Jadwal Pelajaran
            </h1>
            <p className="text-indigo-100/90 text-sm mt-1.5">
              Jadwal kelas anak per hari
            </p>
          </div>
          {!loading && (
            <div className="shrink-0 text-center bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <p className="text-2xl font-bold tabular-nums">{totalMapel}</p>
              <p className="text-[10px] text-indigo-200 uppercase tracking-wide mt-0.5">
                Total Mapel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tab hari */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {hariOrder.map((hari) => {
            const isActive = hari === activeHari;
            const isToday = hari === todayHari;
            const count = grouped[hari]?.length ?? 0;
            return (
              <button
                key={hari}
                onClick={() => setActiveHari(hari)}
                className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <span>{hariLabel[hari]}</span>
                <span
                  className={`text-[10px] font-medium ${isActive ? "text-indigo-200" : "text-gray-400"}`}
                >
                  {count} mapel{isToday && !isActive ? " ·" : ""}
                </span>
                {isToday && (
                  <span
                    className={`text-[8px] font-bold uppercase ${isActive ? "text-indigo-200" : "text-indigo-500"}`}
                  >
                    Hari ini
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Jadwal hari aktif */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-indigo-400 mb-3"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Memuat jadwal...
            </p>
          </div>
        ) : hariAktif.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
            <CalendarDays
              size={40}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tidak ada jadwal hari {hariLabel[activeHari]}
            </p>
          </div>
        ) : (
          hariAktif
            .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai))
            .map((item, index) => (
              <div
                key={item.id}
                className={`flex gap-4 rounded-2xl border p-4 ${hariColors[activeHari]}`}
              >
                {/* Nomor urut */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {item.mataPelajaran.nama}
                        <span className="ml-2 text-[10px] font-semibold text-gray-400 bg-white/70 dark:bg-gray-800/70 px-1.5 py-0.5 rounded-md">
                          {item.mataPelajaran.kode}
                        </span>
                      </p>
                      <p
                        className={`text-sm font-semibold flex items-center gap-1 mt-1 ${hariTextColors[activeHari]}`}
                      >
                        <Clock size={13} />
                        {item.jamMulai} – {item.jamSelesai}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <GraduationCap size={12} />
                        {item.guru.user.nama}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin size={12} />
                        {item.ruangan.nama}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Ringkasan semua hari */}
      {!loading && jadwal.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-600" />
              Ringkasan Semua Hari
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-0 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-800">
            {hariOrder.map((hari) => {
              const count = grouped[hari]?.length ?? 0;
              const isToday = hari === todayHari;
              const isActive = hari === activeHari;
              return (
                <button
                  key={hari}
                  onClick={() => setActiveHari(hari)}
                  className={`flex flex-col items-center gap-1.5 p-4 transition-colors ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${hariDotColors[hari]}`}
                  />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {hariLabel[hari]}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {count}
                  </p>
                  {isToday && (
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide">
                      Hari ini
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
