"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

interface AbsensiItem {
  id: string;
  tanggal: string;
  status: "HADIR" | "TERLAMBAT" | "TIDAK_HADIR";
  waktuScan: string;
}

interface Ringkasan {
  hadir: number;
  terlambat: number;
  tidakHadir: number;
}

const statusConfig = {
  HADIR: {
    label: "Hadir",
    icon: CheckCircle2,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  TERLAMBAT: {
    label: "Terlambat",
    icon: AlertCircle,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  TIDAK_HADIR: {
    label: "Tidak Hadir",
    icon: CircleDashed,
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

export default function OrtuAbsensiPage() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [absensi, setAbsensi] = useState<AbsensiItem[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);

  function prevBulan() {
    if (bulan === 1) {
      setBulan(12);
      setTahun((y) => y - 1);
    } else setBulan((b) => b - 1);
  }
  function nextBulan() {
    if (bulan === 12) {
      setBulan(1);
      setTahun((y) => y + 1);
    } else setBulan((b) => b + 1);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/ortu/absensi?bulan=${bulan}&tahun=${tahun}`,
        );
        const data = await res.json();
        setAbsensi(data.absensi ?? []);
        setRingkasan(data.ringkasan ?? null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bulan, tahun]);

  const bulanLabel = new Date(tahun, bulan - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const totalHari =
    (ringkasan?.hadir ?? 0) +
    (ringkasan?.terlambat ?? 0) +
    (ringkasan?.tidakHadir ?? 0);
  const pctHadir =
    totalHari > 0
      ? Math.round(
          ((ringkasan!.hadir + ringkasan!.terlambat) / totalHari) * 100,
        )
      : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Riwayat Absensi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kehadiran anak di sekolah per bulan
        </p>
      </div>

      {/* Navigasi bulan */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4">
        <button
          onClick={prevBulan}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-900 dark:text-gray-100">
            {bulanLabel}
          </p>
          {ringkasan && (
            <p className="text-xs text-gray-500 mt-0.5">
              {totalHari} hari tercatat · {pctHadir}% hadir
            </p>
          )}
        </div>
        <button
          onClick={nextBulan}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Ringkasan */}
      {ringkasan && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Hadir",
              value: ringkasan.hadir,
              color: "text-emerald-600",
              bg: "bg-emerald-50 dark:bg-emerald-950/40",
              border: "border-emerald-200 dark:border-emerald-900",
            },
            {
              label: "Terlambat",
              value: ringkasan.terlambat,
              color: "text-amber-600",
              bg: "bg-amber-50 dark:bg-amber-950/40",
              border: "border-amber-200 dark:border-amber-900",
            },
            {
              label: "Tidak Hadir",
              value: ringkasan.tidakHadir,
              color: "text-rose-600",
              bg: "bg-rose-50 dark:bg-rose-950/40",
              border: "border-rose-200 dark:border-rose-900",
            },
          ].map(({ label, value, color, bg, border }) => (
            <div
              key={label}
              className={`rounded-2xl p-4 border ${bg} ${border} text-center`}
            >
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* List absensi */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/20">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-600" />
            Detail Kehadiran
          </h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse"
              />
            ))}
          </div>
        ) : absensi.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays
              size={40}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
            />
            <p className="text-gray-500 text-sm">
              Belum ada data absensi bulan ini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {absensi.map((item) => {
              const cfg = statusConfig[item.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {new Date(
                          item.tanggal + "T12:00:00",
                        ).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Scan:{" "}
                        {new Date(item.waktuScan).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.className}`}
                  >
                    <Icon size={12} />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
