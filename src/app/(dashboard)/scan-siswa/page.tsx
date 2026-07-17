"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, XCircle, Camera, Loader } from "lucide-react";

type Status = "idle" | "scanning" | "success" | "error" | "processing";

interface HasilScanSiswa {
  status: string;
  waktu: string;
  siswa: {
    nama: string;
    nis: string;
    jenisKelamin: string;
    kelas: string;
  };
}

export default function ScanSiswaPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [hasil, setHasil] = useState<HasilScanSiswa | null>(null);
  const [error, setError] = useState("");
  const [siapScan, setSiapScan] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const kirimAbsensi = useCallback(async (kodeQr: string) => {
    setStatus("processing");
    try {
      const res = await fetch("/api/absensi-siswa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kodeQr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Absensi siswa gagal");
        return;
      }

      setHasil(data);
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Gagal mengirim absensi siswa");
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch {}
    };
  }, []);

  function startScan() {
    setStatus("scanning");
    setError("");
    setHasil(null);
    setSiapScan(true);
  }

  useEffect(() => {
    if (!siapScan) return;

    async function initScanner() {
      try {
        const scanner = new Html5Qrcode("qr-reader-siswa");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            try {
              if (scanner.isScanning) {
                await scanner.stop();
              }
            } catch {}

            setSiapScan(false);
            await kirimAbsensi(decodedText);
          },
          () => {},
        );
      } catch (err: any) {
        setStatus("error");
        setError(`Error: ${err?.message ?? err}`);
        setSiapScan(false);
      }
    }

    initScanner();
  }, [siapScan, kirimAbsensi]);

  async function stopScan() {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {}

    setSiapScan(false);
    setStatus("idle");
  }

  function reset() {
    setStatus("idle");
    setHasil(null);
    setError("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
            Scan Absensi Siswa
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Scan QR Code untuk mencatat kehadiran siswa
          </p>
        </div>

        {/* Idle State */}
        {status === "idle" && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden backdrop-blur-xl">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 sm:p-12 text-center">
                <div className="text-6xl sm:text-7xl mb-4">📚</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Siap Untuk Scan
                </h2>
                <p className="text-blue-100 text-sm sm:text-base">
                  Pastikan kamera bebas dan tidak ada gangguan cahaya
                </p>
              </div>

              <div className="p-8 sm:p-10">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <div className="text-2xl mb-2">📱</div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Posisi Kartu
                    </p>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                    <div className="text-2xl mb-2">💡</div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Cahaya Cukup
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                    <div className="text-2xl mb-2">✨</div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      QR Jelas
                    </p>
                  </div>
                </div>

                <button
                  onClick={startScan}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Mulai Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanning State */}
        {status === "scanning" && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden backdrop-blur-xl">
              <div className="relative bg-black rounded-t-3xl">
                <div id="qr-reader-siswa" className="w-full" />
                <div className="absolute inset-0 pointer-events-none rounded-t-3xl border-2 border-green-400/30 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-72 h-72 border-2 border-green-400 rounded-lg opacity-50 animate-pulse"></div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span className="font-medium text-sm">Menunggu scan...</span>
                </div>
                <button
                  onClick={stopScan}
                  className="w-full border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 py-3 rounded-xl text-sm font-semibold transition-colors duration-300"
                >
                  Batal Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {status === "processing" && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-12 text-center backdrop-blur-xl">
              <div className="flex justify-center mb-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-2 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <Loader className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Memproses Data...
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Silakan tunggu beberapa saat
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === "success" && hasil && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden backdrop-blur-xl">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 sm:p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 rounded-full p-3 backdrop-blur">
                    <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Absensi Berhasil
                </h2>
                <p className="text-emerald-100 font-medium">
                  {hasil.siswa.kelas}
                </p>
              </div>

              <div className="p-8 sm:p-10">
                {/* Student Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 mb-6 border border-green-200 dark:border-green-700/30">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nama Siswa
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {hasil.siswa.nama}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          NIS
                        </p>
                        <p className="text-base font-mono font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {hasil.siswa.nis}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </p>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              hasil.status === "HADIR"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : hasil.status === "TERLAMBAT"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            }`}
                          >
                            {hasil.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-green-200 dark:border-green-700/30">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Waktu Scan
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {hasil.waktu}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={reset}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Scan Siswa Berikutnya
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden backdrop-blur-xl">
              <div className="bg-gradient-to-r from-red-500 to-rose-600 p-8 sm:p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 rounded-full p-3 backdrop-blur">
                    <XCircle className="w-12 h-12 text-white animate-pulse" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Absensi Gagal
                </h2>
                <p className="text-red-100">
                  Terjadi kesalahan saat memproses absensi
                </p>
              </div>

              <div className="p-8 sm:p-10">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 mb-6 border border-red-200 dark:border-red-700/30">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {error}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={reset}
                    className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 py-3 rounded-xl text-sm font-semibold transition-colors duration-300"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={startScan}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <p>
            Pastikan Anda memiliki izin untuk scan absensi siswa sebelum melanjutkan
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
