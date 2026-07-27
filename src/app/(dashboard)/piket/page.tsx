"use client";

import { useEffect, useState } from "react";
import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    Clock,
    Loader2,
    MessageCircle,
    RefreshCw,
    X,
} from "lucide-react";

type StatusGuru = "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT" | "ALPHA" | "BELUM";

type StatusManual = Exclude<StatusGuru, "BELUM">;

type MonitoringGuru = {
    jadwalId: string;
    guru: string;
    noWa: string | null;
    mapel: string;
    kelas: string;
    jam: string;
    ruangan: string;
    status: StatusGuru;
    waktuScan: string | null;
};

type MonitoringResponse = {
    total: number;
    hadir: number;
    terkonfirmasi: number;
    belum: number;
    data: MonitoringGuru[];
    upcoming: MonitoringGuru[];
};

const emptyMonitoring: MonitoringResponse = {
    total: 0,
    hadir: 0,
    terkonfirmasi: 0,
    belum: 0,
    data: [],
    upcoming: [],
};

export default function PiketPage() {
    const [monitoring, setMonitoring] =
        useState<MonitoringResponse>(emptyMonitoring);

    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const [sendingReminder, setSendingReminder] = useState(false);

    const [online, setOnline] = useState(true);
    const [loading, setLoading] = useState(true);

    const [manualJadwal, setManualJadwal] = useState<MonitoringGuru | null>(null);

    const [manualStatus, setManualStatus] = useState<StatusManual>("HADIR");

    const [manualLoading, setManualLoading] = useState(false);

    const [manualError, setManualError] = useState("");

    const [manualSuccess, setManualSuccess] = useState("");

    async function loadMonitoring() {
        try {
            setLoading(true);

            const res = await fetch("/api/piket/monitoring", {
                cache: "no-store",
            });

            const result = (await res.json()) as
                MonitoringResponse | { error?: string };

            if (!res.ok) {
                throw new Error(
                    "error" in result && result.error
                        ? result.error
                        : "Gagal memuat monitoring piket",
                );
            }

            setMonitoring(result as MonitoringResponse);
            setLastUpdate(new Date());
            setOnline(true);
        } catch (error) {
            console.error("LOAD PIKET ERROR", error);
            setOnline(false);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadMonitoring();

        const interval = window.setInterval(loadMonitoring, 60_000);

        function handleOnline() {
            setOnline(true);
            loadMonitoring();
        }

        function handleOffline() {
            setOnline(false);
        }

        window.addEventListener("online", handleOnline);

        window.addEventListener("offline", handleOffline);

        return () => {
            window.clearInterval(interval);

            window.removeEventListener("online", handleOnline);

            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    function openWhatsApp(guru: MonitoringGuru) {
        if (!guru.noWa) {
            alert("Nomor WhatsApp guru belum tersedia");

            return;
        }

        const pesan = `Assalamu'alaikum Bapak/Ibu ${guru.guru}.

Kami dari SMP Center mengingatkan bahwa Bapak/Ibu memiliki jadwal mengajar:

${guru.mapel}
Kelas: ${guru.kelas}
Jam: ${guru.jam}
Ruangan: ${guru.ruangan}

Mohon melakukan konfirmasi kehadiran melalui QR Absensi EduPresence.

Terima kasih.`;

        let nomor = guru.noWa.replace(/\D/g, "");

        if (nomor.startsWith("0")) {
            nomor = `62${nomor.slice(1)}`;
        }

        const url = `https://wa.me/${nomor}` + `?text=${encodeURIComponent(pesan)}`;

        window.open(url, "_blank", "noopener,noreferrer");
    }

    const guruBelumKonfirmasi = monitoring.data.filter(
        (guru) => guru.status === "BELUM",
    );

    function openAllReminder() {
        if (guruBelumKonfirmasi.length === 0) {
            alert("Tidak ada guru yang belum konfirmasi");

            return;
        }

        setSendingReminder(true);

        guruBelumKonfirmasi.forEach((guru, index) => {
            window.setTimeout(() => openWhatsApp(guru), index * 400);
        });

        window.setTimeout(
            () => {
                setSendingReminder(false);
            },
            guruBelumKonfirmasi.length * 400 + 500,
        );
    }

    function openManualStatus(jadwal: MonitoringGuru) {
        setManualJadwal(jadwal);
        setManualStatus("HADIR");
        setManualError("");
        setManualSuccess("");
    }

    function closeManualStatus() {
        if (manualLoading) return;

        setManualJadwal(null);
        setManualStatus("HADIR");
        setManualError("");
        setManualSuccess("");
    }

    async function handleManualSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!manualJadwal) return;

        setManualLoading(true);
        setManualError("");
        setManualSuccess("");

        try {
            const res = await fetch("/api/absensi/manual", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jadwalId: manualJadwal.jadwalId,
                    status: manualStatus,
                }),
            });

            const result = (await res.json()) as {
                error?: string;
                message?: string;
            };

            if (!res.ok) {
                setManualError(result.error ?? "Gagal menyimpan status guru");

                return;
            }

            setManualSuccess(result.message ?? "Status berhasil disimpan");

            await loadMonitoring();

            window.setTimeout(() => {
                closeManualStatus();
            }, 700);
        } catch {
            setManualError("Gagal terhubung ke server");
        } finally {
            setManualLoading(false);
        }
    }

    function statusConfig(status: StatusGuru) {
        switch (status) {
            case "HADIR":
                return {
                    label: "HADIR",
                    color:
                        "border-green-200 bg-green-100 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-400",
                    dot: "bg-green-500",
                };

            case "TERLAMBAT":
                return {
                    label: "TERLAMBAT",
                    color:
                        "border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-400",
                    dot: "bg-yellow-500",
                };

            case "IZIN":
                return {
                    label: "IZIN",
                    color:
                        "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-400",
                    dot: "bg-blue-500",
                };

            case "SAKIT":
                return {
                    label: "SAKIT",
                    color:
                        "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-400",
                    dot: "bg-purple-500",
                };

            case "ALPHA":
                return {
                    label: "ALPHA",
                    color:
                        "border-red-200 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-400",
                    dot: "bg-red-500",
                };

            default:
                return {
                    label: "BELUM KONFIRMASI",
                    color:
                        "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-400",
                    dot: "bg-orange-500",
                };
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-indigo-100">EduPresence</p>

                        <h1 className="mt-1 text-2xl font-bold">Piket KBM Pagi</h1>

                        <p className="mt-2 text-sm text-indigo-100">
                            Monitoring kehadiran jam mengajar guru dan tindak lanjut jadwal mengajar.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadMonitoring}
                        disabled={loading}
                        className="rounded-xl bg-white/20 p-3 transition hover:bg-white/30 disabled:opacity-60"
                        title="Perbarui monitoring"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                    <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium ${online
                                ? "bg-green-500/20 text-green-100"
                                : "bg-red-500/20 text-red-100"
                            }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"
                                }`}
                        />

                        {online ? "Online" : "Koneksi Bermasalah"}
                    </span>

                    {lastUpdate && (
                        <span className="text-indigo-100/80">
                            Update:{" "}
                            {lastUpdate.toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </span>
                    )}
                </div>
            </div>

            {/* Statistik */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard title="Jadwal Aktif" value={monitoring.total} />

                <StatCard
                    title="Sudah Konfirmasi"
                    value={monitoring.terkonfirmasi}
                    color="text-green-600"
                />

                <StatCard
                    title="Belum Konfirmasi"
                    value={monitoring.belum}
                    color="text-orange-600"
                />
            </div>

            {/* Jadwal aktif */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-bold">Jadwal Mengajar Aktif</h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Jadwal yang sedang berlangsung atau akan dimulai dalam 15 menit.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openAllReminder}
                        disabled={guruBelumKonfirmasi.length === 0 || sendingReminder}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <MessageCircle size={16} />

                        {sendingReminder
                            ? "Mengirim..."
                            : `Kirim Pengingat (${guruBelumKonfirmasi.length})`}
                    </button>
                </div>

                <div className="mt-5 space-y-3">
                    {monitoring.data.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-700">
                            <Clock
                                size={30}
                                className="mx-auto text-gray-300 dark:text-gray-600"
                            />

                            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                                Tidak ada jadwal aktif saat ini
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                                Jadwal akan muncul 15 menit sebelum pelajaran dimulai.
                            </p>
                        </div>
                    ) : (
                        monitoring.data.map((guru) => {
                            const status = statusConfig(guru.status);

                            return (
                                <div
                                    key={guru.jadwalId}
                                    className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                {guru.guru}
                                            </p>

                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.color}`}
                                            >
                                                <span
                                                    className={`h-2 w-2 rounded-full ${status.dot}`}
                                                />

                                                {status.label}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-sm text-gray-500">
                                            {guru.mapel} · {guru.kelas}
                                        </p>

                                        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-400">
                                            <Clock size={12} />
                                            {guru.jam} · {guru.ruangan}
                                        </p>

                                        {guru.waktuScan && (
                                            <p className="mt-1 text-xs text-gray-400">
                                                Dicatat pukul{" "}
                                                {new Date(guru.waktuScan).toLocaleTimeString("id-ID", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        {guru.status === "BELUM" && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openManualStatus(guru)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                                                >
                                                    <CheckCircle2 size={15} />
                                                    Catat Status
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openWhatsApp(guru)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                                                >
                                                    <MessageCircle size={15} />
                                                    WA
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Jadwal berikutnya */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        <CalendarClock size={20} />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold">Jadwal Berikutnya</h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Maksimal lima jadwal setelah jam pelajaran saat ini.
                        </p>
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    {monitoring.upcoming.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-7 text-center text-sm text-gray-500 dark:border-gray-700">
                            Tidak ada jadwal berikutnya hari ini.
                        </div>
                    ) : (
                        monitoring.upcoming.map((guru) => {
                            const status = statusConfig(guru.status);

                            return (
                                <div
                                    key={guru.jadwalId}
                                    className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3.5 dark:border-gray-800 sm:flex-row sm:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                {guru.jam}
                                            </p>

                                            {guru.status !== "BELUM" && (
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.color}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                                                    />

                                                    {status.label}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                            {guru.mapel} · {guru.kelas}
                                        </p>

                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {guru.guru} · {guru.ruangan}
                                        </p>
                                    </div>

                                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                        AKAN DATANG
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal catat status */}
            {manualJadwal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                                    Catat Status Mengajar
                                </h2>

                                <p className="mt-0.5 text-xs text-gray-500">
                                    Verifikasi kehadiran guru pada jadwal aktif.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeManualStatus}
                                disabled={manualLoading}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-5 p-6">
                            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                                <DetailRow label="Guru" value={manualJadwal.guru} />

                                <DetailRow label="Mata Pelajaran" value={manualJadwal.mapel} />

                                <DetailRow label="Kelas" value={manualJadwal.kelas} />

                                <DetailRow label="Jadwal" value={manualJadwal.jam} />

                                <DetailRow label="Ruangan" value={manualJadwal.ruangan} />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Status
                                </label>

                                <select
                                    value={manualStatus}
                                    onChange={(event) =>
                                        setManualStatus(event.target.value as StatusManual)
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                >
                                    <option value="HADIR">Hadir</option>

                                    <option value="TERLAMBAT">Terlambat</option>

                                    <option value="IZIN">Izin</option>

                                    <option value="SAKIT">Sakit</option>

                                    <option value="ALPHA">Alpha</option>
                                </select>
                            </div>

                            {manualError && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 dark:border-red-900/50 dark:bg-red-950/40">
                                    <AlertCircle
                                        size={15}
                                        className="mt-0.5 shrink-0 text-red-500"
                                    />

                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {manualError}
                                    </p>
                                </div>
                            )}

                            {manualSuccess && (
                                <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                                    <CheckCircle2
                                        size={15}
                                        className="mt-0.5 shrink-0 text-emerald-500"
                                    />

                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                        {manualSuccess}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2.5">
                                <button
                                    type="button"
                                    onClick={closeManualStatus}
                                    disabled={manualLoading}
                                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Batal
                                </button>

                                <button
                                    type="submit"
                                    disabled={manualLoading}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
                                >
                                    {manualLoading ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Status"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>

            <span className="text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                {value}
            </span>
        </div>
    );
}

function StatCard({
    title,
    value,
    color = "text-gray-900 dark:text-gray-100",
}: {
    title: string;
    value: number;
    color?: string;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500">{title}</p>

            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );
}
