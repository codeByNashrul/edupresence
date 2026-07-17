"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  ScanLine,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  Sun,
  Sunset,
  BookOpen,
  RotateCcw,
  Loader2,
  CircleDashed,
} from "lucide-react";

type Status = "idle" | "scanning" | "success" | "error";

interface HasilScan {
  tipe: string;
  status: string;
  waktu: string;
  ruangan: string;
}

interface TargetAbsensi {
  tipe: string;
  label: string;
  detail: string;
  status: string;
  waktuScan: string | null;
  ruangan: string | null;
}

const tipeLabel: Record<string, string> = {
  BERANGKAT: "Absen Berangkat",
  JAM_MENGAJAR: "Absen Jam Mengajar",
  PULANG: "Absen Pulang",
};

const statusLabel: Record<string, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  TIDAK_HADIR: "Tidak Hadir",
  BELUM: "Belum Scan",
};

const statusBadge: Record<
  string,
  { className: string; icon: React.ElementType }
> = {
  HADIR: {
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  TERLAMBAT: {
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    icon: AlertCircle,
  },
  TIDAK_HADIR: {
    className:
      "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
    icon: XCircle,
  },
  BELUM: {
    className:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: CircleDashed,
  },
};

const tipeIcon: Record<string, React.ElementType> = {
  BERANGKAT: Sun,
  JAM_MENGAJAR: BookOpen,
  PULANG: Sunset,
};

export default function ScanPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [hasil, setHasil] = useState<HasilScan | null>(null);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [siapScan, setSiapScan] = useState(false);
  const [targets, setTargets] = useState<TargetAbsensi[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const selesaiCount = useMemo(
    () =>
      targets.filter(
        (t) => t.status === "HADIR" || t.status === "TERLAMBAT",
      ).length,
    [targets],
  );

  async function fetchTargets() {
    try {
      const res = await fetch("/api/absensi/target");
      const data = await res.json();
      setTargets(Array.isArray(data) ? data : []);
    } catch {
      setTargets([]);
    }
  }

  useEffect(() => {
    fetchTargets();
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch {
        /* cleanup */
      }
    };
  }, []);

  async function startScan() {
    setStatus("scanning");
    setError("");
    setHasil(null);
    setSiapScan(true);
  }

  useEffect(() => {
    if (!siapScan) return;

    async function initScanner() {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            try {
              if (scanner.isScanning) await scanner.stop();
            } catch {
              /* stop */
            }
            setIsScanning(false);
            setSiapScan(false);
            await kirimAbsensi(decodedText);
          },
          () => {},
        );

        setIsScanning(true);
      } catch (err: unknown) {
        setStatus("error");
        setError(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        setSiapScan(false);
      }
    }

    initScanner();
  }, [siapScan]);

  async function stopScan() {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {
      /* stop */
    }
    setIsScanning(false);
    setSiapScan(false);
    setStatus("idle");
  }

  async function kirimAbsensi(kodeQr: string) {
    try {
      const res = await fetch("/api/absensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodeQr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Terjadi kesalahan");
        await fetchTargets();
        return;
      }

      setHasil(data);
      setStatus("success");
      await fetchTargets();
    } catch {
      setStatus("error");
      setError("Gagal mengirim data absensi");
    }
  }

  function reset() {
    setStatus("idle");
    setHasil(null);
    setError("");
    fetchTargets();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <ScanLine size={14} />
              Absensi QR
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Scan Absensi</h1>
            <p className="text-indigo-100/90 text-sm mt-1.5 max-w-sm">
              Arahkan kamera ke QR Code di ruangan atau area absen sekolah
            </p>
          </div>
          {targets.length > 0 && (
            <div className="shrink-0 text-center bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <p className="text-2xl font-bold tabular-nums">
                {selesaiCount}/{targets.length}
              </p>
              <p className="text-[10px] text-indigo-200 uppercase tracking-wide mt-0.5">
                Selesai
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scanner area */}
      {status === "idle" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-8 sm:p-10 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950 flex items-center justify-center mb-5 ring-4 ring-indigo-50 dark:ring-indigo-900/50">
              <Camera
                size={36}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Siap Scan QR
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
              Pastikan Anda berada di ruangan yang sesuai dengan jadwal mengajar
            </p>
            <button
              type="button"
              onClick={startScan}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] touch-manipulation"
            >
              <ScanLine size={20} />
              Mulai Scan
            </button>
          </div>
        </div>
      )}

      {status === "scanning" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              Memindai...
            </div>
            {isScanning && (
              <Loader2
                size={18}
                className="animate-spin text-indigo-600"
              />
            )}
          </div>
          <div className="relative bg-gray-950">
            <div id="qr-reader" className="w-full [&_video]:rounded-none" />
            <div className="pointer-events-none absolute inset-8 border-2 border-white/40 rounded-2xl" />
          </div>
          <div className="p-4">
            <button
              type="button"
              onClick={stopScan}
              className="w-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {status === "success" && hasil && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-center text-white">
            <CheckCircle2 size={48} className="mx-auto mb-3 opacity-95" />
            <h2 className="text-xl font-bold">Absensi Berhasil!</h2>
            <p className="text-emerald-100 text-sm mt-1 flex items-center justify-center gap-1">
              <MapPin size={14} />
              {hasil.ruangan}
            </p>
          </div>
          <div className="p-6 space-y-3">
            {[
              { label: "Tipe", value: tipeLabel[hasil.tipe] ?? hasil.tipe },
              {
                label: "Status",
                value: statusLabel[hasil.status] ?? hasil.status,
                badge: hasil.status,
              },
              { label: "Waktu", value: hasil.waktu, icon: Clock },
            ].map((row) => {
              const badge = row.badge
                ? statusBadge[row.badge]
                : null;
              const BadgeIcon = badge?.icon;
              return (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {row.label}
                  </span>
                  {badge && BadgeIcon ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}
                    >
                      <BadgeIcon size={12} />
                      {row.value}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      {row.icon && <row.icon size={14} className="text-gray-400" />}
                      {row.value}
                    </span>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={reset}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition shadow-md"
            >
              <RotateCcw size={18} />
              Selesai
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-8 text-center text-white">
            <XCircle size={48} className="mx-auto mb-3 opacity-95" />
            <h2 className="text-xl font-bold">Absensi Gagal</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-4 py-3 mb-6">
              <AlertCircle
                size={20}
                className="text-red-500 shrink-0 mt-0.5"
              />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition"
            >
              <RotateCcw size={18} />
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Daftar target */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" />
            Absensi Hari Ini
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pantau scan yang sudah dan belum dilakukan
          </p>
        </div>

        {targets.length === 0 ? (
          <div className="p-10 text-center">
            <CircleDashed
              size={40}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
            />
            <p className="text-sm text-gray-500">
              Belum ada target absensi hari ini
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {targets.map((item, index) => {
              const TipeIcon = tipeIcon[item.tipe] ?? ScanLine;
              const badge = statusBadge[item.status] ?? statusBadge.BELUM;
              const BadgeIcon = badge.icon;
              const done =
                item.status === "HADIR" || item.status === "TERLAMBAT";

              return (
                <li key={`${item.tipe}-${index}`} className="p-4 sm:p-5">
                  <div className="flex gap-4">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        done
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      }`}
                    >
                      <TipeIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {item.detail}
                        </p>
                        {item.waktuScan && (
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1 flex-wrap">
                            <Clock size={12} />
                            {new Date(item.waktuScan).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                            {item.ruangan && (
                              <>
                                <span className="text-gray-300">·</span>
                                <MapPin size={12} />
                                {item.ruangan}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${badge.className}`}
                      >
                        <BadgeIcon size={11} />
                        {statusLabel[item.status] ?? item.status}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
