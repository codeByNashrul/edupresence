"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
  pembuat?: {
    nama: string;
  };
}

export default function PengumumanOrtuPage() {
  const [data, setData] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);

      const res = await fetch("/api/ortu/pengumuman");
      const json = await res.json();

      setData(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pengumuman
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Informasi resmi dari sekolah.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">
          Memuat pengumuman...
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
          Belum ada pengumuman.
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Megaphone size={22} />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">
                    {item.judul}
                  </h2>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line">
                    {item.isi}
                  </p>

                  <p className="text-xs text-gray-400 mt-4">
                    {item.pembuat?.nama ?? "Admin"} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
