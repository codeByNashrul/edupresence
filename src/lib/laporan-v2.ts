import {
  JenisIzin,
  Prisma,
  Role,
  StatusAbsensi,
  StatusIzin,
  TipeAbsensi,
  TipeKalender,
} from "@/generated/prisma/client";

import { getJadwalEfektif } from "@/lib/jadwal-efektif";
import { prisma } from "@/lib/prisma";
import { timeJakarta } from "@/lib/time";

export type PeriodeLaporan = "harian" | "mingguan" | "bulanan" | "custom";
export type ScopePegawai = "semua" | "guru" | "staff";

export type StatusLaporan =
  "HADIR" | "TERLAMBAT" | "IZIN" | "SAKIT" | "ALPHA" | "BELUM_ABSEN";

type StatusDetailMengajar = StatusLaporan | "BELUM_WAKTUNYA";

type StatusCounts = Record<StatusLaporan, number>;

export type LaporanV2Params = {
  periode: PeriodeLaporan;
  tanggal?: string | null;
  from?: string | null;
  to?: string | null;
  scope?: ScopePegawai;
  userId?: string | null;
};

const STATUS_LIST: StatusLaporan[] = [
  "HADIR",
  "TERLAMBAT",
  "IZIN",
  "SAKIT",
  "ALPHA",
  "BELUM_ABSEN",
];

const JP_PER_PERTEMUAN = 2;

function emptyCounts(): StatusCounts {
  return {
    HADIR: 0,
    TERLAMBAT: 0,
    IZIN: 0,
    SAKIT: 0,
    ALPHA: 0,
    BELUM_ABSEN: 0,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return null;

  return round2((numerator / denominator) * 100);
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + amount);

  return result;
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function endOfDayUtc(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function enumerateDates(from: Date, to: Date) {
  const dates: Date[] = [];

  let current = new Date(from);

  while (current.getTime() <= to.getTime()) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
}

function todayJakarta() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }

      return result;
    }, {});

  return new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
}

function getPeriodRange(params: LaporanV2Params) {
  const today = todayJakarta();

  if (params.periode === "custom") {
    const from = params.from ? parseDate(params.from) : null;
    const to = params.to ? parseDate(params.to) : null;

    if (!from || !to) {
      throw new Error("CUSTOM_DATE_REQUIRED");
    }

    if (from.getTime() > to.getTime()) {
      throw new Error("INVALID_DATE_RANGE");
    }

    return { from, to, today };
  }

  const anchor = params.tanggal ? parseDate(params.tanggal) : today;

  if (!anchor) {
    throw new Error("INVALID_DATE");
  }

  if (params.periode === "harian") {
    return {
      from: anchor,
      to: anchor,
      today,
    };
  }

  if (params.periode === "mingguan") {
    const day = anchor.getUTCDay();

    const mondayOffset = day === 0 ? -6 : 1 - day;

    const from = addDays(anchor, mondayOffset);
    const to = addDays(from, 5);

    return {
      from,
      to,
      today,
    };
  }

  const from = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
  );

  const to = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
  );

  return {
    from,
    to,
    today,
  };
}

function getRangeLength(from: Date, to: Date) {
  return (
    Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );
}

function statusFromIzin(jenisIzin: JenisIzin): StatusLaporan {
  return jenisIzin === JenisIzin.SAKIT ? "SAKIT" : "IZIN";
}

function statusFromAbsensi(status: StatusAbsensi): StatusLaporan {
  switch (status) {
    case StatusAbsensi.HADIR:
      return "HADIR";

    case StatusAbsensi.TERLAMBAT:
      return "TERLAMBAT";

    case StatusAbsensi.IZIN:
      return "IZIN";

    case StatusAbsensi.SAKIT:
      return "SAKIT";

    case StatusAbsensi.ALPHA:
      return "ALPHA";
  }
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    minute < 0
  ) {
    return 0;
  }

  return hour * 60 + minute;
}

function durationMinutes(start: string, end: string) {
  return Math.max(timeToMinutes(end) - timeToMinutes(start), 0);
}

