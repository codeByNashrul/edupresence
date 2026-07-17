"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Loader2,
  CircleDashed,
  CheckCircle2,
  XCircle,
  ChevronDown,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  kelas: { nama: string };
}

interface UserOrtu {
  id: string;
  nama: string;
  nis: string;
  aktif: boolean;
  siswa: { nama: string; kelas: { nama: string } };
}

export default function OrtuPage() {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [ortu, setOrtu] = useState<UserOrtu[]>([]);
  const [nama, setNama] = useState("");
  const [siswaId, setSiswaId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    setLoadingData(true);
    const [siswaRes, ortuRes] = await Promise.all([
      fetch("/api/siswa"),
      fetch("/api/admin/ortu"),
    ]);
    const siswaData = await siswaRes.json();
    const ortuData = await ortuRes.json();
    setSiswa(Array.isArray(siswaData) ? siswaData : []);
    setOrtu(Array.isArray(ortuData) ? ortuData : []);
    setLoadingData(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!nama || !siswaId || !password) {
      setError("Lengkapi semua data terlebih dahulu");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/ortu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, siswaId, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Gagal membuat akun");
      setLoading(false);
      return;
    }

    setNama("");
    setSiswaId("");
    setPassword("");
    setSuccess("Akun orang tua berhasil dibuat");
    await fetchData();
    setLoading(false);
  }

  const inputCls =
    "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 placeholder:text-gray-400 transition-all";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
            <Users size={14} />
            Parent Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Akun Orang Tua</h1>
          <p className="text-indigo-100/90 text-sm mt-1.5">
            Kelola akun parent portal orang tua siswa
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Form buat akun */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Plus size={16} className="text-indigo-600" />
              Buat Akun Ortu
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Isi data untuk membuat akun baru
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Nama */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Nama Orang Tua
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap orang tua"
                className={inputCls}
              />
            </div>

            {/* Pilih siswa */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Pilih Siswa
              </label>
              <div className="relative">
                <select
                  value={siswaId}
                  onChange={(e) => setSiswaId(e.target.value)}
                  className={inputCls + " appearance-none pr-9 cursor-pointer"}
                >
                  <option value="">— Pilih siswa —</option>
                  {siswa.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} · {s.kelas.nama}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Password Awal
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password login orang tua"
                  className={inputCls + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3.5 py-3">
                <AlertCircle
                  size={15}
                  className="text-red-500 shrink-0 mt-0.5"
                />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-3.5 py-3">
                <CheckCircle2
                  size={15}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {success}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Plus size={16} /> Buat Akun
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tabel daftar akun */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                Daftar Akun Ortu
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {ortu.length} akun terdaftar
              </p>
            </div>
            {loadingData && (
              <Loader2 size={18} className="animate-spin text-indigo-500" />
            )}
          </div>

          {loadingData ? (
            <div className="p-12 text-center">
              <Loader2
                size={32}
                className="mx-auto animate-spin text-indigo-400 mb-3"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Memuat data...
              </p>
            </div>
          ) : ortu.length === 0 ? (
            <div className="p-12 text-center">
              <CircleDashed
                size={40}
                className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
              />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Belum ada akun orang tua
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Buat akun menggunakan form di samping
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    {["Nama Ortu", "Login NIS", "Siswa", "Kelas", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ortu.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                            <Users
                              size={14}
                              className="text-indigo-600 dark:text-indigo-400"
                            />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {o.nama}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                          {o.nis}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 font-medium">
                        {o.siswa.nama}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                          {o.siswa.kelas.nama}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                            o.aktif
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                          }`}
                        >
                          {o.aktif ? (
                            <>
                              <CheckCircle2 size={10} /> Aktif
                            </>
                          ) : (
                            <>
                              <XCircle size={10} /> Nonaktif
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
