"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Edit3,
  History,
  ImagePlus,
  Sparkles,
  Users,
  X,
} from "lucide-react";

interface CatatanHarian {
  id: string;
  tanggal: string;
  kegiatan: string;
  hasil: string;
  kendala: string | null;
  foto: string[];
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    nama: string;
    nip: string;
  };
}

function jakartaDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export default function CatatanHarianPage() {
  const [catatan, setCatatan] = useState<CatatanHarian | null>(null);
  const [riwayat, setRiwayat] = useState<CatatanHarian[]>([]);
  const [aktivitasStaff, setAktivitasStaff] = useState<CatatanHarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = jakartaDateKey();

  const [form, setForm] = useState({
    kegiatan: "",
    hasil: "",
    kendala: "",
    foto: [] as string[],
  });

  async function fetchCatatan() {
    setLoading(true);
    setError("");

    try {
      const [res, riwayatRes, aktivitasRes] = await Promise.all([
        fetch(`/api/catatan-harian?scope=mine&tanggal=${today}`),
        fetch("/api/catatan-harian?scope=mine"),
        fetch("/api/catatan-harian?scope=team"),
      ]);

      if (!res.ok || !riwayatRes.ok || !aktivitasRes.ok) {
        throw new Error("Gagal memuat catatan harian");
      }

      const [data, riwayatData, aktivitasData] = await Promise.all([
        res.json(),
        riwayatRes.json(),
        aktivitasRes.json(),
      ]);

      const catatanHariIni = Array.isArray(data) ? data : [];

      if (catatanHariIni.length > 0) {
        const c = catatanHariIni[0] as CatatanHarian;
        setCatatan(c);
        setForm({
          kegiatan: c.kegiatan,
          hasil: c.hasil,
          kendala: c.kendala ?? "",
          foto: c.foto ?? [],
        });
        setFormOpen(false);
      } else {
        setCatatan(null);
        setForm({ kegiatan: "", hasil: "", kendala: "", foto: [] });
        setFormOpen(true);
      }

      setRiwayat(Array.isArray(riwayatData) ? riwayatData : []);
      setAktivitasStaff(Array.isArray(aktivitasData) ? aktivitasData : []);
    } catch (err) {
      console.error(err);
      setError("Catatan harian belum dapat dimuat. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCatatan();
    }, 0);

    return () => window.clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    const urls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/catatan-harian/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error ?? "Gagal upload foto");
        }

        urls.push(data.url);
      }

      setForm((prev) => ({ ...prev, foto: [...prev.foto, ...urls] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload foto");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function hapusFoto(url: string) {
    setForm((prev) => ({
      ...prev,
      foto: prev.foto.filter((foto) => foto !== url),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSukses(false);

    try {
      const res = await fetch("/api/catatan-harian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Terjadi kesalahan");
      }

      setSukses(true);
      await fetchCatatan();
      window.setTimeout(() => setSukses(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  const formatTanggal = (tgl: string) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTanggalPendek = (tgl: string) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const riwayatSebelumnya = riwayat.filter(
    (item) => item.tanggal.split("T")[0] !== today,
  );

  const jumlahFotoHariIni = catatan?.foto?.length ?? form.foto.length;

  return (
    <div
      className="mx-auto max-w-4xl space-y-5 pb-24 lg:pb-3"
      data-ui="CATATAN_HARIAN_R2_1_POLISH"
    >
      {/* Header halaman compact */}
      <section className="px-1 pt-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
              <ClipboardCheck size={18} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                Jurnal Aktivitas Staff
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
              Catatan Harian
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <CalendarDays size={15} aria-hidden="true" />
              {formatTanggal(`${today}T12:00:00+07:00`)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                catatan
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900"
              }`}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              {catatan ? "Sudah mengisi hari ini" : "Belum mengisi hari ini"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <Camera size={14} aria-hidden="true" />
              {jumlahFotoHariIni} foto
            </span>
          </div>
        </div>
      </section>

      {sukses && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 size={18} aria-hidden="true" />
          Catatan hari ini berhasil disimpan.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle
            className="mt-0.5 shrink-0"
            size={18}
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

      {/* Catatan pribadi hari ini */}
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                <ClipboardCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  Catatan Saya Hari Ini
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Satu jurnal aktivitas untuk setiap hari kerja
                </p>
              </div>
            </div>
          </div>

          {!loading && (
            <button
              type="button"
              onClick={() => setFormOpen((open) => !open)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              {catatan ? <Edit3 size={15} /> : <Sparkles size={15} />}
              {formOpen ? "Tutup" : catatan ? "Edit" : "Isi Catatan"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 p-5 sm:p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700" />
            <div className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700" />
          </div>
        ) : !formOpen && catatan ? (
          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <JournalBlock label="Kegiatan" value={catatan.kegiatan} />
              <JournalBlock label="Hasil" value={catatan.hasil} accent />
            </div>

            {catatan.kendala?.trim() && catatan.kendala.trim() !== "-" ? (
              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Kendala
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-gray-700 dark:text-gray-200">
                      {catatan.kendala}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                <CheckCircle2
                  size={14}
                  className="shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  Kendala
                </span>
                <span>— Tidak ada kendala</span>
              </div>
            )}

            {catatan.foto.length > 0 && (
              <div className="mt-5">
                <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <Camera size={14} aria-hidden="true" />
                  Dokumentasi ({catatan.foto.length})
                </p>
                <PhotoGrid photos={catatan.foto} />
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            <FieldTextarea
              label="Kegiatan"
              required
              rows={3}
              value={form.kegiatan}
              onChange={(value) => setForm({ ...form, kegiatan: value })}
              placeholder="Tuliskan kegiatan utama yang dilakukan hari ini..."
            />

            <FieldTextarea
              label="Hasil"
              required
              rows={3}
              value={form.hasil}
              onChange={(value) => setForm({ ...form, hasil: value })}
              placeholder="Tuliskan hasil atau progres yang dicapai..."
            />

            <FieldTextarea
              label="Kendala"
              optional
              rows={2}
              value={form.kendala}
              onChange={(value) => setForm({ ...form, kendala: value })}
              placeholder="Tuliskan kendala jika ada..."
            />

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Dokumentasi{" "}
                  <span className="font-normal text-gray-400">(opsional)</span>
                </label>
                {form.foto.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {form.foto.length} foto
                  </span>
                )}
              </div>

              {form.foto.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {form.foto.map((url, index) => (
                    <div
                      key={url}
                      className="group relative overflow-hidden rounded-xl"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Dokumentasi ${index + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => hapusFoto(url)}
                        aria-label={`Hapus dokumentasi ${index + 1}`}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm transition hover:bg-red-600"
                      >
                        <X size={14} aria-hidden="true" />
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-medium text-gray-500 transition hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-600 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
              >
                <ImagePlus size={19} aria-hidden="true" />
                {uploading ? "Mengupload foto..." : "Tambah foto dokumentasi"}
              </button>
              <p className="mt-2 text-xs text-gray-400">
                JPG, PNG, atau WebP. Maksimal 5MB per foto.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-gray-700 sm:flex-row sm:justify-end">
              {catatan && (
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      kegiatan: catatan.kegiatan,
                      hasil: catatan.hasil,
                      kendala: catatan.kendala ?? "",
                      foto: catatan.foto ?? [],
                    });
                    setFormOpen(false);
                    setError("");
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={17} aria-hidden="true" />
                {saving
                  ? "Menyimpan..."
                  : catatan
                    ? "Simpan Perubahan"
                    : "Simpan Catatan"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Aktivitas tim hari ini */}
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setTeamOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/40 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
              <Users size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Aktivitas Staff Hari Ini
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {aktivitasStaff.length} staff sudah memiliki catatan
              </p>
            </div>
          </div>
          {teamOpen ? (
            <ChevronUp className="text-gray-400" size={18} />
          ) : (
            <ChevronDown className="text-gray-400" size={18} />
          )}
        </button>

        {teamOpen && (
          <div className="border-t border-gray-100 p-4 dark:border-gray-700 sm:p-5">
            {loading ? (
              <div className="py-6 text-center text-sm text-gray-400">
                Memuat aktivitas staff...
              </div>
            ) : aktivitasStaff.length === 0 ? (
              <EmptyState text="Belum ada aktivitas staff hari ini" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {aktivitasStaff.map((aktivitas) => {
                  const milikSaya = aktivitas.id === catatan?.id;

                  return (
                    <article
                      key={aktivitas.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {(milikSaya
                              ? "A"
                              : aktivitas.user?.nama?.charAt(0) || "S"
                            ).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {milikSaya
                                ? "Anda"
                                : (aktivitas.user?.nama ?? "Staff")}
                            </p>
                            {!milikSaya && aktivitas.user?.nip && (
                              <p className="truncate text-[11px] text-gray-400">
                                NIP {aktivitas.user.nip}
                              </p>
                            )}
                          </div>
                        </div>
                        {milikSaya && (
                          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Saya
                          </span>
                        )}
                      </div>

                      {milikSaya ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            Sudah mengisi
                          </span>
                          {aktivitas.foto.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Camera size={12} aria-hidden="true" />
                              {aktivitas.foto.length} foto
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="line-clamp-2 text-sm leading-5 text-gray-700 dark:text-gray-200">
                            {aktivitas.kegiatan}
                          </p>
                          <div className="mt-3 border-t border-gray-200/70 pt-3 dark:border-gray-700">
                            <p className="line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Hasil:</span>{" "}
                              {aktivitas.hasil}
                            </p>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Timeline riwayat */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4 px-1">
          <div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <History
                size={19}
                className="text-indigo-600"
                aria-hidden="true"
              />
              <h2 className="font-semibold">Riwayat Catatan</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Perjalanan aktivitas kerja Anda dari hari sebelumnya
            </p>
          </div>
          {riwayatSebelumnya.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {riwayatSebelumnya.length} hari
            </span>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800">
            Memuat riwayat...
          </div>
        ) : riwayatSebelumnya.length === 0 ? (
          <EmptyState text="Belum ada riwayat catatan" />
        ) : (
          <div className="relative ml-3 space-y-4 border-l border-indigo-100 pl-6 dark:border-indigo-900/60">
            {riwayatSebelumnya.map((item) => (
              <article
                key={item.id}
                className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="absolute -left-[31px] top-6 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 ring-4 ring-indigo-50 dark:border-gray-900 dark:ring-indigo-950" />

                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    {formatTanggalPendek(item.tanggal)}
                  </p>
                  {item.foto.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                      <Camera size={11} /> {item.foto.length} foto
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <JournalBlock
                    label="Kegiatan"
                    value={item.kegiatan}
                    compact
                  />
                  <JournalBlock
                    label="Hasil"
                    value={item.hasil}
                    compact
                    accent
                  />
                </div>

                {item.kendala && (
                  <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-950/20">
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      Kendala
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-gray-600 dark:text-gray-300">
                      {item.kendala}
                    </p>
                  </div>
                )}

                {item.foto.length > 0 && (
                  <div className="mt-4">
                    <PhotoGrid photos={item.foto} compact />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows,
  required = false,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {optional && (
          <span className="ml-1 font-normal text-gray-400">(opsional)</span>
        )}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100 dark:focus:border-indigo-600 dark:focus:bg-gray-900"
      />
    </div>
  );
}

function JournalBlock({
  label,
  value,
  accent = false,
  compact = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        accent
          ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-gray-100 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/40"
      }`}
    >
      <p
        className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${
          accent
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`whitespace-pre-wrap text-gray-700 dark:text-gray-200 ${
          compact ? "text-xs leading-5" : "text-sm leading-6"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PhotoGrid({
  photos,
  compact = false,
}: {
  photos: string[];
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4"}`}
    >
      {photos.map((url, index) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Dokumentasi ${index + 1}`}
            className={`${compact ? "h-16" : "h-24"} w-full object-cover transition duration-200 group-hover:scale-105`}
          />
        </a>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-8 text-center dark:border-gray-700 dark:bg-gray-900/30">
      <ClipboardCheck
        className="mx-auto mb-2 text-gray-300 dark:text-gray-600"
        size={28}
      />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