function isTeachingSlotBelumWaktunya({
  tanggalKey,
  jamMulai,
  todayKey,
  currentTime,
}: {
  tanggalKey: string;
  jamMulai: string;
  todayKey: string;
  currentTime: string;
}) {
  return tanggalKey === todayKey && jamMulai > currentTime;
}

function combineCounts(target: StatusCounts, source: StatusCounts) {
  for (const status of STATUS_LIST) {
    target[status] += source[status];
  }
}

function hasRole(
  user: {
    role: Role;
    rolesTambahan: Role[];
  },
  role: Role,
) {
  return user.role === role || user.rolesTambahan.includes(role);
}

function buildPegawaiWhere(
  scope: ScopePegawai,
  userId?: string | null,
): Prisma.UserWhereInput {
  const roleFilter: Prisma.UserWhereInput =
    scope === "guru"
      ? {
          OR: [
            { role: Role.GURU },
            {
              rolesTambahan: {
                has: Role.GURU,
              },
            },
          ],
        }
      : scope === "staff"
        ? {
            OR: [
              { role: Role.STAFF },
              {
                rolesTambahan: {
                  has: Role.STAFF,
                },
              },
            ],
          }
        : {
            OR: [
              {
                role: {
                  in: [Role.GURU, Role.STAFF],
                },
              },
              {
                rolesTambahan: {
                  hasSome: [Role.GURU, Role.STAFF],
                },
              },
            ],
          };

  return {
    aktif: true,
    ...(userId ? { id: userId } : {}),
    ...roleFilter,
  };
}

async function getJadwalRange(dates: Date[]) {
  const result = [];

  // Hindari meledakkan koneksi DB jika custom range cukup panjang.
  const chunkSize = 6;

  for (let index = 0; index < dates.length; index += chunkSize) {
    const chunk = dates.slice(index, index + chunkSize);

    const chunkResult = await Promise.all(
      chunk.map(async (tanggal) => ({
        tanggal,
        jadwal: await getJadwalEfektif({ tanggal }),
      })),
    );

    result.push(...chunkResult);
  }

  return result;
}

