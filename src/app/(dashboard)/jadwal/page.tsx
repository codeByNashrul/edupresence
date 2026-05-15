"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const HARI_LIST = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

interface Jadwal {
  id: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  guru: {
    id: string;
    user: {
      nama: string;
      noWa: string | null;
    };
  };
  kelas: { id: string; nama: string };
  mataPelajaran: { id: string; nama: string };
  ruangan: { id: string; nama: string };
  absensiHariIni?: {
    status: string;
    waktuScan: string;
  } | null;
}

interface Guru {
  id: string;
  nama: string;
  guru: { id: string };
}

interface Kelas {
  id: string;
  nama: string;
}

interface Mapel {
  id: string;
  nama: string;
  kode: string;
}

interface Ruangan {
  id: string;
  nama: string;
}

export default function JadwalPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [guru, setGuru] = useState<Guru[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [mapel, setMapel] = useState<Mapel[]>([]);
  const [ruangan, setRuangan] = useState<Ruangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Jadwal | null>(null);
  const [hariAktif, setHariAktif] = useState("SENIN");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    guruId: "",
    kelasId: "",
    mataPelajaranId: "",
    ruanganId: "",
    hari: "SENIN",
    jamMulai: "",
    jamSelesai: "",
  });

  async function fetchAll() {
    setLoading(true);

    const jadwalRes = await fetch("/api/jadwal");
    const jadwalData = await jadwalRes.json();
    setJadwal(Array.isArray(jadwalData) ? jadwalData : []);

    if (isAdmin) {
      const [g, k, m, r] = await Promise.all([
        fetch("/api/guru").then((res) => res.json()),
        fetch("/api/kelas").then((res) => res.json()),
        fetch("/api/mata-pelajaran").then((res) => res.json()),
        fetch("/api/ruangan").then((res) => res.json()),
      ]);

      setGuru(Array.isArray(g) ? g : []);
      setKelas(Array.isArray(k) ? k : []);
      setMapel(Array.isArray(m) ? m : []);
      setRuangan(Array.isArray(r) ? r : []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, [isAdmin]);

  function openTambah() {
    if (!isAdmin) return;

    setEditData(null);
    setForm({
      guruId: "",
      kelasId: "",
      mataPelajaranId: "",
      ruanganId: "",
      hari: hariAktif,
      jamMulai: "",
      jamSelesai: "",
    });
    setError("");
    setShowForm(true);
  }

  function openEdit(j: Jadwal) {
    if (!isAdmin) return;

    setEditData(j);
    setForm({
      guruId: j.guru.id,
      kelasId: j.kelas.id,
      mataPelajaranId: j.mataPelajaran.id,
      ruanganId: j.ruangan.id,
      hari: j.hari,
      jamMulai: j.jamMulai,
      jamSelesai: j.jamSelesai,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setError("");

    const method = editData ? "PUT" : "POST";
    const url = editData ? `/api/jadwal/${editData.id}` : "/api/jadwal";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan");
      return;
    }

    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm("Yakin ingin menghapus jadwal ini?")) return;

    await fetch(`/api/jadwal/${id}`, { method: "DELETE" });
    fetchAll();
  }

  const jadwalHariIni = jadwal.filter((j) => j.hari === hariAktif);

  const jadwalPerKelas = jadwalHariIni.reduce(
    (acc, item) => {
      const namaKelas = item.kelas.nama;

      if (!acc[namaKelas]) {
        acc[namaKelas] = [];
      }

      acc[namaKelas].push(item);
      return acc;
    },
    {} as Record<string, Jadwal[]>,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isAdmin ? "Jadwal Pelajaran" : "Jadwal Mata Pelajaran"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {isAdmin ? "Jadwal tetap per semester" : "Daftar jadwal mengajar"}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openTambah}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Tambah Jadwal
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {HARI_LIST.map((hari) => (
          <button
            key={hari}
            onClick={() => setHariAktif(hari)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              hariAktif === hari
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {hari}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {Object.keys(jadwalPerKelas).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
            Belum ada jadwal untuk hari {hariAktif}
          </div>
        ) : (
          Object.entries(jadwalPerKelas)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([kelasNama, items]) => (
              <div
                key={kelasNama}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">
                    Kelas {kelasNama}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {items.length} jadwal pelajaran
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 dark:border-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                          Jam
                        </th>

                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                          Mata Pelajaran
                        </th>

                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                          Guru
                        </th>

                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                          Ruangan
                        </th>

                        {isAdmin && (
                          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                            Status
                          </th>
                        )}

                        {isAdmin && (
                          <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {items
                        .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai))
                        .map((j) => (
                          <tr
                            key={j.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                              {j.jamMulai} – {j.jamSelesai}
                            </td>

                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {j.mataPelajaran.nama}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              {j.guru.user.nama}
                            </td>

                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              {j.ruangan.nama}
                            </td>

                            {isAdmin && (
                              <td className="px-4 py-3">
                                {j.absensiHariIni ? (
                                  <div>
                                    <span
                                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        j.absensiHariIni.status === "HADIR"
                                          ? "bg-green-50 text-green-600"
                                          : "bg-amber-50 text-amber-600"
                                      }`}
                                    >
                                      {j.absensiHariIni.status}
                                    </span>

                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(
                                        j.absensiHariIni.waktuScan,
                                      ).toLocaleTimeString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                ) : j.guru.user.noWa ? (
                                  <a
                                    href={`https://wa.me/${j.guru.user.noWa}?text=${encodeURIComponent(
                                      `Assalamu'alaikum ${j.guru.user.nama}, mohon segera melakukan scan absensi untuk jadwal ${j.mataPelajaran.nama} kelas ${j.kelas.nama} pukul ${j.jamMulai}–${j.jamSelesai}. Terima kasih.`,
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                                  >
                                    WA Guru
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    No WA kosong
                                  </span>
                                )}
                              </td>
                            )}

                            {isAdmin && (
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openEdit(j)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    onClick={() => handleDelete(j.id)}
                                    className="text-red-500 hover:text-red-600 font-medium"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
        )}
      </div>

      {isAdmin && showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editData ? "Edit Jadwal" : "Tambah Jadwal"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hari
                </label>
                <select
                  value={form.hari}
                  onChange={(e) => setForm({ ...form, hari: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {HARI_LIST.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={form.jamMulai}
                    onChange={(e) =>
                      setForm({ ...form, jamMulai: e.target.value })
                    }
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={form.jamSelesai}
                    onChange={(e) =>
                      setForm({ ...form, jamSelesai: e.target.value })
                    }
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guru
                </label>
                <select
                  value={form.guruId}
                  onChange={(e) => setForm({ ...form, guruId: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih guru</option>
                  {guru.map((g) => (
                    <option key={g.id} value={g.guru?.id}>
                      {g.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={form.mataPelajaranId}
                  onChange={(e) =>
                    setForm({ ...form, mataPelajaranId: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih mata pelajaran</option>
                  {mapel.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kelas
                </label>
                <select
                  value={form.kelasId}
                  onChange={(e) =>
                    setForm({ ...form, kelasId: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih kelas</option>
                  {kelas.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ruangan
                </label>
                <select
                  value={form.ruanganId}
                  onChange={(e) =>
                    setForm({ ...form, ruanganId: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih ruangan</option>
                  {ruangan.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  {editData ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
