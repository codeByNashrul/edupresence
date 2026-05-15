"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

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

const statusColor: Record<string, string> = {
  HADIR: "text-green-600 bg-green-50",
  TERLAMBAT: "text-amber-600 bg-amber-50",
  TIDAK_HADIR: "text-red-600 bg-red-50",
  BELUM: "dark:text-gray-400  bg-gray-100",
};

export default function ScanPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [hasil, setHasil] = useState<HasilScan | null>(null);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [siapScan, setSiapScan] = useState(false);
  const [targets, setTargets] = useState<TargetAbsensi[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);

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
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch {}
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
              if (scanner.isScanning) {
                await scanner.stop();
              }
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-100 ">Scan Absensi</h1>
        <p className="dark:text-gray-400  text-sm mt-1">
          Arahkan kamera ke QR Code yang ada di ruangan
        </p>
      </div>

      {status === "idle" && (
        <div className="dark:bg-gray-800  rounded-xl border dark:border-gray-700  p-8 text-center">
          <div className="text-6xl mb-4">📷</div>
          <h2 className="text-lg font-semibold dark:text-gray-100  mb-2">
            Siap Scan QR
          </h2>
          <p className="dark:text-gray-400  text-sm mb-6">
            Pastikan Anda berada di ruangan yang sesuai dengan jadwal
          </p>
          <button
            onClick={startScan}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition w-full"
          >
            Mulai Scan
          </button>
        </div>
      )}

      {status === "scanning" && (
        <div className="dark:bg-gray-800  rounded-xl border dark:border-gray-700  overflow-hidden">
          <div id="qr-reader" className="w-full" />
          <div className="p-4">
            <button
              onClick={stopScan}
              className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:dark:bg-gray-900 "
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {status === "success" && hasil && (
        <div className="dark:bg-gray-800  rounded-xl border dark:border-gray-700  p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-lg font-semibold dark:text-gray-100  mb-1">
            Absensi Berhasil!
          </h2>
          <p className="dark:text-gray-400  text-sm mb-6">{hasil.ruangan}</p>

          <div className="space-y-3 text-left mb-6">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm dark:text-gray-400 ">Tipe</span>
              <span className="text-sm font-medium dark:text-gray-100 ">
                {tipeLabel[hasil.tipe] ?? hasil.tipe}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm dark:text-gray-400 ">Status</span>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-full ${
                  statusColor[hasil.status] ?? "dark:text-gray-400  bg-gray-100"
                }`}
              >
                {statusLabel[hasil.status] ?? hasil.status}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm dark:text-gray-400 ">Waktu</span>
              <span className="text-sm font-medium dark:text-gray-100 ">
                {hasil.waktu}
              </span>
            </div>
          </div>

          <button
            onClick={reset}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition w-full"
          >
            Selesai
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="dark:bg-gray-800  rounded-xl border dark:border-gray-700  p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-lg font-semibold dark:text-gray-100  mb-2">
            Absensi Gagal
          </h2>
          <p className="text-red-500 text-sm mb-6">{error}</p>
          <button
            onClick={reset}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition w-full"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="mt-6 dark:bg-gray-800  rounded-xl border dark:border-gray-700  overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold dark:text-gray-100 ">
            Daftar Absensi Hari Ini
          </h2>
          <p className="text-xs dark:text-gray-400  mt-1">
            Pantau scan yang sudah dan belum dilakukan
          </p>
        </div>

        <div className="divide-y dark:divide-gray-700 ">
          {targets.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">
              Belum ada target absensi hari ini
            </div>
          ) : (
            targets.map((item, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium dark:text-gray-100 ">
                      {item.label}
                    </p>
                    <p className="text-xs dark:text-gray-400  mt-1">
                      {item.detail}
                    </p>

                    {item.waktuScan && (
                      <p className="text-xs text-gray-400 mt-1">
                        Scan:{" "}
                        {new Date(item.waktuScan).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {item.ruangan ? ` • ${item.ruangan}` : ""}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                      statusColor[item.status] ??
                      "dark:text-gray-400  bg-gray-100"
                    }`}
                  >
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
