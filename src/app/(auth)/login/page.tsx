"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/shared/ThemeToggle";
import Image from "next/image";
import {
  LogIn,
  User,
  Lock,
  AlertCircle,
  Loader2,
  GraduationCap,
  Shield,
  ScanLine,
  Users,
} from "lucide-react";

const mobileFeatures = [
  { icon: ScanLine, label: "Scan QR" },
  { icon: Shield, label: "Aman" },
  { icon: GraduationCap, label: "Laporan" },
] as const;

type LoginMode = "staff" | "ortu";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("staff");
  const [identifier, setIdentifier] = useState(""); // NIP atau NIS
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset form saat ganti mode
  function switchMode(m: LoginMode) {
    setMode(m);
    setIdentifier("");
    setPassword("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const credentials =
      mode === "ortu"
        ? { nis: identifier, password }
        : { nip: identifier, password };

    const res = await signIn("credentials", {
      ...credentials,
      redirect: false as const,
    });

    if (res?.error) {
      setError(
        mode === "ortu" ? "NIS atau password salah" : "NIP atau password salah",
      );
      setLoading(false);
      return;
    }

    router.push(mode === "ortu" ? "/ortu/dashboard" : "/dashboard");
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 pl-11 pr-4 py-3.5 text-base sm:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

  const isOrtu = mode === "ortu";

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Bar atas — mobile & tablet kecil */}
      <div className="lg:hidden flex items-center justify-between gap-3 mb-4 px-0.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/95 dark:bg-white/10 p-1.5 shadow-md ring-1 ring-white/30">
            <Image
              src="/icons/icon-192x192.png"
              alt="Logo EduPresence"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">EduPresence</p>
            <p className="text-[11px] text-indigo-200/90 truncate">
              SMP POMOSDA
            </p>
          </div>
        </div>
        <div className="shrink-0 p-1 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm">
          <ThemeToggle variant="header" />
        </div>
      </div>

      {/* Theme toggle — desktop */}
      <div className="hidden lg:block absolute top-0 right-0 z-10">
        <div className="p-1 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm">
          <ThemeToggle variant="header" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl lg:shadow-indigo-900/25 lg:border lg:border-white/25 dark:lg:border-gray-700/50">
        {/* Panel branding — desktop */}
        <div className="hidden lg:flex flex-col justify-between p-10 text-white relative overflow-hidden min-h-[32rem]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:20px_20px]" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-8">
                <GraduationCap size={14} />
                SMP POMOSDA
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                School Management System
              </h1>
              <p className="mt-4 text-indigo-100/90 text-lg leading-relaxed max-w-md">
                Sistem informasi sekolah yang membantu mengelola data siswa,
                guru, dan staff dengan mudah dan efisien.
              </p>
            </div>
            <ul className="space-y-4 mt-10">
              {[
                {
                  icon: ScanLine,
                  title: "Scan QR cepat",
                  desc: "Absensi berangkat, mengajar, dan pulang",
                },
                {
                  icon: Shield,
                  title: "Aman & terpusat",
                  desc: "Data tersimpan rapi per peran pengguna",
                },
                {
                  icon: GraduationCap,
                  title: "Laporan lengkap",
                  desc: "Pantau kehadiran harian secara real-time",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="shrink-0 p-2 rounded-xl bg-white/15 border border-white/20">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-indigo-200/80 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-indigo-900/15 dark:shadow-black/30 border border-white/60 dark:border-gray-800 lg:rounded-none lg:shadow-none lg:border-0 lg:bg-white/95 lg:dark:bg-gray-900/95 lg:backdrop-blur-xl">
          <div className="p-5 sm:p-8 lg:p-10">
            {/* Header form */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="hidden lg:inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 p-3 shadow-inner ring-2 ring-indigo-100 dark:ring-indigo-900 mb-5">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="Logo EduPresence"
                  width={80}
                  height={80}
                  className="h-full w-full object-contain"
                />
              </div>
              <h2 className="hidden lg:block text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                EduPresence
              </h2>
              <h2 className="lg:hidden text-lg font-bold text-gray-900 dark:text-gray-100">
                Masuk ke akun
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span className="lg:hidden">
                  {isOrtu
                    ? "Gunakan NIS anak dan password Anda"
                    : "Gunakan NIP dan password Anda"}
                </span>
                <span className="hidden lg:inline">
                  SMP POMOSDA · School Management System
                </span>
              </p>

              {/* Fitur ringkas — mobile */}
              <div className="lg:hidden flex justify-center gap-2 mt-4 flex-wrap">
                {mobileFeatures.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-100 dark:border-indigo-900/50"
                  >
                    <Icon size={14} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Toggle Mode Login ── */}
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 mb-5 sm:mb-6 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={() => switchMode("staff")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  !isOrtu
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Shield size={15} />
                Guru / Staff
              </button>
              <button
                type="button"
                onClick={() => switchMode("ortu")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  isOrtu
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Users size={15} />
                Orang Tua
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  {isOrtu ? "NIS Anak" : "NIP"}
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={inputClass}
                    placeholder={isOrtu ? "Masukkan NIS anak" : "Masukkan NIP"}
                    autoComplete="username"
                    required
                  />
                </div>
                {isOrtu && (
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    NIS anak tercantum di kartu pelajar atau buku raport
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                {isOrtu && (
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Password diberikan oleh admin sekolah
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3.5 py-3 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white py-3.5 sm:py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all touch-manipulation"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Masuk
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-6 sm:mt-8">
              © EduPresence · SMP POMOSDA · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
