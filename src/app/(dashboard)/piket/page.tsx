"use client";

import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";

type MonitoringGuru = {
    jadwalId: string;
    guru: string;
    noWa: string | null;
    mapel: string;
    kelas: string;
    jam: string;
    ruangan: string;
    status: "HADIR" | "TERLAMBAT" | "BELUM";
    waktuScan: string | null;
};

type MonitoringResponse = {
    total: number;
    hadir: number;
    belum: number;
    data: MonitoringGuru[];
};

export default function PiketPage() {
    const [monitoring, setMonitoring] = useState<MonitoringResponse | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [sendingReminder, setSendingReminder] = useState(false);
    const [online, setOnline] = useState(true);
    const [loading, setLoading] = useState(true);

    async function loadMonitoring() {
        try {
            setLoading(true);
            const res = await fetch("/api/piket/monitoring", { cache: "no-store" });
            const data = await res.json();
            setMonitoring(data);
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
        const interval = setInterval(loadMonitoring, 60000);

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
            clearInterval(interval);
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

Terima kasih.
`;

        const nomor = guru.noWa.replace(/^0/, "62");
        const url = `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
        window.open(url, "_blank");
    }

    const daftarGuru = monitoring?.data ?? [];
    const guruBelumScan = daftarGuru.filter((guru) => guru.status === "BELUM");

    function openAllReminder() {
        if (guruBelumScan.length === 0) {
            alert("Tidak ada guru yang belum konfirmasi");
            return;
        }

        setSendingReminder(true);

        // buka tab WA satu per satu dengan jeda, biar browser tidak memblokir popup
        guruBelumScan.forEach((guru, index) => {
            setTimeout(() => openWhatsApp(guru), index * 400);
        });

        setTimeout(() => {
            setSendingReminder(false);
        }, guruBelumScan.length * 400 + 500);
    }

    function statusConfig(status: MonitoringGuru["status"]) {
        switch (status) {
            case "HADIR":
                return {
                    label: "HADIR",
                    color: "bg-green-100 text-green-700 border-green-200",
                    dot: "bg-green-500",
                };

            case "TERLAMBAT":
                return {
                    label: "TERLAMBAT",
                    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
                    dot: "bg-yellow-500",
                };

            default:
                return {
                    label: "BELUM SCAN",
                    color: "bg-red-100 text-red-700 border-red-200",
                    dot: "bg-red-500",
                };
        }
    }

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-indigo-100">EduPresence</p>
                        <h1 className="mt-1 text-2xl font-bold">Piket SMP Center</h1>
                        <p className="mt-2 text-sm text-indigo-100">
                            Monitoring kehadiran guru dan tindak lanjut konfirmasi.
                        </p>
                    </div>

                    <button
                        onClick={loadMonitoring}
                        className="rounded-xl bg-white/20 p-3 hover:bg-white/30 transition"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                    <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium ${online ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"
                            }`}
                    >
                        <span className={`h-2 w-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />
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

            {/* STATISTIK */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard title="Guru Terjadwal" value={monitoring?.total ?? 0} />
                <StatCard title="Sudah Konfirmasi" value={monitoring?.hadir ?? 0} color="text-green-600" />
                <StatCard title="Belum Konfirmasi" value={monitoring?.belum ?? 0} color="text-orange-600" />
            </div>

            {/* MONITORING */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Monitoring Guru Hari Ini</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Pantau status kehadiran guru yang memiliki jadwal mengajar.
                        </p>
                    </div>

                    <button
                        onClick={openAllReminder}
                        disabled={guruBelumScan.length === 0 || sendingReminder}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        <MessageCircle size={16} />
                        {sendingReminder ? "Mengirim..." : `Kirim Pengingat (${guruBelumScan.length})`}
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    {daftarGuru.length === 0 ? (
                        <p className="text-sm text-gray-500">Belum ada jadwal mengajar hari ini.</p>
                    ) : (
                        daftarGuru.map((guru) => {
                            const status = statusConfig(guru.status);

                            return (
                                <div
                                    key={guru.jadwalId}
                                    className="flex items-center justify-between gap-4 rounded-xl border p-4"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{guru.guru}</p>

                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.color}`}
                                            >
                                                <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                                                {status.label}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-sm text-gray-500">
                                            {guru.mapel} · {guru.kelas}
                                        </p>

                                        <p className="text-xs text-gray-400">
                                            {guru.jam} · {guru.ruangan}
                                        </p>

                                        {guru.waktuScan && (
                                            <p className="mt-1 text-xs text-gray-400">
                                                Scan:{" "}
                                                {new Date(guru.waktuScan).toLocaleTimeString("id-ID", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        )}
                                    </div>

                                    {guru.status === "BELUM" && (
                                        <button
                                            onClick={() => openWhatsApp(guru)}
                                            className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                                        >
                                            <MessageCircle size={16} />
                                            WA
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    color = "text-gray-900",
}: {
    title: string;
    value: number;
    color?: string;
}) {
    return (
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-900">
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );
}