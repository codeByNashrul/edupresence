import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <WifiOff className="h-10 w-10" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Tidak Ada Koneksi
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          EduPresence tidak dapat terhubung ke server. Absensi belum tersimpan.
          Periksa jaringan internet, lalu coba kembali.
        </p>

        <a
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Coba Lagi
        </a>
      </div>
    </main>
  );
}
