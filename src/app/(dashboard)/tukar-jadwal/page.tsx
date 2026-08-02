"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
    AlertCircle,
    ArrowLeftRight,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock,
    History,
    Inbox,
    Loader2,
    MapPin,
    RefreshCw,
    Send,
    UserRound,
    X,
    XCircle,
} from "lucide-react";

type StatusTukarJadwal =
    | "MENUNGGU"
    | "DISETUJUI"
    | "DITOLAK"
    | "DIBATALKAN";

type TabGuru = "AJUKAN" | "MASUK" | "KELUAR" | "RIWAYAT";

interface JadwalSaya {
    id: string;
    tanggal: string;
    hari: string;
    jamMulai: string;
    jamSelesai: string;
    mapel: string;
    kelas: string;
    ruangan: string;
    dapatDitukar: boolean;
    alasanTidakTersedia: string[];
}

interface KandidatJadwal {
    id: string;
    tanggal: string;
    hari: string;
    jamMulai: string;
    jamSelesai: string;
    guruId: string;
    guru: string;
    mapel: string;
    kelas: string;
    ruangan: string;
}

interface KandidatResponse {
    tanggalPengaju: string;
    tanggalPenerima: string;

    jadwalSaya: JadwalSaya[];
    kandidat: KandidatJadwal[];
    jumlahKandidat?: number;

    error?: string;
}

interface DetailJadwal {
    id: string;
    tanggal: string;
    hari: string;
    jamMulai: string;
    jamSelesai: string;
    mapel: string;
    kelas: string;
    ruangan: string;
}

interface PengajuanTukar {
    id: string;
    status: StatusTukarJadwal;
    peranSaya: "PENGAJU" | "PENERIMA" | "PENGAMAT";

    dapatDitanggapi: boolean;
    dapatDibatalkan: boolean;
    sudahLewat: boolean;

    pengaju: {
        id: string;
        nama: string;
    };

    penerima: {
        id: string;
        nama: string;
    };

    jadwalPengaju: DetailJadwal;
    jadwalPenerima: DetailJadwal;

    ditanggapiAt: string | null;
    dibatalkanAt: string | null;
    createdAt: string;
    updatedAt: string;
}

function formatTanggalInput(date = new Date()) {
    const tahun = date.getFullYear();
    const bulan = String(date.getMonth() + 1).padStart(2, "0");
    const tanggal = String(date.getDate()).padStart(2, "0");

    return `${tahun}-${bulan}-${tanggal}`;
}

