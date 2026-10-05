// EDUPRESENCE_STAFF_ATTENDANCE_V1_1_BY_NAME

import { Role, StatusAbsensi, TipeAbsensi } from "@prisma/client";

import { sendKirimYoStaffAttendanceWebhook } from "@/lib/kirimyo";
import { prisma } from "@/lib/prisma";
import { todayJakarta } from "@/lib/time";

export const STAFF_RECAP_FIRST_RUN_DATE = "2026-10-05";
export const STAFF_RECAP_DAILY_START_DATE = "2026-10-06";

type StaffAttendanceItem = {
  nama: string;
  status: StatusAbsensi | null;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function humanDate(key: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${key}T12:00:00+07:00`));
}

function statusLabel(status: StatusAbsensi | null) {
  switch (status) {
    case StatusAbsensi.HADIR:
      return "✅ Hadir";

    case StatusAbsensi.TERLAMBAT:
      return "✅ Hadir";

    case StatusAbsensi.IZIN:
      return "📝 Izin";

    case StatusAbsensi.SAKIT:
      return "🤒 Sakit";

    case StatusAbsensi.ALPHA:
      return "❌ Alpha";

    case null:
      return "⚠️ Belum Absen";

    default:
      return `• ${String(status)}`;
  }
}

export async function buildStaffAttendanceRecap(tanggal = todayJakarta()) {
  const users = await prisma.user.findMany({
    where: {
      aktif: true,
      OR: [
        {
          role: Role.STAFF,
        },
        {
          rolesTambahan: {
            has: Role.STAFF,
          },
        },
      ],
    },
    select: {
      nama: true,
      absensi: {
        where: {
          tanggal,
          tipe: TipeAbsensi.BERANGKAT,
        },
        select: {
          status: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      nama: "asc",
    },
  });

  const staff: StaffAttendanceItem[] = users.map((user) => ({
    // Full name persis dari database.
    // Tidak menambah sapaan Ustadz/Ustadzah.
    nama: user.nama.trim(),
    status: user.absensi[0]?.status ?? null,
  }));

  const key = dateKey(tanggal);

  const rows =
    staff.length > 0
      ? staff.map(
          (item, index) =>
            `${index + 1}. ${item.nama} — ${statusLabel(item.status)}`,
        )
      : ["Belum ada staff aktif yang terdaftar."];

  const message = [
    "📋 *KEHADIRAN STAFF*",
    humanDate(key),
    "",
    ...rows,
    "",
    "_Data otomatis dari EduPresence._",
  ].join("\n");

  return {
    tanggal,
    date: key,
    totalStaff: staff.length,
    staff,
    message,
  };
}

export async function sendStaffAttendanceRecap(tanggal = todayJakarta()) {
  const recap = await buildStaffAttendanceRecap(tanggal);

  const eventId = `edupresence-staff-attendance:${recap.date}:morning`;

  const kirimyo = await sendKirimYoStaffAttendanceWebhook({
    eventId,
    date: recap.date,
    block: "KEHADIRAN STAFF",
    message: recap.message,
  });

  return {
    eventId,
    recap,
    kirimyo,
  };
}
