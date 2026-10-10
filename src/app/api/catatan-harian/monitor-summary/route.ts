import { Role, TipeKalender } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayJakarta } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

type ReadinessStatus =
  "LENGKAP" | "PERLU_DILENGKAPI" | "BELUM_LENGKAP" | "BELUM_ADA_HARI_KERJA";

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value) {
    return null;
  }

  return parsed;
}

function endOfDayUtc(date: Date) {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

function addUtcDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function enumerateDates(from: Date, to: Date) {
  const dates: Date[] = [];

  for (
    let cursor = new Date(from);
    cursor.getTime() <= to.getTime();
    cursor = addUtcDays(cursor, 1)
  ) {
    dates.push(new Date(cursor));
  }

  return dates;
}

function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

function hasIssue(kendala: string | null) {
  const value = (kendala ?? "").trim();

  return value.length > 0 && value !== "-";
}

function percentage(value: number, total: number) {
  if (total === 0) {
    return null;
  }

  return Math.round((value / total) * 10000) / 100;
}

function readinessStatus(submitted: number, expected: number): ReadinessStatus {
  if (expected === 0) {
    return "BELUM_ADA_HARI_KERJA";
  }

  const readiness = (submitted / expected) * 100;

  if (readiness >= 90) {
    return "LENGKAP";
  }

  if (readiness >= 70) {
    return "PERLU_DILENGKAPI";
  }

  return "BELUM_LENGKAP";
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = getSessionRoles(session.user as SessionUserWithRoles);
    const isManagement = roles.has(Role.ADMIN) || roles.has(Role.PIMPINAN);

    if (!isManagement) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses monitoring catatan staff",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);

    const fromRaw = searchParams.get("from");
    const toRaw = searchParams.get("to");
    const userId = searchParams.get("userId")?.trim() || null;

    const from = parseDateKey(fromRaw);
    const to = parseDateKey(toRaw);

    if (!from || !to) {
      return NextResponse.json(
        {
          error: "Parameter from dan to wajib menggunakan format YYYY-MM-DD",
        },
        { status: 400 },
      );
    }

    if (from.getTime() > to.getTime()) {
      return NextResponse.json(
        {
          error: "Tanggal mulai tidak boleh setelah tanggal akhir",
        },
        { status: 400 },
      );
    }

    const rangeDays = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;

    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        {
          error: `Rentang laporan maksimal ${MAX_RANGE_DAYS} hari`,
        },
        { status: 400 },
      );
    }

    const today = todayJakarta();

    // Tanggal masa depan tidak boleh menurunkan readiness.
    const effectiveTo = to.getTime() > today.getTime() ? today : to;

    const hasEffectivePeriod = from.getTime() <= effectiveTo.getTime();

    const staff = await prisma.user.findMany({
      where: {
        aktif: true,

        ...(userId ? { id: userId } : {}),

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
        id: true,
        nama: true,
        nip: true,
      },

      orderBy: {
        nama: "asc",
      },
    });

    if (userId && staff.length === 0) {
      return NextResponse.json(
        {
          error: "Staff tidak ditemukan atau sudah tidak aktif",
        },
        { status: 404 },
      );
    }

    const holidays = await prisma.kalenderAkademik.findMany({
      where: {
        tipe: {
          in: [TipeKalender.LIBUR_NASIONAL, TipeKalender.LIBUR_SEKOLAH],
        },

        tanggalMulai: {
          lte: endOfDayUtc(to),
        },

        tanggalSelesai: {
          gte: from,
        },
      },

      select: {
        id: true,
        judul: true,
        tipe: true,
        tanggalMulai: true,
        tanggalSelesai: true,
      },

      orderBy: {
        tanggalMulai: "asc",
      },
    });

    const holidayDateKeys = new Set<string>();

    if (hasEffectivePeriod) {
      for (const holiday of holidays) {
        const holidayFrom = maxDate(
          from,
          new Date(`${dateKey(holiday.tanggalMulai)}T00:00:00.000Z`),
        );

        const holidayTo = minDate(
          effectiveTo,
          new Date(`${dateKey(holiday.tanggalSelesai)}T00:00:00.000Z`),
        );

        if (holidayFrom.getTime() > holidayTo.getTime()) {
          continue;
        }

        for (const date of enumerateDates(holidayFrom, holidayTo)) {
          holidayDateKeys.add(dateKey(date));
        }
      }
    }

    const workingDayKeys = hasEffectivePeriod
      ? enumerateDates(from, effectiveTo)
          .filter((date) => {
            // UTC day 0 = Minggu. Senin–Sabtu adalah hari kerja staff.
            const isSunday = date.getUTCDay() === 0;

            return !isSunday && !holidayDateKeys.has(dateKey(date));
          })
          .map(dateKey)
      : [];

    const workingDaySet = new Set(workingDayKeys);

    const records =
      staff.length > 0 && hasEffectivePeriod
        ? await prisma.catatanHarian.findMany({
            where: {
              userId: {
                in: staff.map((item) => item.id),
              },

              tanggal: {
                gte: from,
                lte: endOfDayUtc(effectiveTo),
              },
            },

            select: {
              id: true,
              userId: true,
              tanggal: true,
              kegiatan: true,
              hasil: true,
              kendala: true,
              foto: true,
              createdAt: true,
              updatedAt: true,

              user: {
                select: {
                  id: true,
                  nama: true,
                  nip: true,
                },
              },
            },

            orderBy: [
              {
                tanggal: "desc",
              },
              {
                user: {
                  nama: "asc",
                },
              },
            ],
          })
        : [];

    const recordByStaffDate = new Map<string, (typeof records)[number]>();

    for (const record of records) {
      recordByStaffDate.set(
        `${record.userId}:${dateKey(record.tanggal)}`,
        record,
      );
    }

    const staffSummary = staff.map((staffItem) => {
      const expectedReports = workingDayKeys.length;

      const submittedReports = workingDayKeys.filter((tanggal) =>
        recordByStaffDate.has(`${staffItem.id}:${tanggal}`),
      ).length;

      const staffRecords = records.filter(
        (record) => record.userId === staffItem.id,
      );

      const withIssues = staffRecords.filter((record) =>
        hasIssue(record.kendala),
      ).length;

      const missingDates = workingDayKeys.filter(
        (tanggal) => !recordByStaffDate.has(`${staffItem.id}:${tanggal}`),
      );

      return {
        id: staffItem.id,
        nama: staffItem.nama,
        nip: staffItem.nip,

        expectedReports,
        submittedReports,
        missingReports: missingDates.length,
        readiness: percentage(submittedReports, expectedReports),
        status: readinessStatus(submittedReports, expectedReports),

        withIssues,
        missingDates,
      };
    });

    const expectedReports = staff.length * workingDayKeys.length;

    const submittedReports = records.filter((record) =>
      workingDaySet.has(dateKey(record.tanggal)),
    ).length;

    const issueRecords = records.filter((record) => hasIssue(record.kendala));

    const staffComplete =
      workingDayKeys.length > 0
        ? staffSummary.filter((item) => item.status === "LENGKAP").length
        : 0;

    return NextResponse.json(
      {
        period: {
          from: dateKey(from),
          to: dateKey(to),
          effectiveTo: hasEffectivePeriod ? dateKey(effectiveTo) : null,
          today: dateKey(today),

          workWeek: "SENIN_SABTU",
          workingDays: workingDayKeys,
          workingDayCount: workingDayKeys.length,

          futureDatesExcluded: to.getTime() > today.getTime(),
        },

        summary: {
          totalStaff: staff.length,

          expectedReports,
          submittedReports,
          missingReports: Math.max(expectedReports - submittedReports, 0),

          readiness: percentage(submittedReports, expectedReports),

          status: readinessStatus(submittedReports, expectedReports),

          staffComplete,
          staffIncomplete:
            workingDayKeys.length > 0 ? staff.length - staffComplete : 0,

          withIssues: issueRecords.length,
        },

        staff: staffSummary,

        holidays: holidays.map((holiday) => ({
          id: holiday.id,
          judul: holiday.judul,
          tipe: holiday.tipe,
          tanggalMulai: dateKey(holiday.tanggalMulai),
          tanggalSelesai: dateKey(holiday.tanggalSelesai),
        })),

        records: records.map((record) => ({
          id: record.id,
          tanggal: dateKey(record.tanggal),

          kegiatan: record.kegiatan,
          hasil: record.hasil,
          kendala: record.kendala,
          foto: record.foto,

          createdAt: record.createdAt,
          updatedAt: record.updatedAt,

          user: record.user,
        })),

        meta: {
          staffBasis: "CURRENT_ACTIVE_STAFF",
          holidayTypesExcluded: [
            TipeKalender.LIBUR_NASIONAL,
            TipeKalender.LIBUR_SEKOLAH,
          ],
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("CATATAN_HARIAN_MONITOR_SUMMARY_ERROR:", error);

    return NextResponse.json(
      {
        error: "Gagal memuat ringkasan catatan harian staff",
      },
      { status: 500 },
    );
  }
}
