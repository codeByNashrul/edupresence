"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  Plus,
  List,
  Grid,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  CircleDashed,
  Flag,
  BookOpen,
  GraduationCap,
  PartyPopper,
  Layers,
  ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TipeKalender =
  | "LIBUR_NASIONAL"
  | "LIBUR_SEKOLAH"
  | "UJIAN"
  | "KEGIATAN"
  | "SEMESTER";

interface KalenderEvent {
  id: string;
  judul: string;
  deskripsi?: string | null;
  tipe: TipeKalender;
  tanggalMulai: string;
  tanggalSelesai: string;
}

// ─── Config tipe ──────────────────────────────────────────────────────────────
const TIPE_CONFIG: Record<
  TipeKalender,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
    icon: React.ElementType;
  }
> = {
  LIBUR_NASIONAL: {
    label: "Libur Nasional",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-900/50",
    dot: "bg-red-500",
    icon: Flag,
  },
  LIBUR_SEKOLAH: {
    label: "Libur Sekolah",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-900/50",
    dot: "bg-orange-500",
    icon: BookOpen,
  },
  UJIAN: {
    label: "Ujian",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-900/50",
    dot: "bg-violet-500",
    icon: GraduationCap,
  },
  KEGIATAN: {
    label: "Kegiatan Sekolah",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900/50",
    dot: "bg-emerald-500",
    icon: PartyPopper,
  },
  SEMESTER: {
    label: "Awal/Akhir Semester",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-900/50",
    dot: "bg-indigo-500",
    icon: Layers,
  },
};

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTanggal(tgl: string) {
  return new Date(tgl).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventOnDate(event: KalenderEvent, date: Date): boolean {
  const mulai = new Date(event.tanggalMulai);
  const selesai = new Date(event.tanggalSelesai);
  mulai.setHours(0, 0, 0, 0);
  selesai.setHours(23, 59, 59, 999);
  return date >= mulai && date <= selesai;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function KalenderAkademikPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<KalenderEvent | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calendar nav
  const today = new Date();
  const [navYear, setNavYear] = useState(today.getFullYear());
  const [navMonth, setNavMonth] = useState(today.getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form state
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    tipe: "KEGIATAN" as TipeKalender,
    tanggalMulai: "",
    tanggalSelesai: "",
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/kalender-akademik?tahun=${navYear}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, [navYear]);

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(navYear, navMonth, 1).getDay();
    const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      days.push(new Date(navYear, navMonth, d));
    return days;
  }, [navYear, navMonth]);

  // Events for current month view
  const eventsThisMonth = useMemo(
    () =>
      events.filter((e) => {
        const mulai = new Date(e.tanggalMulai);
        const selesai = new Date(e.tanggalSelesai);
        return (
          (mulai.getFullYear() === navYear && mulai.getMonth() === navMonth) ||
          (selesai.getFullYear() === navYear &&
            selesai.getMonth() === navMonth) ||
          (mulai < new Date(navYear, navMonth, 1) &&
            selesai > new Date(navYear, navMonth + 1, 0))
        );
      }),
    [events, navYear, navMonth],
  );

  // Events for selected date
  const eventsSelectedDate = useMemo(
    () =>
      selectedDate ? events.filter((e) => eventOnDate(e, selectedDate)) : [],
    [events, selectedDate],
  );

  // List: group by month
  const eventsByMonth = useMemo(() => {
    const grouped: Record<number, KalenderEvent[]> = {};
    events.forEach((e) => {
      const m = new Date(e.tanggalMulai).getMonth();
      if (!grouped[m]) grouped[m] = [];
      grouped[m].push(e);
    });
    return grouped;
  }, [events]);

  // ── Nav ────────────────────────────────────────────────────────────────────
  function prevMonth() {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(navYear - 1);
    } else setNavMonth(navMonth - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(navYear + 1);
    } else setNavMonth(navMonth + 1);
    setSelectedDate(null);
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  function openTambah() {
    setEditData(null);
    setForm({
      judul: "",
      deskripsi: "",
      tipe: "KEGIATAN",
      tanggalMulai: "",
      tanggalSelesai: "",
    });
    setError("");
    setShowForm(true);
  }

  function openEdit(e: KalenderEvent) {
    setEditData(e);
    setForm({
      judul: e.judul,
      deskripsi: e.deskripsi ?? "",
      tipe: e.tipe,
      tanggalMulai: e.tanggalMulai.split("T")[0],
      tanggalSelesai: e.tanggalSelesai.split("T")[0],
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    setSubmitting(true);

    const method = editData ? "PUT" : "POST";
    const url = editData
      ? `/api/kalender-akademik/${editData.id}`
      : "/api/kalender-akademik";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan");
      return;
    }
    setShowForm(false);
    fetchEvents();
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus event ini?")) return;
    await fetch(`/api/kalender-akademik/${id}`, { method: "DELETE" });
    fetchEvents();
  }

  const inputCls =
    "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 placeholder:text-gray-400 transition-all";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-3">
              <CalendarDays size={14} />
              Kalender Akademik
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Kalender Akademik
            </h1>
            <p className="text-indigo-100/90 text-sm mt-1.5">
              Jadwal kegiatan, libur, dan ujian tahun {navYear}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle view */}
            <div className="flex bg-white/15 border border-white/20 rounded-xl p-1 backdrop-blur-sm">
              <button
                onClick={() => setView("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === "grid"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Grid size={13} /> Kalender
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === "list"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <List size={13} /> Agenda
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={openTambah}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-sm font-semibold hover:bg-white/25 transition-all backdrop-blur-sm"
              >
                <Plus size={16} /> Tambah Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap">
          {(
            Object.entries(TIPE_CONFIG) as [
              TipeKalender,
              (typeof TIPE_CONFIG)[TipeKalender],
            ][]
          ).map(([, cfg]) => (
            <div
              key={cfg.label}
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── GRID VIEW ────────────────────────────────────────────────────────── */}
      {view === "grid" && (
        <div className="grid xl:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Calendar */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-gray-900 dark:text-gray-100">
                  {BULAN[navMonth]} {navYear}
                </h2>
                <select
                  value={navYear}
                  onChange={(e) => {
                    setNavYear(Number(e.target.value));
                    setSelectedDate(null);
                  }}
                  className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-400 focus:outline-none cursor-pointer"
                >
                  {Array.from(
                    { length: 10 },
                    (_, i) => today.getFullYear() - 2 + i,
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
              {HARI_SINGKAT.map((h) => (
                <div
                  key={h}
                  className="text-center py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((date, i) => {
                if (!date)
                  return (
                    <div
                      key={`empty-${i}`}
                      className="h-20 border-b border-r border-gray-50 dark:border-gray-800/50"
                    />
                  );

                const isToday = isSameDay(date, today);
                const isSelected = selectedDate
                  ? isSameDay(date, selectedDate)
                  : false;
                const dayEvents = eventsThisMonth.filter((e) =>
                  eventOnDate(e, date),
                );
                const isSunday = date.getDay() === 0;

                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(isSelected ? null : date)}
                    className={`h-20 p-1.5 border-b border-r border-gray-50 dark:border-gray-800/50 cursor-pointer transition-colors overflow-hidden ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    }`}
                  >
                    <div className="flex justify-end mb-1">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-indigo-600 text-white"
                            : isSunday
                              ? "text-red-500"
                              : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => {
                        const cfg = TIPE_CONFIG[e.tipe];
                        return (
                          <div
                            key={e.id}
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate ${cfg.bg} ${cfg.color}`}
                          >
                            {e.judul}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-gray-400 px-1.5">
                          +{dayEvents.length - 2} lagi
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side panel — events this month / selected date */}
          <div className="space-y-4">
            {/* Selected date events */}
            {selectedDate && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-950/30">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedDate.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                {eventsSelectedDate.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    Tidak ada event
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {eventsSelectedDate.map((e) => (
                      <EventItem
                        key={e.id}
                        event={e}
                        isAdmin={isAdmin}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Events this month */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  Event {BULAN[navMonth]}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {eventsThisMonth.length} event
                </p>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2
                    size={24}
                    className="mx-auto animate-spin text-indigo-400"
                  />
                </div>
              ) : eventsThisMonth.length === 0 ? (
                <div className="p-8 text-center">
                  <CircleDashed
                    size={28}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
                  />
                  <p className="text-xs text-gray-400">
                    Tidak ada event bulan ini
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
                  {eventsThisMonth.map((e) => (
                    <EventItem
                      key={e.id}
                      event={e}
                      isAdmin={isAdmin}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      compact
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIST / AGENDA VIEW ────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Year nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setNavYear(navYear - 1)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={15} /> {navYear - 1}
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {navYear}
            </h2>
            <button
              onClick={() => setNavYear(navYear + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {navYear + 1} <ChevronRight size={15} />
            </button>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
              <Loader2
                size={32}
                className="mx-auto animate-spin text-indigo-400 mb-3"
              />
              <p className="text-sm text-gray-500">Memuat kalender...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
              <CircleDashed
                size={40}
                className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
              />
              <p className="text-sm text-gray-500">
                Belum ada event tahun {navYear}
              </p>
            </div>
          ) : (
            BULAN.map((bulan, mi) => {
              const monthEvents = eventsByMonth[mi];
              if (!monthEvents || monthEvents.length === 0) return null;
              return (
                <div
                  key={mi}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <CalendarDays size={15} className="text-indigo-600" />
                      {bulan} {navYear}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                      {monthEvents.length} event
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {monthEvents.map((e) => (
                      <EventItem
                        key={e.id}
                        event={e}
                        isAdmin={isAdmin}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MODAL FORM ────────────────────────────────────────────────────────── */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                  <CalendarDays
                    size={18}
                    className="text-indigo-600 dark:text-indigo-400"
                  />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">
                    {editData ? "Edit Event" : "Tambah Event"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editData
                      ? "Ubah data event kalender"
                      : "Isi detail event baru"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Judul */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Judul Event
                </label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  placeholder="contoh: Hari Kemerdekaan, UTS Semester 1"
                  className={inputCls}
                  required
                />
              </div>

              {/* Tipe */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Tipe
                </label>
                <div className="relative">
                  <select
                    value={form.tipe}
                    onChange={(e) =>
                      setForm({ ...form, tipe: e.target.value as TipeKalender })
                    }
                    className={
                      inputCls + " appearance-none pr-9 cursor-pointer"
                    }
                    required
                  >
                    {(
                      Object.entries(TIPE_CONFIG) as [
                        TipeKalender,
                        (typeof TIPE_CONFIG)[TipeKalender],
                      ][]
                    ).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={form.tanggalMulai}
                    onChange={(e) =>
                      setForm({ ...form, tanggalMulai: e.target.value })
                    }
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={form.tanggalSelesai}
                    onChange={(e) =>
                      setForm({ ...form, tanggalSelesai: e.target.value })
                    }
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Deskripsi{" "}
                  <span className="font-normal normal-case">(opsional)</span>
                </label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) =>
                    setForm({ ...form, deskripsi: e.target.value })
                  }
                  placeholder="Keterangan tambahan..."
                  rows={3}
                  className={inputCls + " resize-none"}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3.5 py-3">
                  <AlertCircle
                    size={15}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />{" "}
                      Menyimpan...
                    </>
                  ) : editData ? (
                    "Simpan Perubahan"
                  ) : (
                    "Tambah Event"
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

// ─── EventItem sub-component ──────────────────────────────────────────────────
function EventItem({
  event,
  isAdmin,
  onEdit,
  onDelete,
  compact = false,
}: {
  event: KalenderEvent;
  isAdmin: boolean;
  onEdit: (e: KalenderEvent) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const cfg = TIPE_CONFIG[event.tipe];
  const Icon = cfg.icon;
  const mulai = new Date(event.tanggalMulai);
  const selesai = new Date(event.tanggalSelesai);
  const sameDay = isSameDay(mulai, selesai);

  return (
    <li className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
      <div
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}
      >
        <Icon size={14} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
          {event.judul}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}
          >
            {cfg.label}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {compact
              ? mulai.getDate() + (sameDay ? "" : `–${selesai.getDate()}`)
              : sameDay
                ? formatTanggal(event.tanggalMulai)
                : `${formatTanggal(event.tanggalMulai)} – ${formatTanggal(event.tanggalSelesai)}`}
          </span>
        </div>
        {!compact && event.deskripsi && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {event.deskripsi}
          </p>
        )}
      </div>
      {isAdmin && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(event)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </li>
  );
}
