import {
  HariMinggu,
  JenisIzin,
  Role,
  SumberAbsensi,
  StatusAbsensi,
  StatusIzin,
  TipeAbsensi,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nowJakarta } from "@/lib/time";

class RouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

/**
 * Mengambil YYYY-MM-DD dari input tanggal.
 * Mendukung input date biasa maupun ISO datetime.
 */
function normalizeDateKey(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const key = `${match[1]}-${match[2]}-${match[3]}`;
  const validationDate = new Date(`${key}T12:00:00.000Z`);

  if (
    Number.isNaN(validationDate.getTime()) ||
    validationDate.toISOString().slice(0, 10) !== key
  ) {
    return null;
  }

  return key;
}

/**
 * Semua kolom tanggal harian di database disimpan
 * sebagai UTC pukul 00.00 agar konsisten dengan todayJakarta().
 */
function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function getDateKeysInclusive(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T12:00:00.000Z`);
  const end = new Date(`${endKey}T12:00:00.000Z`);

  const result: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function getHariMinggu(dateKey: string): HariMinggu | null {
  const date = new Date(`${dateKey}T12:00:00.000Z`);

  const hariMap: Record<number, HariMinggu | null> = {
    0: null,
    1: HariMinggu.SENIN,
    2: HariMinggu.SELASA,
    3: HariMinggu.RABU,
    4: HariMinggu.KAMIS,
    5: HariMinggu.JUMAT,
    6: HariMinggu.SABTU,
  };

  return hariMap[date.getUTCDay()] ?? null;
}

function formatTanggalIndonesia(date: Date) {
  return date.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");
    const bulan = searchParams.get("bulan");

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    const isManagement =
      sessionRoles.has(Role.ADMIN) || sessionRoles.has(Role.PIMPINAN);

    const targetUserId = isManagement
      ? requestedUserId || undefined
      : session.user.id;

    let tanggalFilter = {};

    if (bulan) {
      const bulanMatch = bulan.match(/^(\d{4})-(\d{2})$/);

      if (!bulanMatch) {
        return NextResponse.json(
          { error: "Format bulan harus YYYY-MM" },
          { status: 400 },
        );
      }

      const tahun = Number(bulanMatch[1]);
      const nomorBulan = Number(bulanMatch[2]);

      if (nomorBulan < 1 || nomorBulan > 12) {
        return NextResponse.json(
          { error: "Bulan tidak valid" },
          { status: 400 },
        );
      }

      const awalBulanKey = `${tahun}-${String(nomorBulan).padStart(2, "0")}-01`;

      const awalBulanBerikutnyaUtc = new Date(Date.UTC(tahun, nomorBulan, 1));

      const awalBulanBerikutnyaKey = awalBulanBerikutnyaUtc
        .toISOString()
        .slice(0, 10);

      const awalBulan = dateFromKey(awalBulanKey);
      const awalBulanBerikutnya = dateFromKey(awalBulanBerikutnyaKey);

      /**
       * Menampilkan semua izin yang bersinggungan dengan bulan terpilih.
       * Termasuk izin yang dimulai bulan sebelumnya tetapi berakhir bulan ini.
       */
      tanggalFilter = {
        tanggalMulai: {
          lt: awalBulanBerikutnya,
        },
        tanggalAkhir: {
          gte: awalBulan,
        },
      };
    }

    const izin = await prisma.izin.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...tanggalFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
            role: true,
            rolesTambahan: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(izin);
  } catch (error) {
    console.error("GET_IZIN_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    const bolehMengajukan =
      sessionRoles.has(Role.GURU) || sessionRoles.has(Role.STAFF);

    if (!bolehMengajukan) {
      return NextResponse.json(
        {
          error: "Hanya guru dan staff yang dapat mengajukan izin",
        },
        { status: 403 },
      );
    }

    const body: unknown = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Data izin tidak valid" },
        { status: 400 },
      );
    }

    const {
      jenisIzin: rawJenisIzin,
      jenisCustom: rawJenisCustom,
      tanggalMulai: rawTanggalMulai,
      tanggalAkhir: rawTanggalAkhir,
      keterangan: rawKeterangan,
      suratUrl: rawSuratUrl,
    } = body as {
      jenisIzin?: unknown;
      jenisCustom?: unknown;
      tanggalMulai?: unknown;
      tanggalAkhir?: unknown;
      keterangan?: unknown;
      suratUrl?: unknown;
    };

    const jenisIzin =
      typeof rawJenisIzin === "string"
        ? (rawJenisIzin.trim().toUpperCase() as JenisIzin)
        : null;

    const jenisIzinValid =
      jenisIzin !== null && Object.values(JenisIzin).includes(jenisIzin);

    if (!jenisIzinValid) {
      return NextResponse.json(
        { error: "Jenis izin tidak valid" },
        { status: 400 },
      );
    }

    const tanggalMulaiKey = normalizeDateKey(rawTanggalMulai);
    const tanggalAkhirKey = normalizeDateKey(rawTanggalAkhir);

    if (!tanggalMulaiKey || !tanggalAkhirKey) {
      return NextResponse.json(
        { error: "Tanggal mulai dan tanggal akhir wajib diisi" },
        { status: 400 },
      );
    }

    if (tanggalAkhirKey < tanggalMulaiKey) {
      return NextResponse.json(
        { error: "Tanggal akhir tidak boleh sebelum tanggal mulai" },
        { status: 400 },
      );
    }

    const keterangan =
      typeof rawKeterangan === "string" ? rawKeterangan.trim() : "";

    if (!keterangan) {
      return NextResponse.json(
        { error: "Keterangan wajib diisi" },
        { status: 400 },
      );
    }

    const jenisCustom =
      typeof rawJenisCustom === "string" ? rawJenisCustom.trim() : "";

    if (jenisIzin === JenisIzin.LAINNYA && !jenisCustom) {
      return NextResponse.json(
        { error: "Jenis izin lainnya wajib dijelaskan" },
        { status: 400 },
      );
    }

    const suratUrl =
      typeof rawSuratUrl === "string" && rawSuratUrl.trim()
        ? rawSuratUrl.trim()
        : null;

    const tanggalKeys = getDateKeysInclusive(tanggalMulaiKey, tanggalAkhirKey);

    if (tanggalKeys.length > 366) {
      return NextResponse.json(
        { error: "Rentang izin terlalu panjang" },
        { status: 400 },
      );
    }

    const tanggalMulai = dateFromKey(tanggalMulaiKey);
    const tanggalAkhir = dateFromKey(tanggalAkhirKey);

    const statusAbsensi =
      jenisIzin === JenisIzin.SAKIT ? StatusAbsensi.SAKIT : StatusAbsensi.IZIN;

    const result = await prisma.$transaction(async (tx) => {
      /**
       * Mencegah pengajuan izin yang tumpang tindih.
       */
      const izinTumpangTindih = await tx.izin.findFirst({
        where: {
          userId: session.user.id,
          status: StatusIzin.APPROVED,
          tanggalMulai: {
            lte: tanggalAkhir,
          },
          tanggalAkhir: {
            gte: tanggalMulai,
          },
        },
        select: {
          id: true,
          tanggalMulai: true,
          tanggalAkhir: true,
        },
      });

      if (izinTumpangTindih) {
        throw new RouteError(
          409,
          "Sudah ada izin aktif pada rentang tanggal tersebut",
        );
      }

      const tanggalAbsensi = tanggalKeys.map(dateFromKey);

      /**
       * Jangan menimpa absensi QR/manual yang sudah ada.
       */
      const absensiSudahAda = await tx.absensi.findFirst({
        where: {
          userId: session.user.id,
          tanggal: {
            in: tanggalAbsensi,
          },
          tipe: {
            in: [
              TipeAbsensi.BERANGKAT,
              TipeAbsensi.PULANG,
              TipeAbsensi.JAM_MENGAJAR,
            ],
          },
        },
        select: {
          tanggal: true,
          tipe: true,
          status: true,
          sumber: true,
        },
        orderBy: {
          tanggal: "asc",
        },
      });

      if (absensiSudahAda) {
        throw new RouteError(
          409,
          `Absensi tanggal ${formatTanggalIndonesia(
            absensiSudahAda.tanggal,
          )} sudah tercatat sebagai ${absensiSudahAda.status}`,
        );
      }

      const guru = sessionRoles.has(Role.GURU)
        ? await tx.guru.findUnique({
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
            },
          })
        : null;

      const hariDalamRentang = Array.from(
        new Set(
          tanggalKeys
            .map(getHariMinggu)
            .filter((hari): hari is HariMinggu => hari !== null),
        ),
      );

      const jadwalGuru =
        guru && hariDalamRentang.length > 0
          ? await tx.jadwal.findMany({
              where: {
                guruId: guru.id,
                aktif: true,
                hari: {
                  in: hariDalamRentang,
                },
              },
              select: {
                id: true,
                hari: true,
                ruanganId: true,
              },
            })
          : [];

      const izin = await tx.izin.create({
        data: {
          userId: session.user.id,
          jenisIzin,
          jenisCustom: jenisIzin === JenisIzin.LAINNYA ? jenisCustom : null,
          tanggalMulai,
          tanggalAkhir,
          keterangan,
          suratUrl,
          status: StatusIzin.APPROVED,
        },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              nip: true,
              role: true,
              rolesTambahan: true,
            },
          },
        },
      });

      const waktuPencatatan = nowJakarta();

      const dataAbsensi = tanggalKeys.flatMap((tanggalKey) => {
        const tanggal = dateFromKey(tanggalKey);
        const hari = getHariMinggu(tanggalKey);

        const absensiHariIni = [
          {
            userId: session.user.id,
            tipe: TipeAbsensi.BERANGKAT,
            status: statusAbsensi,
            tanggal,
            waktuScan: waktuPencatatan,
            sumber: SumberAbsensi.PERIZINAN,
            izinId: izin.id,
          },
        ];

        if (!guru || !hari) {
          return absensiHariIni;
        }

        const jadwalTanggalIni = jadwalGuru.filter(
          (jadwal) => jadwal.hari === hari,
        );

        return [
          ...absensiHariIni,
          ...jadwalTanggalIni.map((jadwal) => ({
            userId: session.user.id,
            jadwalId: jadwal.id,
            ruanganId: jadwal.ruanganId,
            tipe: TipeAbsensi.JAM_MENGAJAR,
            status: statusAbsensi,
            tanggal,
            waktuScan: waktuPencatatan,
            sumber: SumberAbsensi.PERIZINAN,
            izinId: izin.id,
          })),
        ];
      });

      await tx.absensi.createMany({
        data: dataAbsensi,
      });

      return {
        izin,
        jumlahKehadiranHarian: tanggalKeys.length,
        jumlahJadwalMengajar: dataAbsensi.filter(
          (item) => item.tipe === TipeAbsensi.JAM_MENGAJAR,
        ).length,
      };
    });

    return NextResponse.json(
      {
        ...result.izin,
        sinkronisasi: {
          kehadiranHarian: result.jumlahKehadiranHarian,
          jadwalMengajar: result.jumlahJadwalMengajar,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST_IZIN_ERROR:", error);

    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
