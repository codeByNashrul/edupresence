"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  ScanLine,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  Activity,
  RotateCcw,
  Loader2,
  ChevronDown,
} from "lucide-react";

type Status = "idle" | "scanning" | "success" | "error" | "processing";

interface KegiatanSiswa {
  id: string;
  nama: string;
  tanggal: string;
}

interface HasilScan {
  status: string;
  waktu: string;
  kegiatan: string;
  siswa: {
    nama: string;
    nis: string;
    jenisKelamin: string;
    kelas: string;
  };
}

const statusBadgeClass: Record<string, string> = {
  HADIR:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  TERLAMBAT:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  TIDAK_HADIR: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
};

export default function ScanKegiatanSiswaPage() {
  const [kegiatan, setKegiatan] = useState<KegiatanSiswa[]>([]);
  const [kegiatanId, setKegiatanId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [hasil, setHasil] = useState<HasilScan | null>(null);
  const [error, setError] = useState("");
  const [siapScan, setSiapScan] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  async function fetchKegiatan() {
    const res = await fetch("/api/kegiatan-siswa");
    const data = await res.json();
    setKegiatan(Array.isArray(data) ? data : []);
    if (Array.isArray(data) && data.length > 0) {
      setKegiatanId(data[0].id);
    }
  }

  useEffect(() => {
    fetchKegiatan();
    return () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch {}
    };
  }, []);

  function startScan() {
    if (!kegiatanId) {
      setStatus("error");
      setError("Pilih kegiatan terlebih dahulu");
      return;
    }
    setStatus("scanning");
    setError("");
    setHasil(null);
    setSiapScan(true);
  }

  useEffect(() => {
    if (!siapScan) return;

    async function initScanner() {
      try {
        const scanner = new Html5Qrcode("qr-reader-kegiatan-siswa");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            try {
              if (scanner.isScanning) await scanner.stop();
            } catch {}
            setIsScanning(false);
            setSiapScan(false);
            await kirimAbsensi(decodedText);
          },
          () => {},
        );

        setIsScanning(true);
      } catch (err: any) {
        setStatus("error");
        setError(`Error: ${err?.message ?? err}`);
        setSiapScan(false);
      }
    }

    initScanner();
  }, [siapScan]);

  async function stopScan() {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {}
    setIsScanning(false);
    setSiapScan(false);
    setStatus("idle");
  }

  async function kirimAbsensi(kodeQr: string) {
    setStatus("processing");
    try {
      const res = await fetch("/api/absensi-kegiatan-siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodeQr, kegiatanId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Absensi kegiatan gagal");
        return;
      }

      setHasil(data);
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Gagal mengirim absensi kegiatan siswa");
    }
  }

  function reset() {
    setStatus("idle");
    setHasil(null);
    setError("");
  }

  const selectedKegiatan = kegiatan.find((k) => k.id === kegiatanId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-6 text-white shadow-lg shadow-emerald-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <Activity size={14} />
              Kegiatan Siswa
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Scan Kegiatan Siswa
            </h1>
            <p className="text-emerald-100/90 text-sm mt-1.5 max-w-sm">
              Pilih kegiatan lalu scan QR Code siswa untuk mencatat kehadiran
            </p>
          </div>
          <div className="shrink-0 text-center bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
            <div className="text-2xl mb-0.5">🎯</div>
            <p className="text-[10px] text-emerald-200 uppercase tracking-wide">
              Kegiatan
            </p>
          </div>
        </div>
      </div>

      {/* Selector kegiatan */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Pilih Kegiatan
        </label>
        <div className="relative">
          <select
            value={kegiatanId}
            onChange={(e) => setKegiatanId(e.target.value)}
            className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all cursor-pointer"
          >
            <option value="">— Pilih kegiatan —</option>
            {kegiatan.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama} ·{" "}
                {new Date(item.tanggal).toLocaleDateString("id-ID")}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      {/* IDLE */}
      {status === "idle" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-8 sm:p-10 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 flex items-center justify-center mb-5 ring-4 ring-emerald-50 dark:ring-emerald-900/50">
              <Camera
                size={36}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Siap Scan QR Siswa
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
              Pastikan kegiatan sudah dipilih sebelum memulai scan
            </p>
            <button
              type="button"
              onClick={startScan}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] touch-manipulation"
            >
              <ScanLine size={20} />
              Mulai Scan
            </button>
          </div>
        </div>
      )}

      {/* SCANNING */}
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
              <Loader2 size={18} className="animate-spin text-emerald-600" />
            )}
          </div>
          <div className="relative bg-gray-950">
            <div
              id="qr-reader-kegiatan-siswa"
              className="w-full [&_video]:rounded-none"
            />
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

      {/* PROCESSING */}
      {status === "processing" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
          <Loader2
            size={40}
            className="mx-auto animate-spin text-emerald-600 dark:text-emerald-400 mb-4"
          />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Memproses Data...
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mohon tunggu sebentar
          </p>
        </div>
      )}

      {/* SUCCESS */}
      {status === "success" && hasil && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-center text-white">
            <CheckCircle2 size={48} className="mx-auto mb-3 opacity-95" />
            <h2 className="text-xl font-bold">Absensi Berhasil!</h2>
            <p className="text-emerald-100 text-sm mt-1">{hasil.kegiatan}</p>
          </div>

          <div className="p-6 space-y-3">
            {[
              { label: "Nama Siswa", value: hasil.siswa.nama },
              { label: "NIS", value: hasil.siswa.nis },
              { label: "Kelas", value: hasil.siswa.kelas },
              { label: "Status", value: hasil.status, badge: hasil.status },
              { label: "Waktu", value: hasil.waktu, icon: Clock },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {row.label}
                </span>
                {row.badge ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass[row.badge] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {row.value}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    {row.icon && (
                      <row.icon size={14} className="text-gray-400" />
                    )}
                    {row.value}
                  </span>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={reset}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl font-semibold shadow-md transition"
            >
              <RotateCcw size={18} />
              Scan Siswa Berikutnya
            </button>
          </div>
        </div>
      )}

      {/* ERROR */}
      {status === "error" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-8 text-center text-white">
            <XCircle size={48} className="mx-auto mb-3 opacity-95" />
            <h2 className="text-xl font-bold">Absensi Gagal</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-4 py-3 mb-6">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={reset}
                className="border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={startScan}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl text-sm font-semibold shadow-md transition"
              >
                <RotateCcw size={16} />
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
