"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import logo from "../../../../public/logo.png";

export default function LoginPage() {
  const router = useRouter();
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      nip,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("NIP atau password salah");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm w-full max-w-md">
      <div className="mb-8 text-center">
        <img
          src={logo.src}
          alt="Logo EduPresence"
          className="w-24 h-24 object-contain mx-auto mb-4"
        />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          EduPresence
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mt-1">
          School Management
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NIP
          </label>
          <input
            type="text"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Masukkan NIP"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Masukkan password"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
