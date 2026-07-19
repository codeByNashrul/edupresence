"use client";

import {
  AlertTriangle,
  Info,
  Download,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
  Upload,
  UserStar,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";

interface Kelas {
  id: string;
  nama: string;
}

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  jenisKelamin: string;
  kodeQr?: string;
  kelas: Kelas;
}

export default function SiswaPage() {
  const { data: session, status: sessionStatus } = useSession();

  const role = session?.user?.role ?? "";

  const canViewSiswa = ["ADMIN", "PIMPINAN", "GURU", "STAFF"].includes(role);

  const canManageSiswa = role === "ADMIN";
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [selectedQr, setSelectedQr] = useState("");
  const [selectedNama, setSelectedNama] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // Filter & Search
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterJK, setFilterJK] = useState("");

  const [form, setForm] = useState({
    nama: "",
    nis: "",
    jenisKelamin: "",
    kelasId: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [siswaRes, kelasRes] = await Promise.all([
        fetch("/api/siswa", {
          cache: "no-store",
        }),
        fetch("/api/kelas", {
          cache: "no-store",
        }),
      ]);

      const [siswaData, kelasData] = await Promise.all([
        siswaRes.json(),
        kelasRes.json(),
      ]);

      if (!siswaRes.ok) {
        throw new Error(
          siswaData.error ?? "Gagal mengambil data siswa",
        );
      }

      if (!kelasRes.ok) {
        throw new Error(
          kelasData.error ?? "Gagal mengambil data kelas",
        );
      }

      setSiswa(
        Array.isArray(siswaData)
          ? siswaData
          : [],
      );

      setKelas(
        Array.isArray(kelasData)
          ? kelasData
          : [],
      );
    } catch (error) {
      console.error("FETCH_SISWA_ERROR:", error);
      setSiswa([]);
      setKelas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      canViewSiswa
    ) {
      void fetchData();
      return;
    }

    if (
      sessionStatus === "unauthenticated" ||
      (
        sessionStatus === "authenticated" &&
        !canViewSiswa
      )
    ) {
      setLoading(false);
    }
  }, [
    sessionStatus,
    canViewSiswa,
    fetchData,
  ]);

  // Filter siswa
  const siswaFiltered = useMemo(() => {
    return siswa.filter((s) => {
      const matchSearch =
        search === "" ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search);

      const matchKelas = filterKelas === "" || s.kelas.id === filterKelas;
      const matchJK = filterJK === "" || s.jenisKelamin === filterJK;

      return matchSearch && matchKelas && matchJK;
    });
  }, [siswa, search, filterKelas, filterJK]);

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    if (!canManageSiswa) {
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await fetch("/api/siswa/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Gagal import CSV");
      return;
    }
    alert(`Import selesai.\nBerhasil: ${data.berhasil}\nGagal: ${data.gagal}`);
    fetchData();
    e.target.value = "";
  }

  async function handleDeleteAll() {
    if (!canManageSiswa) return;
    if (!confirm("Yakin ingin menonaktifkan semua data siswa?")) return;
    if (!confirm("Tindakan ini akan menyembunyikan semua siswa aktif.")) return;
    await fetch("/api/siswa/delete-all", { method: "DELETE" });
    fetchData();
  }

  function openTambah() {
    if (!canManageSiswa) return;
    setEditId(null);
    setForm({ nama: "", nis: "", jenisKelamin: "", kelasId: "" });
    setShowForm(true);
  }

  function openEdit(data: Siswa) {
    if (!canManageSiswa) return;
    setEditId(data.id);
    setForm({
      nama: data.nama,
      nis: data.nis,
      jenisKelamin: data.jenisKelamin,
      kelasId: data.kelas.id,
    });
    setShowForm(true);
  }

  function exportSiswaCsv() {
    if (!canManageSiswa) return;
    if (siswa.length === 0) return;
    const headers = ["Nama", "NIS", "Jenis Kelamin", "Kelas", "Kode QR"];
    const rows = siswa.map((s) => [
      s.nama,
      s.nis,
      s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan",
      s.kelas.nama,
      s.kodeQr,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "data-siswa.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageSiswa) {
      return
    };
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/siswa/${editId}` : "/api/siswa";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!canManageSiswa) return;
    if (!confirm("Nonaktifkan siswa ini?")) return;
    await fetch(`/api/siswa/${id}`, { method: "DELETE" });
    fetchData();
  }

  function openQr(data: Siswa) {
    if (!canManageSiswa || !data.kodeQr) {
      return;
    }

    setSelectedQr(data.kodeQr);
    setSelectedNama(data.nama);
    setShowQr(true);
  }

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-80 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  if (
    sessionStatus === "unauthenticated" ||
    !canViewSiswa
  ) {
    return (
      <div className="max-w-lg mx-auto rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
        <AlertTriangle
          size={40}
          className="mx-auto mb-3 text-red-500"
        />

        <h1 className="text-lg font-bold text-red-700 dark:text-red-300">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Anda tidak memiliki akses ke data siswa.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-pink-700 to-indigo-700 p-6 text-white shadow-lg shadow-rose-500/20">
        {/* Dekorasi background */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            {/* Judul */}
            <div>
              <span className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                <UserStar size={14} className="mr-1" />
                Data Kesiswaan
              </span>

              <h1 className="text-2xl font-bold tracking-tight text-white">
                {canManageSiswa
                  ? "Manajemen Siswa"
                  : "Data Siswa"}
              </h1>

              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-rose-100">
                {canManageSiswa
                  ? "Kelola data siswa aktif dan QR absensi."
                  : "Lihat daftar siswa aktif di sekolah."}
              </p>
            </div>

            {/* Tombol admin */}
            {canManageSiswa && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={siswa.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-red-300/50 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-100 backdrop-blur-sm transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Hapus Semua
                </button>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20">
                  <Upload size={16} />
                  Import CSV

                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCsv}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={exportSiswaCsv}
                  disabled={siswa.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={openTambah}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-md transition hover:bg-rose-50"
                >
                  <Plus size={16} />
                  Tambah Siswa
                </button>
              </div>
            )}
          </div>

          {/* Mode lihat saja */}
          {!canManageSiswa && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-sm">
              <Info
                size={18}
                className="mt-0.5 shrink-0 text-rose-100"
              />

              <div>
                <p className="font-semibold">
                  Mode lihat saja
                </p>

                <p className="mt-0.5 text-xs leading-relaxed text-rose-100">
                  Data siswa hanya dapat ditambah, diubah,
                  dinonaktifkan, atau dikelola QR-nya oleh admin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 flex gap-3 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIS..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Kelas */}
        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Kelas</option>
          {kelas.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>

        {/* Filter Jenis Kelamin */}
        <select
          value={filterJK}
          onChange={(e) => setFilterJK(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua JK</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>

        {/* Info hasil filter */}
        <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {siswaFiltered.length} dari {siswa.length} siswa
        </p>

        {/* Reset filter */}
        {(search || filterKelas || filterJK) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterKelas("");
              setFilterJK("");
            }}
            className="text-sm text-red-500 hover:text-red-600 font-medium whitespace-nowrap"
          >
            Reset filter
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : siswaFiltered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {siswa.length === 0
              ? "Belum ada siswa"
              : "Tidak ada siswa yang sesuai filter"}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">
                    NIS
                  </th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">
                    JK
                  </th>
                  <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">
                    Kelas
                  </th>
                  {canManageSiswa && (
                    <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {siswaFiltered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {s.nama}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        NIS: {s.nis}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {s.nis}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${s.jenisKelamin === "L"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-pink-50 text-pink-600"
                          }`}
                      >
                        {s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                        {s.kelas.nama}
                      </span>
                    </td>
                    {canManageSiswa && (
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openQr(s)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition"
                          >
                            <QrCode size={16} />
                            <span>QR</span>
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs font-semibold transition"
                          >
                            <Pencil size={16} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition"
                          >
                            <Trash2 size={16} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM */}
      {canManageSiswa && showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {editId ? "Edit Siswa" : "Tambah Siswa"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama siswa"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                value={form.nis}
                onChange={(e) => setForm({ ...form, nis: e.target.value })}
                placeholder="NIS"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                required
              />
              <select
                value={form.jenisKelamin}
                onChange={(e) =>
                  setForm({ ...form, jenisKelamin: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
              <select
                value={form.kelasId}
                onChange={(e) => setForm({ ...form, kelasId: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Pilih kelas</option>
                {kelas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR */}
      {canManageSiswa && showQr && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
            <h2 className="text-xl font-bold mb-1">QR Siswa</h2>
            <p className="text-gray-500 text-sm mb-6">{selectedNama}</p>
            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCode value={selectedQr} size={220} />
            </div>
            <button
              onClick={() => setShowQr(false)}
              className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
