"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Status = "idle" | "scanning" | "success" | "error";

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
  }, [siapScan]);

  async function stopScan() {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {}

    setSiapScan(false);
    setStatus("idle");
  }

  async function kirimAbsensi(kodeQr: string) {
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
  }

  function reset() {
    setStatus("idle");
    setHasil(null);
    setError("");
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Scan Absensi Siswa
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Scan QR kartu siswa untuk mencatat kehadiran.
        </p>
      </div>

      {status === "idle" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Siap Scan QR Siswa
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Arahkan kamera ke QR Code pada kartu siswa.
          </p>

          <button
            onClick={startScan}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Mulai Scan
          </button>
        </div>
      )}

      {status === "scanning" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div id="qr-reader-siswa" className="w-full" />

          <div className="p-4">
            <button
              onClick={stopScan}
              className="w-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {status === "success" && hasil && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Absensi Siswa Berhasil
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {hasil.siswa.kelas}
          </p>

          <div className="space-y-3 text-left mb-6">
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 py-2">
              <span className="text-sm text-gray-500">Nama</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {hasil.siswa.nama}
              </span>
            </div>

            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 py-2">
              <span className="text-sm text-gray-500">NIS</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {hasil.siswa.nis}
              </span>
            </div>

            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 py-2">
              <span className="text-sm text-gray-500">Status</span>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-full ${
                  hasil.status === "HADIR"
                    ? "bg-green-50 text-green-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {hasil.status}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-500">Waktu</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {hasil.waktu}
              </span>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Scan Lagi
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-6xl mb-4">❌</div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Absensi Gagal
          </h2>

          <p className="text-sm text-red-500 mb-6">{error}</p>

          <button
            onClick={reset}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
}
