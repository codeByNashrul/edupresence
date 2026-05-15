"use client";

import { Download, Pencil, Plus, QrCode, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
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
  kodeQr: string;
  kelas: Kelas;
}

export default function SiswaPage() {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const [selectedQr, setSelectedQr] = useState("");
  const [selectedNama, setSelectedNama] = useState("");

  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nama: "",
    nis: "",
    jenisKelamin: "",
    kelasId: "",
  });

  async function fetchData() {
    try {
      setLoading(true);

      const [siswaRes, kelasRes] = await Promise.all([
        fetch("/api/siswa"),
        fetch("/api/kelas"),
      ]);

      const siswaData = await siswaRes.json();
      const kelasData = await kelasRes.json();

      setSiswa(Array.isArray(siswaData) ? siswaData : []);
      setKelas(Array.isArray(kelasData) ? kelasData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();

    const res = await fetch("/api/siswa/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    if (!confirm("Yakin ingin menonaktifkan semua data siswa?")) return;
    if (!confirm("Tindakan ini akan menyembunyikan semua siswa aktif.")) return;

    await fetch("/api/siswa/delete-all", {
      method: "DELETE",
    });

    fetchData();
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openTambah() {
    setEditId(null);

    setForm({
      nama: "",
      nis: "",
      jenisKelamin: "",
      kelasId: "",
    });

    setShowForm(true);
  }

  function openEdit(data: Siswa) {
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

    const method = editId ? "PUT" : "POST";

    const url = editId ? `/api/siswa/${editId}` : "/api/siswa";

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setShowForm(false);

    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Nonaktifkan siswa ini?")) return;

    await fetch(`/api/siswa/${id}`, {
      method: "DELETE",
    });

    fetchData();
  }

  function openQr(data: Siswa) {
    setSelectedQr(data.kodeQr);
    setSelectedNama(data.nama);
    setShowQr(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Data Siswa
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manajemen siswa & QR absensi
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDeleteAll}
            disabled={siswa.length === 0}
            className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={16} />
            <span>Hapus Semua</span>
          </button>
          <label className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
            <span>
              <Upload size={16} />
            </span>
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCsv}
              className="hidden"
            />
          </label>
          <button
            onClick={exportSiswaCsv}
            disabled={siswa.length === 0}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openTambah}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : siswa.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Belum ada siswa</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">NIS</th>
                  <th className="px-4 py-3 text-left">JK</th>
                  <th className="px-4 py-3 text-left">Kelas</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {siswa.map((s) => (
                  <tr
                    key={s.id}
                    className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {s.nama}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          NIS: {s.nis}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {s.nis}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          s.jenisKelamin === "L"
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
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-200 text-red-600 hover:bg-red-100 text-xs font-semibold transition"
                        >
                          <Trash2 size={16} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              {editId ? "Edit Siswa" : "Tambah Siswa"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={form.nama}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nama: e.target.value,
                  })
                }
                placeholder="Nama siswa"
                className="w-full border rounded-lg px-3 py-2"
                required
              />

              <input
                value={form.nis}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nis: e.target.value,
                  })
                }
                placeholder="NIS"
                className="w-full border rounded-lg px-3 py-2"
                required
              />

              <select
                value={form.jenisKelamin}
                onChange={(e) =>
                  setForm({
                    ...form,
                    jenisKelamin: e.target.value,
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>

              <select
                value={form.kelasId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kelasId: e.target.value,
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
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
                  className="px-4 py-2 rounded-lg border"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR */}
      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
            <h2 className="text-xl font-bold mb-1">QR Siswa</h2>

            <p className="text-gray-500 text-sm mb-6">{selectedNama}</p>

            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCode value={selectedQr} size={220} />
            </div>

            <button
              onClick={() => setShowQr(false)}
              className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