function formatTanggalIndonesia(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatWaktuTanggal(value: string) {
    return new Date(value).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getStatusConfig(status: StatusTukarJadwal) {
    const config = {
        MENUNGGU: {
            label: "Menunggu",
            className:
                "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
            icon: Clock,
        },

        DISETUJUI: {
            label: "Disetujui",
            className:
                "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
            icon: CheckCircle2,
        },

        DITOLAK: {
            label: "Ditolak",
            className:
                "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
            icon: XCircle,
        },

        DIBATALKAN: {
            label: "Dibatalkan",
            className:
                "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
            icon: X,
        },
    };

    return config[status];
}

function StatusBadge({ status }: { status: StatusTukarJadwal }) {
    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
            <Icon size={13} />
            {config.label}
        </span>
    );
}

function JadwalCard({
    jadwal,
    guru,
    title,
    active = false,
    disabled = false,
    onClick,
}: {
    jadwal: JadwalSaya | KandidatJadwal | DetailJadwal;
    guru?: string;
    title?: string;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}) {
    const content = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    {title && (
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                            {title}
                        </p>
                    )}

                    <p className="font-bold text-gray-900 dark:text-gray-100">
                        {jadwal.mapel}
                    </p>

                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        Kelas {jadwal.kelas}
                    </p>
                </div>

                {active && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check size={14} />
                    </span>
                )}
            </div>

            {guru && (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <UserRound size={14} className="text-indigo-500" />
                    {guru}
                </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    {formatTanggalIndonesia(jadwal.tanggal)}
                </span>

                <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    {jadwal.jamMulai}–{jadwal.jamSelesai}
                </span>

                <span className="flex items-center gap-1.5">
                    <MapPin size={13} />
                    {jadwal.ruangan}
                </span>
            </div>

            {"alasanTidakTersedia" in jadwal &&
                jadwal.alasanTidakTersedia.length > 0 && (
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                        {jadwal.alasanTidakTersedia[0]}
                    </div>
                )}
        </>
    );

    if (!onClick) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                {content}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full rounded-2xl border p-4 text-left transition ${active
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/15 dark:bg-indigo-950/30"
                    : disabled
                        ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900"
                        : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-700"
                }`}
        >
            {content}
        </button>
    );
}

function PengajuanCard({
    item,
    processingId,
    onAction,
    readOnly,
}: {
    item: PengajuanTukar;
    processingId: string | null;
    onAction: (
        id: string,
        aksi: "SETUJUI" | "TOLAK" | "BATALKAN",
    ) => void;
    readOnly: boolean;
}) {
    const sedangDiproses = processingId === item.id;

    return (
        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />

                        {item.peranSaya !== "PENGAMAT" && (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                {item.peranSaya === "PENGAJU"
                                    ? "Pengajuan keluar"
                                    : "Pengajuan masuk"}
                            </span>
                        )}
                    </div>

                    <p className="mt-2 text-xs text-gray-400">
                        Diajukan {formatWaktuTanggal(item.createdAt)}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-gray-400">Pertukaran antara</p>

                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                        {item.pengaju.nama} ↔ {item.penerima.nama}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                <JadwalCard
                    jadwal={item.jadwalPengaju}
                    guru={item.pengaju.nama}
                    title="Jadwal Pengaju"
                />

                <div className="flex justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        <ArrowLeftRight size={18} />
                    </div>
                </div>

                <JadwalCard
                    jadwal={item.jadwalPenerima}
                    guru={item.penerima.nama}
                    title="Jadwal Penerima"
                />
            </div>

            {!readOnly &&
                (item.dapatDitanggapi || item.dapatDibatalkan) && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
                        {item.dapatDibatalkan && (
                            <button
                                type="button"
                                disabled={sedangDiproses}
                                onClick={() => onAction(item.id, "BATALKAN")}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {sedangDiproses ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <X size={15} />
                                )}
                                Batalkan
                            </button>
                        )}

                        {item.dapatDitanggapi && (
                            <>
                                <button
                                    type="button"
                                    disabled={sedangDiproses}
                                    onClick={() => onAction(item.id, "TOLAK")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                    <XCircle size={15} />
                                    Tolak
                                </button>

                                <button
                                    type="button"
                                    disabled={sedangDiproses}
                                    onClick={() => onAction(item.id, "SETUJUI")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
                                >
                                    {sedangDiproses ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={15} />
                                    )}
                                    Setujui
                                </button>
                            </>
                        )}
                    </div>
                )}
        </article>
    );
}

export default function TukarJadwalPage() {
    const { data: session, status: sessionStatus } = useSession();

    const roles = useMemo(() => {
        const roleUtama = session?.user?.role;

        const tambahan = Array.isArray(session?.user?.roles)
            ? session.user.roles
            : [];

        return Array.from(
            new Set(
                [roleUtama, ...tambahan].filter(
                    (item): item is string =>
                        typeof item === "string" && item.length > 0,
                ),
            ),
        );
    }, [session?.user?.role, session?.user?.roles]);

    const isGuru = roles.includes("GURU");

    const isManagement =
        roles.includes("ADMIN") || roles.includes("PIMPINAN");

    const today = formatTanggalInput();

    const [activeTab, setActiveTab] = useState<TabGuru>("AJUKAN");

    const [tanggalPengaju, setTanggalPengaju] = useState(today);
    const [tanggalPenerima, setTanggalPenerima] = useState(today);

    const [jadwalPengajuId, setJadwalPengajuId] = useState("");
    const [jadwalPenerimaId, setJadwalPenerimaId] = useState("");

    const [kandidatData, setKandidatData] =
        useState<KandidatResponse | null>(null);

    const [pengajuan, setPengajuan] = useState<PengajuanTukar[]>([]);

    const [loadingKandidat, setLoadingKandidat] = useState(false);
    const [loadingPengajuan, setLoadingPengajuan] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchPengajuan = useCallback(async () => {
        setLoadingPengajuan(true);

        try {
            const response = await fetch("/api/tukar-jadwal", {
                cache: "no-store",
                credentials: "include",
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(result?.error ?? "Gagal mengambil pengajuan");
            }

            setPengajuan(Array.isArray(result) ? result : []);
        } catch (fetchError) {
            setError(
                fetchError instanceof Error
                    ? fetchError.message
                    : "Gagal mengambil pengajuan",
            );

            setPengajuan([]);
        } finally {
            setLoadingPengajuan(false);
        }
    }, []);

    const fetchKandidat = useCallback(
        async (selectedJadwalId?: string) => {
            if (!isGuru || !tanggalPengaju || !tanggalPenerima) {
                return;
            }

            setLoadingKandidat(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    tanggalPengaju,
                    tanggalPenerima,
                });

                if (selectedJadwalId) {
                    params.set("jadwalPengajuId", selectedJadwalId);
                }

                const response = await fetch(
                    `/api/tukar-jadwal/kandidat?${params.toString()}`,
                    {
                        cache: "no-store",
                        credentials: "include",
                    },
                );

                const result =
                    (await response.json().catch(() => null)) as
                    | KandidatResponse
                    | null;

                if (!response.ok) {
                    throw new Error(
                        result?.error ?? "Gagal mengambil kandidat jadwal",
                    );
                }

                setKandidatData(result);
            } catch (fetchError) {
                setKandidatData(null);

                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Gagal mengambil kandidat jadwal",
                );
            } finally {
                setLoadingKandidat(false);
            }
        },
        [isGuru, tanggalPengaju, tanggalPenerima],
    );

    useEffect(() => {
        if (sessionStatus !== "authenticated") return;

        void fetchPengajuan();
    }, [sessionStatus, fetchPengajuan]);

    useEffect(() => {
        if (sessionStatus !== "authenticated" || !isGuru) return;

        setJadwalPengajuId("");
        setJadwalPenerimaId("");
        setKandidatData(null);

        void fetchKandidat();
    }, [
        sessionStatus,
        isGuru,
        tanggalPengaju,
        tanggalPenerima,
        fetchKandidat,
    ]);

    const jadwalPengaju = kandidatData?.jadwalSaya.find(
        (item) => item.id === jadwalPengajuId,
    );

    const jadwalPenerima = kandidatData?.kandidat.find(
        (item) => item.id === jadwalPenerimaId,
    );

    const pengajuanMasuk = pengajuan.filter(
        (item) =>
            item.peranSaya === "PENERIMA" &&
            item.status === "MENUNGGU",
    );

    const pengajuanKeluar = pengajuan.filter(
        (item) =>
            item.peranSaya === "PENGAJU" &&
            item.status === "MENUNGGU",
    );

    const riwayat = pengajuan.filter(
        (item) => item.status !== "MENUNGGU",
    );

    const informasiManagement = pengajuan.filter(
        (item) => item.status === "DISETUJUI",
    );

    async function pilihJadwalPengaju(id: string) {
        setJadwalPengajuId(id);
        setJadwalPenerimaId("");
        setSuccess("");

        await fetchKandidat(id);
    }

    async function kirimPengajuan() {
        if (
            !jadwalPengajuId ||
            !jadwalPenerimaId ||
            !tanggalPengaju ||
            !tanggalPenerima
        ) {
            setError("Pilih kedua jadwal yang akan ditukar");
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("/api/tukar-jadwal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    jadwalPengajuId,
                    jadwalPenerimaId,
                    tanggalJadwalPengaju: tanggalPengaju,
                    tanggalJadwalPenerima: tanggalPenerima,
                }),
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    result?.error ?? "Gagal mengirim pengajuan",
                );
            }

            setSuccess(
                result?.message ?? "Pengajuan berhasil dikirim",
            );

            setJadwalPengajuId("");
            setJadwalPenerimaId("");

            await Promise.all([
                fetchKandidat(),
                fetchPengajuan(),
            ]);

            setActiveTab("KELUAR");
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Gagal mengirim pengajuan",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function prosesPengajuan(
        id: string,
        aksi: "SETUJUI" | "TOLAK" | "BATALKAN",
    ) {
        const pesanKonfirmasi = {
            SETUJUI:
                "Setujui pertukaran jadwal ini? Jadwal efektif kedua guru akan berubah pada tanggal terkait.",
            TOLAK: "Tolak pengajuan tukar jadwal ini?",
            BATALKAN: "Batalkan pengajuan tukar jadwal ini?",
        };

        if (!window.confirm(pesanKonfirmasi[aksi])) return;

        setProcessingId(id);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/tukar-jadwal/${id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ aksi }),
                },
            );

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    result?.error ?? "Gagal memproses pengajuan",
                );
            }

            setSuccess(
                result?.message ?? "Pengajuan berhasil diproses",
            );

            await fetchPengajuan();
        } catch (processError) {
            setError(
                processError instanceof Error
                    ? processError.message
                    : "Gagal memproses pengajuan",
            );
        } finally {
            setProcessingId(null);
        }
    }

    const tabs: {
        id: TabGuru;
        label: string;
        count?: number;
        icon: React.ElementType;
    }[] = [
            {
                id: "AJUKAN",
                label: "Ajukan",
                icon: Send,
            },
            {
                id: "MASUK",
                label: "Masuk",
                count: pengajuanMasuk.length,
                icon: Inbox,
            },
            {
                id: "KELUAR",
                label: "Keluar",
                count: pengajuanKeluar.length,
                icon: ArrowLeftRight,
            },
            {
                id: "RIWAYAT",
                label: "Riwayat",
                count: riwayat.length,
                icon: History,
            },
        ];

    if (sessionStatus === "loading") {
        return (
            <div className="flex min-h-[420px] items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
                <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-xs font-semibold">
                            <ArrowLeftRight size={14} />
                            Pertukaran Insidental
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight">
                            {isManagement && !isGuru
                                ? "Informasi Tukar Jadwal"
                                : "Tukar Jadwal Mengajar"}
                        </h1>

                        <p className="mt-1.5 max-w-2xl text-sm text-indigo-100/90">
                            Pertukaran hanya berlaku pada tanggal yang dipilih dan
                            tidak mengubah jadwal induk semester.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void fetchPengajuan();

                            if (isGuru) {
                                void fetchKandidat(jadwalPengajuId || undefined);
                            }
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
                    >
                        <RefreshCw size={16} />
                        Muat Ulang
                    </button>
                </div>
            </section>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                    <p>{success}</p>
                </div>
            )}

            {isManagement && !isGuru ? (
                <section className="space-y-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                        Admin dan pimpinan hanya menerima informasi. Persetujuan
                        dilakukan langsung oleh guru penerima.
                    </div>

                    {loadingPengajuan ? (
                        <div className="flex justify-center py-16">
                            <Loader2 size={28} className="animate-spin text-indigo-500" />
                        </div>
                    ) : informasiManagement.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
                            <ArrowLeftRight
                                size={40}
                                className="mx-auto mb-3 text-gray-300"
                            />

                            <p className="font-semibold text-gray-700 dark:text-gray-200">
                                Belum ada pertukaran yang disetujui
                            </p>
                        </div>
                    ) : (
                        informasiManagement.map((item) => (
                            <PengajuanCard
                                key={item.id}
                                item={item}
                                processingId={null}
                                onAction={prosesPengajuan}
                                readOnly
                            />
                        ))
                    )}
                </section>
            ) : (
                <>
                    <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setError("");
                                            setSuccess("");
                                        }}
                                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active
                                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                                                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {tab.label}

                                        {typeof tab.count === "number" && tab.count > 0 && (
                                            <span
                                                className={`rounded-full px-1.5 py-0.5 text-[10px] ${active
                                                        ? "bg-white/20 text-white"
                                                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                    }`}
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activeTab === "AJUKAN" && (
                        <section className="space-y-5">
                            <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Tanggal jadwal saya
                                    </label>

                                    <input
                                        type="date"
                                        min={today}
                                        value={tanggalPengaju}
                                        onChange={(event) =>
                                            setTanggalPengaju(event.target.value)
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Tanggal jadwal guru tujuan
                                    </label>

                                    <input
                                        type="date"
                                        min={today}
                                        value={tanggalPenerima}
                                        onChange={(event) =>
                                            setTanggalPenerima(event.target.value)
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                                    1. Pilih jadwal Anda
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Jadwal yang tidak tersedia tetap ditampilkan beserta
                                    alasannya.
                                </p>
                            </div>

                            {loadingKandidat && !kandidatData ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 size={28} className="animate-spin text-indigo-500" />
                                </div>
                            ) : !kandidatData?.jadwalSaya.length ? (
                                <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                                    Tidak ada jadwal milik Anda pada tanggal tersebut.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {kandidatData.jadwalSaya.map((item) => (
                                        <JadwalCard
                                            key={item.id}
                                            jadwal={item}
                                            active={jadwalPengajuId === item.id}
                                            disabled={!item.dapatDitukar}
                                            onClick={() => {
                                                void pilihJadwalPengaju(item.id);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {jadwalPengajuId && (
                                <>
                                    <div>
                                        <h2 className="font-bold text-gray-900 dark:text-gray-100">
                                            2. Pilih jadwal guru tujuan
                                        </h2>

                                        <p className="mt-1 text-sm text-gray-500">
                                            Hanya jadwal yang lolos validasi benturan,
                                            perizinan, dan absensi yang ditampilkan.
                                        </p>
                                    </div>

                                    {loadingKandidat ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2
                                                size={28}
                                                className="animate-spin text-indigo-500"
                                            />
                                        </div>
                                    ) : !kandidatData?.kandidat.length ? (
                                        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
                                            <AlertCircle
                                                size={34}
                                                className="mx-auto mb-3 text-amber-400"
                                            />

                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                Tidak ada kandidat yang tersedia
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                Coba pilih tanggal atau jadwal lain.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            {kandidatData.kandidat.map((item) => (
                                                <JadwalCard
                                                    key={item.id}
                                                    jadwal={item}
                                                    guru={item.guru}
                                                    active={jadwalPenerimaId === item.id}
                                                    onClick={() =>
                                                        setJadwalPenerimaId(item.id)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {jadwalPengaju && jadwalPenerima && (
                                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                                    <h2 className="font-bold text-indigo-900 dark:text-indigo-200">
                                        Preview Pertukaran
                                    </h2>

                                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                                        <JadwalCard
                                            jadwal={jadwalPengaju}
                                            guru={session?.user?.name ?? "Saya"}
                                            title="Jadwal Saya"
                                        />

                                        <ArrowLeftRight
                                            size={22}
                                            className="mx-auto text-indigo-500"
                                        />

                                        <JadwalCard
                                            jadwal={jadwalPenerima}
                                            guru={jadwalPenerima.guru}
                                            title="Jadwal Tujuan"
                                        />
                                    </div>

                                    <div className="mt-5 flex justify-end">
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => {
                                                void kirimPengajuan();
                                            }}
                                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
                                        >
                                            {submitting ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Send size={16} />
                                            )}

                                            Kirim Pengajuan
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab !== "AJUKAN" && (
                        <section className="space-y-4">
                            {loadingPengajuan ? (
                                <div className="flex justify-center py-16">
                                    <Loader2
                                        size={28}
                                        className="animate-spin text-indigo-500"
                                    />
                                </div>
                            ) : (
                                (() => {
                                    const dataTab =
                                        activeTab === "MASUK"
                                            ? pengajuanMasuk
                                            : activeTab === "KELUAR"
                                                ? pengajuanKeluar
                                                : riwayat;

                                    if (dataTab.length === 0) {
                                        return (
                                            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
                                                <Inbox
                                                    size={40}
                                                    className="mx-auto mb-3 text-gray-300"
                                                />

                                                <p className="font-semibold text-gray-700 dark:text-gray-200">
                                                    Belum ada data
                                                </p>
                                            </div>
                                        );
                                    }

                                    return dataTab.map((item) => (
                                        <PengajuanCard
                                            key={item.id}
                                            item={item}
                                            processingId={processingId}
                                            onAction={prosesPengajuan}
                                            readOnly={false}
                                        />
                                    ));
                                })()
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}