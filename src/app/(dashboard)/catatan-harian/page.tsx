"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Check, CheckCircle } from "lucide-react";

interface CatatanHarian {
  id: string;
  tanggal: string;
  kegiatan: string;
  hasil: string;
  kendala: string | null;
  foto: string[];
}

export default function CatatanHarianPage() {
  const [catatan, setCatatan] = useState<CatatanHarian | null>(null);
  const [riwayat, setRiwayat] = useState<CatatanHarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    kegiatan: "",
    hasil: "",
    kendala: "",
    foto: [] as string[],
  });

  async function fetchCatatan() {
    setLoading(true);
    try {
      // Catatan hari ini
      const res = await fetch(`/api/catatan-harian?tanggal=${today}`);
      const data = await res.json();
      if (data.length > 0) {
        const c = data[0];
        setCatatan(c);
        setForm({
          kegiatan: c.kegiatan,
          hasil: c.hasil,
          kendala: c.kendala ?? "",
          foto: c.foto ?? [],
        });
      }

      // Riwayat 7 hari terakhir
      const riwayatRes = await fetch("/api/catatan-harian");
      const riwayatData = await riwayatRes.json();
      setRiwayat(riwayatData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCatatan();
  }, []);

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/catatan-harian/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Gagal upload foto");
        setUploading(false);
        return;
      }

      const data = await res.json();
      urls.push(data.url);
    }

    setForm((prev) => ({ ...prev, foto: [...prev.foto, ...urls] }));
    setUploading(false);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function hapusFoto(url: string) {
    setForm((prev) => ({
      ...prev,
      foto: prev.foto.filter((f) => f !== url),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSukses(false);

    const res = await fetch("/api/catatan-harian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan");
    } else {
      setSukses(true);
      setTimeout(() => setSukses(false), 3000);
      fetchCatatan();
    }

    setSaving(false);
  }

  const formatTanggal = (tgl: string) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Catatan Harian
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {formatTanggal(today)}
        </p>
      </div>

      {/* Form Catatan Hari Ini */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {catatan ? "Edit Catatan Hari Ini" : "Isi Catatan Hari Ini"}
        </h2>

        {loading ? (
          <div className="text-center text-gray-400 py-4">Memuat...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kegiatan <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form.kegiatan}
                onChange={(e) => setForm({ ...form, kegiatan: e.target.value })}
                placeholder="Apa saja kegiatan yang dilakukan hari ini?"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hasil <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form.hasil}
                onChange={(e) => setForm({ ...form, hasil: e.target.value })}
                placeholder="Apa hasil dari kegiatan hari ini?"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kendala{" "}
                <span className="text-gray-400 text-xs">(opsional)</span>
              </label>
              <textarea
                rows={2}
                value={form.kendala}
                onChange={(e) => setForm({ ...form, kendala: e.target.value })}
                placeholder="Adakah kendala yang dihadapi?"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Upload Foto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Foto Bukti{" "}
                <span className="text-gray-400 text-xs">(opsional)</span>
              </label>

              {/* Preview foto */}
              {form.foto.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {form.foto.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => hapusFoto(url)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleUploadFoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-4 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition disabled:opacity-50"
              >
                {uploading ? "Mengupload..." : "📷 Klik untuk upload foto"}
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Format: JPG, PNG, WebP. Maksimal 5MB per foto.
              </p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {sukses && (
              <p className="text-green-600 text-sm font-medium">
                Catatan berhasil disimpan!
              </p>
            )}

            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving
                ? "Menyimpan..."
                : catatan
                  ? "Update Catatan"
                  : "Simpan Catatan"}
            </button>
          </form>
        )}
      </div>

      {/* Riwayat Catatan */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Riwayat Catatan
        </h2>

        {riwayat.filter((r) => r.tanggal.split("T")[0] !== today).length ===
        0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400">
            Belum ada riwayat catatan
          </div>
        ) : (
          <div className="space-y-4">
            {riwayat
              .filter((r) => r.tanggal.split("T")[0] !== today)
              .map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
                >
                  <p className="text-xs font-medium text-indigo-600 mb-3">
                    {formatTanggal(r.tanggal)}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Kegiatan
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                        {r.kegiatan}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Hasil
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                        {r.hasil}
                      </p>
                    </div>
                    {r.kendala && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Kendala
                        </p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                          {r.kendala}
                        </p>
                      </div>
                    )}

                    {/* Foto */}
                    {r.foto && r.foto.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Foto
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {r.foto.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={url}
                                alt={`Foto ${i + 1}`}
                                className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
