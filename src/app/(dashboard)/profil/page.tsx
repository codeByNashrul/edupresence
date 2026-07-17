"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Shield,
  Phone,
  Hash,
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  BadgeCheck,
  Calendar,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  id: string;
  nama: string;
  nip: string;
  noWa: string | null;
  role: string;
  aktif: boolean;
  createdAt: string;
}

// ─── Role label & color ───────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  ADMIN: {
    label: "Administrator",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
  PIMPINAN: {
    label: "Pimpinan",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
  },
  GURU: {
    label: "Guru",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  STAFF: {
    label: "Staff",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
};

// ─── Input style ──────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 placeholder:text-gray-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed";

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${
        type === "success"
          ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
          : "bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 size={16} />
      ) : (
        <AlertCircle size={16} />
      )}
      {message}
      <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Password Field ───────────────────────────────────────────────────────────
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls + " pr-10"}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilPage() {
  const { data: session, update: updateSession } = useSession();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit info state
  const [editMode, setEditMode] = useState(false);
  const [formInfo, setFormInfo] = useState({ nama: "", noWa: "" });
  const [savingInfo, setSavingInfo] = useState(false);

  // Password state
  const [formPass, setFormPass] = useState({
    passwordLama: "",
    passwordBaru: "",
    konfirmasi: "",
  });
  const [savingPass, setSavingPass] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ── Fetch profil ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        setProfile(data);
        setFormInfo({ nama: data.nama, noWa: data.noWa ?? "" });
      } catch {
        setToast({ type: "error", message: "Gagal memuat profil" });
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // ── Simpan info ───────────────────────────────────────────────────────────
  async function handleSaveInfo() {
    setSavingInfo(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formInfo),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", message: data.error ?? "Gagal menyimpan" });
        return;
      }
      setProfile((prev) => (prev ? { ...prev, ...data } : prev));
      setEditMode(false);
      // Update session agar nama di navbar ikut berubah
      await updateSession({ name: data.nama });
      setToast({ type: "success", message: "Profil berhasil diperbarui" });
    } catch {
      setToast({ type: "error", message: "Terjadi kesalahan" });
    } finally {
      setSavingInfo(false);
    }
  }

  // ── Ubah password ─────────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPass(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPass),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({
          type: "error",
          message: data.error ?? "Gagal mengubah password",
        });
        return;
      }
      setFormPass({ passwordLama: "", passwordBaru: "", konfirmasi: "" });
      setToast({ type: "success", message: "Password berhasil diubah" });
    } catch {
      setToast({ type: "error", message: "Terjadi kesalahan" });
    } finally {
      setSavingPass(false);
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    );
  }

  if (!profile) return null;

  const roleCfg = ROLE_CONFIG[profile.role] ?? ROLE_CONFIG.STAFF;
  const inisial = profile.nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Hero / Avatar ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-28 h-28 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-center gap-5">
          {/* Avatar inisial */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold tracking-tight">{inisial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold truncate">{profile.nama}</h1>
              {profile.aktif && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200">
                  <BadgeCheck size={11} /> Aktif
                </span>
              )}
            </div>
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${roleCfg.bg} ${roleCfg.color}`}
            >
              {roleCfg.label}
            </span>
            <p className="text-indigo-200 text-xs mt-2 flex items-center gap-1.5">
              <Calendar size={12} />
              Bergabung{" "}
              {new Date(profile.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Info Profil ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <User size={16} className="text-indigo-600" />
            Informasi Profil
          </h2>
          {!editMode ? (
            <button
              onClick={() => {
                setFormInfo({ nama: profile.nama, noWa: profile.noWa ?? "" });
                setEditMode(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
            >
              <Pencil size={12} /> Edit
            </button>
          ) : (
            <button
              onClick={() => setEditMode(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
            >
              <X size={12} /> Batal
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* NIP — read only */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Hash size={11} /> NIP
            </label>
            <input
              type="text"
              value={profile.nip}
              disabled
              className={inputCls}
            />
          </div>

          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User size={11} /> Nama Lengkap
            </label>
            <input
              type="text"
              value={editMode ? formInfo.nama : profile.nama}
              onChange={(e) =>
                setFormInfo({ ...formInfo, nama: e.target.value })
              }
              disabled={!editMode}
              className={inputCls}
              placeholder="Nama lengkap"
            />
          </div>

          {/* No WA */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone size={11} /> Nomor WhatsApp
            </label>
            <input
              type="text"
              value={editMode ? formInfo.noWa : (profile.noWa ?? "-")}
              onChange={(e) =>
                setFormInfo({ ...formInfo, noWa: e.target.value })
              }
              disabled={!editMode}
              className={inputCls}
              placeholder="628xxxxxxxxxx"
            />
            {editMode && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                Format: 628xxxxxxxxxx (tanpa + atau spasi)
              </p>
            )}
          </div>

          {/* Tombol simpan */}
          {editMode && (
            <button
              onClick={handleSaveInfo}
              disabled={savingInfo}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
            >
              {savingInfo ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Check size={15} /> Simpan Perubahan
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Ubah Password ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Lock size={16} className="text-indigo-600" />
            Ubah Password
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gunakan password yang kuat minimal 6 karakter
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="p-5 space-y-4">
          <PasswordField
            label="Password Lama"
            value={formPass.passwordLama}
            onChange={(v) => setFormPass({ ...formPass, passwordLama: v })}
            placeholder="Masukkan password saat ini"
          />
          <PasswordField
            label="Password Baru"
            value={formPass.passwordBaru}
            onChange={(v) => setFormPass({ ...formPass, passwordBaru: v })}
            placeholder="Minimal 6 karakter"
          />
          <PasswordField
            label="Konfirmasi Password Baru"
            value={formPass.konfirmasi}
            onChange={(v) => setFormPass({ ...formPass, konfirmasi: v })}
            placeholder="Ulangi password baru"
          />

          {/* Strength indicator */}
          {formPass.passwordBaru && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength = Math.min(
                    4,
                    Math.floor(formPass.passwordBaru.length / 3),
                  );
                  return (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= strength
                          ? strength <= 1
                            ? "bg-red-400"
                            : strength <= 2
                              ? "bg-amber-400"
                              : strength <= 3
                                ? "bg-blue-400"
                                : "bg-emerald-400"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400">
                {formPass.passwordBaru.length < 4
                  ? "Terlalu pendek"
                  : formPass.passwordBaru.length < 7
                    ? "Cukup"
                    : formPass.passwordBaru.length < 10
                      ? "Bagus"
                      : "Sangat kuat"}
              </p>
            </div>
          )}

          {/* Cocok / tidak */}
          {formPass.konfirmasi && (
            <p
              className={`text-xs font-medium flex items-center gap-1.5 ${
                formPass.passwordBaru === formPass.konfirmasi
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {formPass.passwordBaru === formPass.konfirmasi ? (
                <>
                  <CheckCircle2 size={13} /> Password cocok
                </>
              ) : (
                <>
                  <AlertCircle size={13} /> Password tidak cocok
                </>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={
              savingPass ||
              !formPass.passwordLama ||
              !formPass.passwordBaru ||
              !formPass.konfirmasi
            }
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
          >
            {savingPass ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Shield size={15} /> Ubah Password
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