export async function getLaporanV2(params: LaporanV2Params) {
  const scope = params.scope ?? "semua";

  const { from, to, today } = getPeriodRange(params);

  const todayKey = dateKey(today);
  const currentTime = timeJakarta();

  const requestedDays = getRangeLength(from, to);

  if (requestedDays > 93) {
    throw new Error("DATE_RANGE_TOO_LARGE");
  }

  const effectiveTo = to.getTime() > today.getTime() ? today : to;

  const hasEffectivePeriod = from.getTime() <= effectiveTo.getTime();

  const pegawai = await prisma.user.findMany({
    where: buildPegawaiWhere(scope, params.userId),
    select: {
      id: true,
      nama: true,
      nip: true,
      role: true,
      rolesTambahan: true,
    },
    orderBy: {
      nama: "asc",
    },
  });

  if (params.userId && pegawai.length === 0) {
    throw new Error("PEGAWAI_NOT_FOUND");
  }

  const holidays = hasEffectivePeriod
    ? await prisma.kalenderAkademik.findMany({
        where: {
          tipe: {
            in: [TipeKalender.LIBUR_NASIONAL, TipeKalender.LIBUR_SEKOLAH],
          },
          tanggalMulai: {
            lte: endOfDayUtc(effectiveTo),
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
      })
    : [];

  const holidayKeys = new Set<string>();

  if (hasEffectivePeriod) {
    for (const holiday of holidays) {
      const holidayFrom = maxDate(
        from,
        new Date(
          Date.UTC(
            holiday.tanggalMulai.getUTCFullYear(),
            holiday.tanggalMulai.getUTCMonth(),
            holiday.tanggalMulai.getUTCDate(),
          ),
        ),
      );

      const holidayTo = minDate(
        effectiveTo,
        new Date(
          Date.UTC(
            holiday.tanggalSelesai.getUTCFullYear(),
            holiday.tanggalSelesai.getUTCMonth(),
            holiday.tanggalSelesai.getUTCDate(),
          ),
        ),
      );

      if (holidayFrom.getTime() > holidayTo.getTime()) {
        continue;
      }

      for (const date of enumerateDates(holidayFrom, holidayTo)) {
        holidayKeys.add(dateKey(date));
      }
    }
  }

  const workingDates = hasEffectivePeriod
    ? enumerateDates(from, effectiveTo).filter((date) => {
        const isSunday = date.getUTCDay() === 0;

        return !isSunday && !holidayKeys.has(dateKey(date));
      })
    : [];

  const workingDaySet = new Set(workingDates.map(dateKey));

  const userIds = pegawai.map((item) => item.id);

  const [berangkatRecords, mengajarRecords, izinRecords, jadwalRange] =
    await Promise.all([
      userIds.length > 0 && hasEffectivePeriod
        ? prisma.absensi.findMany({
            where: {
              userId: {
                in: userIds,
              },
              tipe: TipeAbsensi.BERANGKAT,
              tanggal: {
                gte: from,
                lte: endOfDayUtc(effectiveTo),
              },
            },
            select: {
              userId: true,
              tanggal: true,
              status: true,
              waktuScan: true,
            },
            orderBy: {
              waktuScan: "desc",
            },
          })
        : [],

      userIds.length > 0 && hasEffectivePeriod
        ? prisma.absensi.findMany({
            where: {
              userId: {
                in: userIds,
              },
              tipe: TipeAbsensi.JAM_MENGAJAR,
              jadwalId: {
                not: null,
              },
              tanggal: {
                gte: from,
                lte: endOfDayUtc(effectiveTo),
              },
            },
            select: {
              userId: true,
              jadwalId: true,
              tanggal: true,
              status: true,
              waktuScan: true,
            },
            orderBy: {
              waktuScan: "desc",
            },
          })
        : [],

      userIds.length > 0 && hasEffectivePeriod
        ? prisma.izin.findMany({
            where: {
              userId: {
                in: userIds,
              },
              status: StatusIzin.APPROVED,
              tanggalMulai: {
                lte: endOfDayUtc(effectiveTo),
              },
              tanggalAkhir: {
                gte: from,
              },
            },
            select: {
              id: true,
              userId: true,
              jenisIzin: true,
              tanggalMulai: true,
              tanggalAkhir: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : [],

      hasEffectivePeriod ? getJadwalRange(workingDates) : Promise.resolve([]),
    ]);

  const berangkatMap = new Map<string, (typeof berangkatRecords)[number]>();

  for (const record of berangkatRecords) {
    const key = `${record.userId}:${dateKey(record.tanggal)}`;

    if (!berangkatMap.has(key)) {
      berangkatMap.set(key, record);
    }
  }

  const mengajarMap = new Map<string, (typeof mengajarRecords)[number]>();

  for (const record of mengajarRecords) {
    if (!record.jadwalId) continue;

    const key = `${record.userId}:${record.jadwalId}:${dateKey(record.tanggal)}`;

    if (!mengajarMap.has(key)) {
      mengajarMap.set(key, record);
    }
  }

  const izinMap = new Map<string, StatusLaporan>();

  for (const izin of izinRecords) {
    const start = maxDate(
      from,
      new Date(
        Date.UTC(
          izin.tanggalMulai.getUTCFullYear(),
          izin.tanggalMulai.getUTCMonth(),
          izin.tanggalMulai.getUTCDate(),
        ),
      ),
    );

    const finish = minDate(
      effectiveTo,
      new Date(
        Date.UTC(
          izin.tanggalAkhir.getUTCFullYear(),
          izin.tanggalAkhir.getUTCMonth(),
          izin.tanggalAkhir.getUTCDate(),
        ),
      ),
    );

    if (start.getTime() > finish.getTime()) {
      continue;
    }

    for (const date of enumerateDates(start, finish)) {
      const tanggalKey = dateKey(date);

      if (!workingDaySet.has(tanggalKey)) {
        continue;
      }

      const key = `${izin.userId}:${tanggalKey}`;

      if (!izinMap.has(key)) {
        izinMap.set(key, statusFromIzin(izin.jenisIzin));
      }
    }
  }

  const jadwalPerUser = new Map<
    string,
    Array<{
      tanggal: Date;
      tanggalKey: string;
      jadwalId: string;
      jamMulai: string;
      jamSelesai: string;
      kelas: string;
      mataPelajaran: string;
      ruangan: string;
      sumber: "INDUK" | "TUKAR";
    }>
  >();

  const selectedUserIds = new Set(userIds);

  for (const day of jadwalRange) {
    for (const jadwal of day.jadwal) {
      if (!selectedUserIds.has(jadwal.guru.userId)) {
        continue;
      }

      const list = jadwalPerUser.get(jadwal.guru.userId) ?? [];

      list.push({
        tanggal: day.tanggal,
        tanggalKey: dateKey(day.tanggal),
        jadwalId: jadwal.jadwalId,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,
        kelas: jadwal.kelas.nama,
        mataPelajaran: jadwal.mataPelajaran.nama,
        ruangan: jadwal.ruangan.nama,
        sumber: jadwal.sumber,
      });

      jadwalPerUser.set(jadwal.guru.userId, list);
    }
  }

  const overallKehadiran = emptyCounts();
  const overallMengajar = emptyCounts();

  let totalExpectedAttendance = 0;

  let totalScheduledTeachingSlots = 0;
  let totalFutureTeachingSlots = 0;
  let totalExpectedTeachingSlots = 0;

  let totalExpectedTeachingMinutes = 0;
  let totalCompletedTeachingMinutes = 0;

  const rekapPegawai = pegawai.map((user) => {
    const attendanceCounts = emptyCounts();

    const detailKehadiran: Array<{
      tanggal: string;
      status: StatusLaporan;
      waktuScan: string | null;
    }> = [];

    for (const tanggal of workingDates) {
      const tanggalKey = dateKey(tanggal);
      const key = `${user.id}:${tanggalKey}`;

      const absensi = berangkatMap.get(key);

      let status: StatusLaporan;

      if (absensi) {
        status = statusFromAbsensi(absensi.status);
      } else {
        status = izinMap.get(key) ?? "BELUM_ABSEN";
      }

      attendanceCounts[status]++;

      detailKehadiran.push({
        tanggal: tanggalKey,
        status,
        waktuScan: absensi ? absensi.waktuScan.toISOString() : null,
      });
    }

    const expectedAttendance = workingDates.length;
    const physicalAttendance =
      attendanceCounts.HADIR + attendanceCounts.TERLAMBAT;

    const recordedAttendance =
      expectedAttendance - attendanceCounts.BELUM_ABSEN;

    combineCounts(overallKehadiran, attendanceCounts);
    totalExpectedAttendance += expectedAttendance;

    const teachingCounts = emptyCounts();
    const schedules = jadwalPerUser.get(user.id) ?? [];

    let futureTeachingSlots = 0;

    let expectedTeachingMinutes = 0;
    let completedTeachingMinutes = 0;

    const detailMengajar: Array<{
      tanggal: string;
      jadwalId: string;
      jamMulai: string;
      jamSelesai: string;
      kelas: string;
      mataPelajaran: string;
      ruangan: string;
      sumber: "INDUK" | "TUKAR";
      status: StatusDetailMengajar;
      jp: number;
    }> = [];

    let jadwalInduk = 0;
    let jadwalTukar = 0;

    for (const jadwal of schedules) {
      const minutes = durationMinutes(jadwal.jamMulai, jadwal.jamSelesai);

      expectedTeachingMinutes += minutes;

      if (jadwal.sumber === "TUKAR") {
        jadwalTukar++;
      } else {
        jadwalInduk++;
      }

      const key = `${user.id}:${jadwal.jadwalId}:${jadwal.tanggalKey}`;

      const absensiMengajar = mengajarMap.get(key);

      let status: StatusLaporan;

      if (absensiMengajar) {
        status = statusFromAbsensi(absensiMengajar.status);
      } else {
        const izin = izinMap.get(`${user.id}:${jadwal.tanggalKey}`);

        if (izin) {
          status = izin;
        } else {
          const absensiHarian = berangkatMap.get(
            `${user.id}:${jadwal.tanggalKey}`,
          );

          if (
            absensiHarian &&
            (absensiHarian.status === StatusAbsensi.IZIN ||
              absensiHarian.status === StatusAbsensi.SAKIT ||
              absensiHarian.status === StatusAbsensi.ALPHA)
          ) {
            status = statusFromAbsensi(absensiHarian.status);
          } else {
            status = "BELUM_ABSEN";
          }
        }
      }

      const belumWaktunya = isTeachingSlotBelumWaktunya({
        tanggalKey: jadwal.tanggalKey,
        jamMulai: jadwal.jamMulai,
        todayKey,
        currentTime,
      });

      const detailStatus: StatusDetailMengajar =
        belumWaktunya && status === "BELUM_ABSEN" ? "BELUM_WAKTUNYA" : status;

      if (belumWaktunya) {
        futureTeachingSlots++;
        expectedTeachingMinutes -= minutes;
      } else {
        teachingCounts[status]++;
      }

      detailMengajar.push({
        tanggal: jadwal.tanggalKey,
        jadwalId: jadwal.jadwalId,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,
        kelas: jadwal.kelas,
        mataPelajaran: jadwal.mataPelajaran,
        ruangan: jadwal.ruangan,
        sumber: jadwal.sumber,
        status: detailStatus,
        jp: JP_PER_PERTEMUAN,
      });

      if (status === "HADIR" || status === "TERLAMBAT") {
        completedTeachingMinutes += minutes;
      }
    }

    const scheduledTeachingSlots = schedules.length;

    const expectedTeachingSlots = scheduledTeachingSlots - futureTeachingSlots;

    const completedTeachingSlots =
      teachingCounts.HADIR + teachingCounts.TERLAMBAT;

    combineCounts(overallMengajar, teachingCounts);

    totalScheduledTeachingSlots += scheduledTeachingSlots;
    totalFutureTeachingSlots += futureTeachingSlots;
    totalExpectedTeachingSlots += expectedTeachingSlots;

    totalExpectedTeachingMinutes += expectedTeachingMinutes;
    totalCompletedTeachingMinutes += completedTeachingMinutes;

    const isGuru = hasRole(user, Role.GURU);
    const isStaff = hasRole(user, Role.STAFF);

    return {
      userId: user.id,
      nama: user.nama,
      nip: user.nip,

      roleUtama: user.role,

      roles: {
        guru: isGuru,
        staff: isStaff,
      },

      kehadiran: {
        hariKerjaSeharusnya: expectedAttendance,

        ...attendanceCounts,

        hadirFisik: physicalAttendance,

        persentaseKehadiranFisik: percentage(
          physicalAttendance,
          expectedAttendance,
        ),

        statusTercatat: recordedAttendance,

        persentaseStatusTercatat: percentage(
          recordedAttendance,
          expectedAttendance,
        ),

        detail: detailKehadiran,
      },

      mengajar: {
        berlaku: isGuru || scheduledTeachingSlots > 0,

        pertemuanTerjadwal: scheduledTeachingSlots,
        jpTerjadwal: scheduledTeachingSlots * JP_PER_PERTEMUAN,

        pertemuanBelumWaktunya: futureTeachingSlots,
        jpBelumWaktunya: futureTeachingSlots * JP_PER_PERTEMUAN,

        pertemuanSeharusnya: expectedTeachingSlots,

        pertemuanTerlaksana: completedTeachingSlots,

        jpSeharusnya: expectedTeachingSlots * JP_PER_PERTEMUAN,
        jpTerlaksana: completedTeachingSlots * JP_PER_PERTEMUAN,

        jpHadir: teachingCounts.HADIR * JP_PER_PERTEMUAN,
        jpTerlambat: teachingCounts.TERLAMBAT * JP_PER_PERTEMUAN,
        jpIzin: teachingCounts.IZIN * JP_PER_PERTEMUAN,
        jpSakit: teachingCounts.SAKIT * JP_PER_PERTEMUAN,
        jpAlpha: teachingCounts.ALPHA * JP_PER_PERTEMUAN,
        jpBelumAbsen: teachingCounts.BELUM_ABSEN * JP_PER_PERTEMUAN,

        jamSeharusnya: round2(expectedTeachingMinutes / 60),

        jamTerlaksana: round2(completedTeachingMinutes / 60),

        durasiSeharusnyaMenit: expectedTeachingMinutes,

        durasiTerlaksanaMenit: completedTeachingMinutes,

        ...teachingCounts,

        persentaseKeterlaksanaanPertemuan: percentage(
          completedTeachingSlots,
          expectedTeachingSlots,
        ),

        persentaseKeterlaksanaanJam: percentage(
          completedTeachingMinutes,
          expectedTeachingMinutes,
        ),

        sumberJadwal: {
          induk: jadwalInduk,
          tukar: jadwalTukar,
        },

        detail: detailMengajar.sort(
          (a, b) =>
            a.tanggal.localeCompare(b.tanggal) ||
            a.jamMulai.localeCompare(b.jamMulai) ||
            a.kelas.localeCompare(b.kelas, "id-ID", {
              numeric: true,
            }),
        ),
      },

      perluPerhatian: {
        kehadiran:
          attendanceCounts.ALPHA > 0 || attendanceCounts.BELUM_ABSEN > 0,

        mengajar: teachingCounts.ALPHA > 0 || teachingCounts.BELUM_ABSEN > 0,

        jumlah: {
          alphaKehadiran: attendanceCounts.ALPHA,

          belumAbsenKehadiran: attendanceCounts.BELUM_ABSEN,

          alphaMengajar: teachingCounts.ALPHA,

          belumAbsenMengajar: teachingCounts.BELUM_ABSEN,
        },

        tanggalKehadiran: detailKehadiran
          .filter(
            (item) => item.status === "ALPHA" || item.status === "BELUM_ABSEN",
          )
          .map((item) => ({
            tanggal: item.tanggal,
            status: item.status,
          })),

        jadwalMengajar: detailMengajar
          .filter(
            (item) => item.status === "ALPHA" || item.status === "BELUM_ABSEN",
          )
          .map((item) => ({
            tanggal: item.tanggal,
            jamMulai: item.jamMulai,
            jamSelesai: item.jamSelesai,
            kelas: item.kelas,
            mataPelajaran: item.mataPelajaran,
            ruangan: item.ruangan,
            sumber: item.sumber,
            status: item.status,
            jp: item.jp,
          })),
      },
    };
  });

  const totalPhysicalAttendance =
    overallKehadiran.HADIR + overallKehadiran.TERLAMBAT;

  const totalRecordedAttendance =
    totalExpectedAttendance - overallKehadiran.BELUM_ABSEN;

  const totalCompletedTeachingSlots =
    overallMengajar.HADIR + overallMengajar.TERLAMBAT;

  const jumlahGuru = pegawai.filter((user) => hasRole(user, Role.GURU)).length;

  const jumlahStaff = pegawai.filter((user) =>
    hasRole(user, Role.STAFF),
  ).length;

  return {
    period: {
      mode: params.periode,

      from: dateKey(from),
      to: dateKey(to),

      effectiveTo: hasEffectivePeriod ? dateKey(effectiveTo) : null,

      today: dateKey(today),

      asOfTimeJakarta: currentTime,

      workWeek: "SENIN_SABTU",

      hariKerjaEfektif: workingDates.length,

      tanggalHariKerja: workingDates.map(dateKey),
    },

    summary: {
      pegawai: {
        total: pegawai.length,
        guru: jumlahGuru,
        staff: jumlahStaff,

        kewajibanKehadiran: totalExpectedAttendance,

        ...overallKehadiran,

        hadirFisik: totalPhysicalAttendance,

        persentaseKehadiranFisik: percentage(
          totalPhysicalAttendance,
          totalExpectedAttendance,
        ),

        statusTercatat: totalRecordedAttendance,

        persentaseStatusTercatat: percentage(
          totalRecordedAttendance,
          totalExpectedAttendance,
        ),

        perluPerhatian: rekapPegawai.filter(
          (item) => item.perluPerhatian.kehadiran,
        ).length,
      },

      mengajar: {
        guruAktif: jumlahGuru,

        guruDenganJadwal: rekapPegawai.filter(
          (item) => item.mengajar.pertemuanTerjadwal > 0,
        ).length,

        pertemuanTerjadwal: totalScheduledTeachingSlots,
        jpTerjadwal: totalScheduledTeachingSlots * JP_PER_PERTEMUAN,

        pertemuanBelumWaktunya: totalFutureTeachingSlots,
        jpBelumWaktunya: totalFutureTeachingSlots * JP_PER_PERTEMUAN,

        pertemuanSeharusnya: totalExpectedTeachingSlots,

        pertemuanTerlaksana: totalCompletedTeachingSlots,

        jpSeharusnya: totalExpectedTeachingSlots * JP_PER_PERTEMUAN,
        jpTerlaksana: totalCompletedTeachingSlots * JP_PER_PERTEMUAN,

        jpHadir: overallMengajar.HADIR * JP_PER_PERTEMUAN,
        jpTerlambat: overallMengajar.TERLAMBAT * JP_PER_PERTEMUAN,
        jpIzin: overallMengajar.IZIN * JP_PER_PERTEMUAN,
        jpSakit: overallMengajar.SAKIT * JP_PER_PERTEMUAN,
        jpAlpha: overallMengajar.ALPHA * JP_PER_PERTEMUAN,
        jpBelumAbsen: overallMengajar.BELUM_ABSEN * JP_PER_PERTEMUAN,

        jamSeharusnya: round2(totalExpectedTeachingMinutes / 60),

        jamTerlaksana: round2(totalCompletedTeachingMinutes / 60),

        durasiSeharusnyaMenit: totalExpectedTeachingMinutes,

        durasiTerlaksanaMenit: totalCompletedTeachingMinutes,

        ...overallMengajar,

        persentaseKeterlaksanaanPertemuan: percentage(
          totalCompletedTeachingSlots,
          totalExpectedTeachingSlots,
        ),

        persentaseKeterlaksanaanJam: percentage(
          totalCompletedTeachingMinutes,
          totalExpectedTeachingMinutes,
        ),

        perluPerhatian: rekapPegawai.filter(
          (item) => item.perluPerhatian.mengajar,
        ).length,
      },
    },

    perluPerhatian: rekapPegawai
      .filter(
        (item) => item.perluPerhatian.kehadiran || item.perluPerhatian.mengajar,
      )
      .map((item) => ({
        userId: item.userId,
        nama: item.nama,
        nip: item.nip,
        roles: item.roles,

        kehadiran: {
          perluPerhatian: item.perluPerhatian.kehadiran,

          alpha: item.kehadiran.ALPHA,

          belumAbsen: item.kehadiran.BELUM_ABSEN,

          tanggal: item.perluPerhatian.tanggalKehadiran,
        },

        mengajar: {
          perluPerhatian: item.perluPerhatian.mengajar,

          alpha: item.mengajar.ALPHA,

          belumAbsen: item.mengajar.BELUM_ABSEN,

          jpBelumAbsen: item.mengajar.jpBelumAbsen,

          jadwal: item.perluPerhatian.jadwalMengajar,
        },
      })),

    pegawai: rekapPegawai,

    holidays: holidays.map((holiday) => ({
      id: holiday.id,
      judul: holiday.judul,
      tipe: holiday.tipe,
      tanggalMulai: dateKey(holiday.tanggalMulai),
      tanggalSelesai: dateKey(holiday.tanggalSelesai),
    })),

    meta: {
      pegawaiBasis: "CURRENT_ACTIVE_GURU_STAFF",

      teachingSource: "JADWAL_EFEKTIF",

      jpPerPertemuan: JP_PER_PERTEMUAN,

      currentDayTeachingPolicy: "BELUM_WAKTUNYA_SEBELUM_JAM_MULAI",

      holidayTypesExcluded: [
        TipeKalender.LIBUR_NASIONAL,
        TipeKalender.LIBUR_SEKOLAH,
      ],

      statuses: STATUS_LIST,

      maxCustomRangeDays: 93,
    },
  };
}
