"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";

export default function GantiPasswordOrtuPage() {
  const [form, setForm] = useState({
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setPesan("");
    setError("");

    const res = await fetch("/api/ortu/ganti-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Gagal mengganti password");
      setLoading(false);
      return;
    }

    setPesan("Password berhasil diganti.");
    setForm({
      passwordLama: "",
      passwordBaru: "",
      konfirmasiPassword: "",
    });

    setLoading(false);
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Ganti Password
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ubah password akun orang tua.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <LockKeyhole size={22} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              Keamanan Akun
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gunakan password yang mudah diingat tapi tidak mudah ditebak.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={form.passwordLama}
            onChange={(e) =>
              setForm({
                ...form,
                passwordLama: e.target.value,
              })
            }
            placeholder="Password lama"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm"
            required
          />

          <input
            type="password"
            value={form.passwordBaru}
            onChange={(e) =>
              setForm({
                ...form,
                passwordBaru: e.target.value,
              })
            }
            placeholder="Password baru"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm"
            required
          />

          <input
            type="password"
            value={form.konfirmasiPassword}
            onChange={(e) =>
              setForm({
                ...form,
                konfirmasiPassword: e.target.value,
              })
            }
            placeholder="Konfirmasi password baru"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm"
            required
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {pesan && <p className="text-sm text-green-600">{pesan}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-sm font-semibold transition disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
