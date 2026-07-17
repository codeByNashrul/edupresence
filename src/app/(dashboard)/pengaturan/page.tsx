"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Timer,
  LogIn,
  LogOut,
} from "lucide-react";

interface Pengaturan {
  id: string;

  jamBerangkatMulai: string;
  jamBerangkatHadirSelesai: string;
  jamBerangkatSelesai: string;

  toleransiMengajarMenit: number;

  jamPulangMulai: string;
  jamPulangSelesai: string;

  templatePesanWa: string;
}

const inputCls =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";

const labelCls =
  "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";

function SectionCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <Icon size={18} className={iconColor} />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function PengaturanPage() {
  const [form, setForm] = useState<Pengaturan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [error, setError] = useState("");

  async function fetchPengaturan() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/pengaturan", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mengambil pengaturan");
        return;
      }

      setForm(data);
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPengaturan();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSukses(false);

    const res = await fetch("/api/pengaturan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan");
    } else {
      if (data.pengaturan) {
        setForm(data.pengaturan);
      }

      setSukses(true);
      setTimeout(() => setSukses(false), 3000);
    }

    setSaving(false);
  }

  if (loading || !form) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <Loader2
          size={32}
          className="mx-auto animate-spin text-indigo-400 mb-3"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Memuat pengaturan...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
            <Settings size={14} />
            Konfigurasi Sistem
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pengaturan Sistem
          </h1>
          <p className="text-indigo-100/90 text-sm mt-1.5">
            Konfigurasi sistem EduPresence
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kehadiran harian */}
        <SectionCard
          icon={LogIn}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
          title="Absensi Kehadiran"
          description="Atur waktu mulai, batas hadir, dan penutupan absensi"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Mulai Absensi</label>

              <input
                type="time"
                value={form.jamBerangkatMulai}
                onChange={(e) =>
                  setForm({
                    ...form,
                    jamBerangkatMulai: e.target.value,
                  })
                }
                className={inputCls}
                required
              />

              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Sebelum waktu ini, scan ditolak.
              </p>
            </div>

            <div>
              <label className={labelCls}>Batas Hadir</label>

              <input
                type="time"
                value={form.jamBerangkatHadirSelesai}
                onChange={(e) =>
                  setForm({
                    ...form,
                    jamBerangkatHadirSelesai: e.target.value,
                  })
                }
                className={inputCls}
                required
              />

              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Setelah waktu ini berstatus terlambat.
              </p>
            </div>

            <div>
              <label className={labelCls}>Batas Akhir</label>

              <input
                type="time"
                value={form.jamBerangkatSelesai}
                onChange={(e) =>
                  setForm({
                    ...form,
                    jamBerangkatSelesai: e.target.value,
                  })
                }
                className={inputCls}
                required
              />

              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Setelah waktu ini, scan ditolak.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
            Contoh: mulai 07.00, batas hadir 10.00, batas akhir 12.00. Scan
            pukul 07.00–10.00 tercatat hadir, sedangkan 10.01–12.00 tercatat
            terlambat.
          </div>
        </SectionCard>

        {/* Toleransi mengajar */}
        <SectionCard
          icon={Timer}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/50"
          title="Toleransi Jam Mengajar"
          description="Batas keterlambatan berdasarkan jam mulai jadwal guru"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-36">
              <input
                type="number"
                min={0}
                max={180}
                value={form.toleransiMengajarMenit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    toleransiMengajarMenit: Number(e.target.value),
                  })
                }
                className={`${inputCls} pr-14 text-center font-semibold`}
                required
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                menit
              </span>
            </div>

            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Guru masih berstatus hadir sampai batas toleransi setelah jadwal
              dimulai. Setelah itu statusnya otomatis terlambat.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
            Contoh: jadwal mulai pukul 11.00 dengan toleransi 30 menit. Scan
            sampai pukul 11.30 tercatat hadir. Mulai pukul 11.31 tercatat
            terlambat.
          </div>
        </SectionCard>

        {/* Jam Pulang */}
        <SectionCard
          icon={LogOut}
          iconColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-50 dark:bg-rose-950/50"
          title="Jam Absen Pulang"
          description="Rentang waktu scan absen keluar"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Mulai</label>
              <input
                type="time"
                value={form.jamPulangMulai}
                onChange={(e) =>
                  setForm({ ...form, jamPulangMulai: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Selesai</label>
              <input
                type="time"
                value={form.jamPulangSelesai}
                onChange={(e) =>
                  setForm({ ...form, jamPulangSelesai: e.target.value })
                }
                className={inputCls}
              />
            </div>
          </div>
        </SectionCard>

        {/* Template WA */}
        <SectionCard
          icon={MessageCircle}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-950/50"
          title="Template Pesan WhatsApp"
          description="Pesan otomatis yang dikirim ke guru"
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {["{nama}", "{mapel}", "{kelas}", "{jam}", "{tanggal}"].map((v) => (
              <span
                key={v}
                className="text-[11px] font-mono font-semibold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
              >
                {v}
              </span>
            ))}
          </div>
          <textarea
            rows={5}
            value={form.templatePesanWa}
            onChange={(e) =>
              setForm({ ...form, templatePesanWa: e.target.value })
            }
            className={`${inputCls} resize-none`}
          />
        </SectionCard>

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3.5 py-3">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        {sukses && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-3.5 py-3">
            <CheckCircle2
              size={15}
              className="text-emerald-500 shrink-0 mt-0.5"
            />
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Pengaturan berhasil disimpan!
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Settings size={15} />
              Simpan Pengaturan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
