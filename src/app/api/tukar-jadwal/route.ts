import { NextResponse } from "next/server";
import {
  HariMinggu,
  Prisma,
  Role,
  SemesterAkademik,
  StatusAbsensi,
  StatusTukarJadwal,
  TipeAbsensi,
} from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeJakarta, todayJakarta } from "@/lib/time";

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

type CreateTukarJadwalBody = {
  jadwalPengajuId?: string;
  jadwalPenerimaId?: string;
  tanggalJadwalPengaju?: string;
  tanggalJadwalPenerima?: string;
};

const STATUS_TIDAK_MASUK: StatusAbsensi[] = [
  StatusAbsensi.IZIN,
  StatusAbsensi.SAKIT,
  StatusAbsensi.ALPHA,
];

const STATUS_TUKAR_AKTIF: StatusTukarJadwal[] = [
  StatusTukarJadwal.MENUNGGU,
  StatusTukarJadwal.DISETUJUI,
];

const jadwalDetailSelect = {
  id: true,
  guruId: true,
  kelasId: true,
  mataPelajaranId: true,
  ruanganId: true,
  hari: true,
  jamMulai: true,
  jamSelesai: true,
  aktif: true,
  tahunAjaran: true,
  semester: true,

  guru: {
    select: {
      id: true,
      userId: true,

      user: {
        select: {
          id: true,
          nama: true,
          aktif: true,
          role: true,
          rolesTambahan: true,
        },
      },
    },
  },

  kelas: {
    select: {
      id: true,
      nama: true,
    },
  },

  mataPelajaran: {
    select: {
      id: true,
      nama: true,
    },
  },

  ruangan: {
    select: {
      id: true,
      nama: true,
    },
  },
} satisfies Prisma.JadwalSelect;

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

function parseTanggal(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [tahun, bulan, hari] = value.split("-").map(Number);

  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari, 0, 0, 0, 0));

  if (
    tanggal.getUTCFullYear() !== tahun ||
    tanggal.getUTCMonth() !== bulan - 1 ||
    tanggal.getUTCDate() !== hari
  ) {
    return null;
  }

  return tanggal;
}

function formatTanggal(tanggal: Date) {
  return tanggal.toISOString().slice(0, 10);
}

function tanggalSama(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

function getHariMinggu(tanggal: Date): HariMinggu | null {
  const hariMap: Partial<Record<number, HariMinggu>> = {
    1: HariMinggu.SENIN,
    2: HariMinggu.SELASA,
    3: HariMinggu.RABU,
    4: HariMinggu.KAMIS,
    5: HariMinggu.JUMAT,
    6: HariMinggu.SABTU,
  };

  return hariMap[tanggal.getUTCDay()] ?? null;
}

function getPeriodeAkademik(tanggal: Date): {
  tahunAjaran: string;
  semester: SemesterAkademik;
} {
  const tahun = tanggal.getUTCFullYear();
  const bulan = tanggal.getUTCMonth() + 1;

  if (bulan >= 7) {
    return {
      tahunAjaran: `${tahun}/${tahun + 1}`,
      semester: SemesterAkademik.GANJIL,
    };
  }

  return {
    tahunAjaran: `${tahun - 1}/${tahun}`,
    semester: SemesterAkademik.GENAP,
  };
}

function jadwalBertabrakan(
  mulaiA: string,
  selesaiA: string,
  mulaiB: string,
  selesaiB: string,
) {
  return mulaiA < selesaiB && selesaiA > mulaiB;
}

function jadwalSudahDimulai(tanggal: Date, jamMulai: string) {
  const hariIni = todayJakarta();

  if (!tanggalSama(tanggal, hariIni)) {
    return false;
  }

  return jamMulai <= timeJakarta();
}

function userMemilikiRoleGuru(user: { role: Role; rolesTambahan: Role[] }) {
  return user.role === Role.GURU || user.rolesTambahan.includes(Role.GURU);
}

function validasiTanggalJadwal(
  tanggal: Date,
  jadwal: {
    hari: HariMinggu;
    tahunAjaran: string;
    semester: SemesterAkademik;
  },
) {
  const hari = getHariMinggu(tanggal);

  if (!hari) {
    return "Pertukaran jadwal tidak dapat dilakukan pada hari Minggu";
  }

  if (jadwal.hari !== hari) {
    return `Tanggal yang dipilih tidak sesuai dengan hari jadwal ${jadwal.hari}`;
  }

  const periode = getPeriodeAkademik(tanggal);

  if (
    jadwal.tahunAjaran !== periode.tahunAjaran ||
    jadwal.semester !== periode.semester
  ) {
    return "Jadwal tidak berada pada periode akademik tanggal yang dipilih";
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    const isGuru = sessionRoles.has(Role.GURU);

    const isManagement =
      sessionRoles.has(Role.ADMIN) || sessionRoles.has(Role.PIMPINAN);

    if (!isGuru && !isManagement) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses ke informasi tukar jadwal",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status");
    const arah = searchParams.get("arah") ?? "semua";

    let status: StatusTukarJadwal | undefined;

    if (statusParam) {
      if (
        !Object.values(StatusTukarJadwal).includes(
          statusParam as StatusTukarJadwal,
        )
      ) {
        return NextResponse.json(
          { error: "Status tukar jadwal tidak valid" },
          { status: 400 },
        );
      }

      status = statusParam as StatusTukarJadwal;
    }

    if (!["semua", "masuk", "keluar"].includes(arah)) {
      return NextResponse.json(
        {
          error: "Parameter arah harus semua, masuk, atau keluar",
        },
        { status: 400 },
      );
    }

    const where: Prisma.TukarJadwalWhereInput = {
      ...(status
        ? {
            status,
          }
        : {}),
    };

    /*
     * ADMIN dan PIMPINAN melihat seluruh pertukaran.
     * Guru hanya melihat pengajuan yang melibatkan dirinya.
     */
    if (!isManagement) {
      if (arah === "masuk") {
        where.penerimaId = session.user.id;
      } else if (arah === "keluar") {
        where.pengajuId = session.user.id;
      } else {
        where.OR = [
          {
            pengajuId: session.user.id,
          },
          {
            penerimaId: session.user.id,
          },
        ];
      }
    }

    const pengajuan = await prisma.tukarJadwal.findMany({
      where,

      select: {
        id: true,
        status: true,

        tanggalJadwalPengaju: true,
        tanggalJadwalPenerima: true,

        ditanggapiAt: true,
        dibatalkanAt: true,
        createdAt: true,
        updatedAt: true,

        pengaju: {
          select: {
            id: true,
            nama: true,
          },
        },

        penerima: {
          select: {
            id: true,
            nama: true,
          },
        },

        jadwalPengaju: {
          select: jadwalDetailSelect,
        },

        jadwalPenerima: {
          select: jadwalDetailSelect,
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    const hariIni = todayJakarta();

    const result = pengajuan.map((item) => {
      const sebagaiPengaju = item.pengaju.id === session.user.id;

      const sebagaiPenerima = item.penerima.id === session.user.id;

      return {
        id: item.id,
        status: item.status,

        peranSaya: sebagaiPengaju
          ? "PENGAJU"
          : sebagaiPenerima
            ? "PENERIMA"
            : "PENGAMAT",

        dapatDitanggapi:
          sebagaiPenerima && item.status === StatusTukarJadwal.MENUNGGU,

        dapatDibatalkan:
          sebagaiPengaju && item.status === StatusTukarJadwal.MENUNGGU,

        sudahLewat:
          item.tanggalJadwalPengaju.getTime() < hariIni.getTime() &&
          item.tanggalJadwalPenerima.getTime() < hariIni.getTime(),

        pengaju: item.pengaju,
        penerima: item.penerima,

        jadwalPengaju: {
          id: item.jadwalPengaju.id,
          tanggal: formatTanggal(item.tanggalJadwalPengaju),
          hari: item.jadwalPengaju.hari,
          jamMulai: item.jadwalPengaju.jamMulai,
          jamSelesai: item.jadwalPengaju.jamSelesai,
          mapel: item.jadwalPengaju.mataPelajaran.nama,
          kelas: item.jadwalPengaju.kelas.nama,
          ruangan: item.jadwalPengaju.ruangan.nama,
        },

        jadwalPenerima: {
          id: item.jadwalPenerima.id,
          tanggal: formatTanggal(item.tanggalJadwalPenerima),
          hari: item.jadwalPenerima.hari,
          jamMulai: item.jadwalPenerima.jamMulai,
          jamSelesai: item.jadwalPenerima.jamSelesai,
          mapel: item.jadwalPenerima.mataPelajaran.nama,
          kelas: item.jadwalPenerima.kelas.nama,
          ruangan: item.jadwalPenerima.ruangan.nama,
        },

        ditanggapiAt: item.ditanggapiAt,
        dibatalkanAt: item.dibatalkanAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("TUKAR_JADWAL_GET_ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat mengambil data tukar jadwal",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    if (!sessionRoles.has(Role.GURU)) {
      return NextResponse.json(
        {
          error: "Hanya guru yang dapat mengajukan tukar jadwal",
        },
        { status: 403 },
      );
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Data pengajuan tidak valid" },
        { status: 400 },
      );
    }

    const {
      jadwalPengajuId,
      jadwalPenerimaId,
      tanggalJadwalPengaju,
      tanggalJadwalPenerima,
    } = body as CreateTukarJadwalBody;

    if (
      !jadwalPengajuId?.trim() ||
      !jadwalPenerimaId?.trim() ||
      !tanggalJadwalPengaju ||
      !tanggalJadwalPenerima
    ) {
      return NextResponse.json(
        {
          error: "Jadwal dan tanggal pertukaran wajib diisi",
        },
        { status: 400 },
      );
    }

    if (jadwalPengajuId === jadwalPenerimaId) {
      return NextResponse.json(
        {
          error: "Jadwal pengaju dan penerima tidak boleh sama",
        },
        { status: 400 },
      );
    }

    const tanggalPengaju = parseTanggal(tanggalJadwalPengaju);

    const tanggalPenerima = parseTanggal(tanggalJadwalPenerima);

    if (!tanggalPengaju || !tanggalPenerima) {
      return NextResponse.json(
        {
          error: "Format tanggal tidak valid. Gunakan YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    const hariIni = todayJakarta();

    if (
      tanggalPengaju.getTime() < hariIni.getTime() ||
      tanggalPenerima.getTime() < hariIni.getTime()
    ) {
      return NextResponse.json(
        {
          error: "Tanggal pertukaran tidak boleh berada di masa lalu",
        },
        { status: 400 },
      );
    }

    const hasil = await prisma.$transaction(async (tx) => {
      const [jadwalPengaju, jadwalPenerima] = await Promise.all([
        tx.jadwal.findFirst({
          where: {
            id: jadwalPengajuId,
            aktif: true,
          },
          select: jadwalDetailSelect,
        }),

        tx.jadwal.findFirst({
          where: {
            id: jadwalPenerimaId,
            aktif: true,
          },
          select: jadwalDetailSelect,
        }),
      ]);

      if (!jadwalPengaju) {
        throw new Error("JADWAL_PENGAJU_TIDAK_DITEMUKAN");
      }

      if (!jadwalPenerima) {
        throw new Error("JADWAL_PENERIMA_TIDAK_DITEMUKAN");
      }

      if (jadwalPengaju.guru.userId !== session.user.id) {
        throw new Error("JADWAL_PENGAJU_BUKAN_MILIK_SENDIRI");
      }

      if (jadwalPenerima.guru.userId === session.user.id) {
        throw new Error("JADWAL_PENERIMA_MILIK_SENDIRI");
      }

      if (!jadwalPengaju.guru.user.aktif || !jadwalPenerima.guru.user.aktif) {
        throw new Error("GURU_TIDAK_AKTIF");
      }

      if (!userMemilikiRoleGuru(jadwalPenerima.guru.user)) {
        throw new Error("PENERIMA_BUKAN_GURU");
      }

      const errorTanggalPengaju = validasiTanggalJadwal(
        tanggalPengaju,
        jadwalPengaju,
      );

      if (errorTanggalPengaju) {
        throw new Error(`VALIDASI:${errorTanggalPengaju}`);
      }

      const errorTanggalPenerima = validasiTanggalJadwal(
        tanggalPenerima,
        jadwalPenerima,
      );

      if (errorTanggalPenerima) {
        throw new Error(`VALIDASI:${errorTanggalPenerima}`);
      }

      if (
        jadwalSudahDimulai(tanggalPengaju, jadwalPengaju.jamMulai) ||
        jadwalSudahDimulai(tanggalPenerima, jadwalPenerima.jamMulai)
      ) {
        throw new Error("SALAH_SATU_JADWAL_SUDAH_DIMULAI");
      }

      if (
        tanggalSama(tanggalPengaju, tanggalPenerima) &&
        jadwalPengaju.jamMulai === jadwalPenerima.jamMulai &&
        jadwalPengaju.jamSelesai === jadwalPenerima.jamSelesai
      ) {
        throw new Error("SLOT_JADWAL_SAMA");
      }

      const [absensiMengajar, absensiTidakMasuk, tukarAktif] =
        await Promise.all([
          tx.absensi.findFirst({
            where: {
              OR: [
                {
                  userId: session.user.id,
                  tanggal: tanggalPengaju,
                  tipe: TipeAbsensi.JAM_MENGAJAR,
                  jadwalId: jadwalPengaju.id,
                },
                {
                  userId: jadwalPenerima.guru.userId,
                  tanggal: tanggalPenerima,
                  tipe: TipeAbsensi.JAM_MENGAJAR,
                  jadwalId: jadwalPenerima.id,
                },
              ],
            },

            select: {
              id: true,
            },
          }),

          tx.absensi.findFirst({
            where: {
              tipe: TipeAbsensi.BERANGKAT,
              status: {
                in: STATUS_TIDAK_MASUK,
              },

              OR: [
                {
                  // Pengaju akan mengajar pada tanggal jadwal penerima
                  userId: session.user.id,
                  tanggal: tanggalPenerima,
                },
                {
                  // Penerima akan mengajar pada tanggal jadwal pengaju
                  userId: jadwalPenerima.guru.userId,
                  tanggal: tanggalPengaju,
                },
              ],
            },

            select: {
              userId: true,
              status: true,
            },
          }),

          tx.tukarJadwal.findFirst({
            where: {
              status: {
                in: STATUS_TUKAR_AKTIF,
              },

              OR: [
                {
                  jadwalPengajuId: jadwalPengaju.id,
                  tanggalJadwalPengaju: tanggalPengaju,
                },
                {
                  jadwalPenerimaId: jadwalPengaju.id,
                  tanggalJadwalPenerima: tanggalPengaju,
                },
                {
                  jadwalPengajuId: jadwalPenerima.id,
                  tanggalJadwalPengaju: tanggalPenerima,
                },
                {
                  jadwalPenerimaId: jadwalPenerima.id,
                  tanggalJadwalPenerima: tanggalPenerima,
                },
              ],
            },

            select: {
              id: true,
            },
          }),
        ]);

      if (absensiMengajar) {
        throw new Error("ABSENSI_MENGAJAR_SUDAH_TERCATAT");
      }

      if (absensiTidakMasuk) {
        throw new Error(`GURU_TIDAK_MASUK:${absensiTidakMasuk.status}`);
      }

      if (tukarAktif) {
        throw new Error("JADWAL_SUDAH_TERLIBAT_TUKAR");
      }

      const hariPengaju = getHariMinggu(tanggalPengaju);

      const hariPenerima = getHariMinggu(tanggalPenerima);

      if (!hariPengaju || !hariPenerima) {
        throw new Error("PERTUKARAN_HARI_MINGGU");
      }

      const periodePengaju = getPeriodeAkademik(tanggalPengaju);

      const periodePenerima = getPeriodeAkademik(tanggalPenerima);

      const [semuaJadwalTanggalPengaju, semuaJadwalTanggalPenerima] =
        await Promise.all([
          tx.jadwal.findMany({
            where: {
              aktif: true,
              hari: hariPengaju,
              tahunAjaran: periodePengaju.tahunAjaran,
              semester: periodePengaju.semester,
            },

            select: jadwalDetailSelect,
          }),

          tx.jadwal.findMany({
            where: {
              aktif: true,
              hari: hariPenerima,
              tahunAjaran: periodePenerima.tahunAjaran,
              semester: periodePenerima.semester,
            },

            select: jadwalDetailSelect,
          }),
        ]);

      const jadwalYangDitukar = new Set([jadwalPengaju.id, jadwalPenerima.id]);

      const pengajuBentrokDiSlotPenerima = semuaJadwalTanggalPenerima.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.guru.userId === session.user.id &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            jadwalPenerima.jamMulai,
            jadwalPenerima.jamSelesai,
          ),
      );

      if (pengajuBentrokDiSlotPenerima) {
        throw new Error("PENGAJU_BENTROK_DI_SLOT_BARU");
      }

      const penerimaBentrokDiSlotPengaju = semuaJadwalTanggalPengaju.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.guru.userId === jadwalPenerima.guru.userId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            jadwalPengaju.jamMulai,
            jadwalPengaju.jamSelesai,
          ),
      );

      if (penerimaBentrokDiSlotPengaju) {
        throw new Error("PENERIMA_BENTROK_DI_SLOT_BARU");
      }

      const kelasPengajuBentrok = semuaJadwalTanggalPenerima.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.kelasId === jadwalPengaju.kelasId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            jadwalPenerima.jamMulai,
            jadwalPenerima.jamSelesai,
          ),
      );

      if (kelasPengajuBentrok) {
        throw new Error("KELAS_PENGAJU_BENTROK");
      }

      const kelasPenerimaBentrok = semuaJadwalTanggalPengaju.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.kelasId === jadwalPenerima.kelasId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            jadwalPengaju.jamMulai,
            jadwalPengaju.jamSelesai,
          ),
      );

      if (kelasPenerimaBentrok) {
        throw new Error("KELAS_PENERIMA_BENTROK");
      }

      const ruanganPengajuBentrok = semuaJadwalTanggalPenerima.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.ruanganId === jadwalPengaju.ruanganId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            jadwalPenerima.jamMulai,
            jadwalPenerima.jamSelesai,
          ),
      );

      if (ruanganPengajuBentrok) {
        throw new Error("RUANGAN_PENGAJU_BENTROK");
      }

      const ruanganPenerimaBentrok = semuaJadwalTanggalPengaju.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.ruanganId === jadwalPenerima.ruanganId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            jadwalPengaju.jamMulai,
            jadwalPengaju.jamSelesai,
          ),
      );

      if (ruanganPenerimaBentrok) {
        throw new Error("RUANGAN_PENERIMA_BENTROK");
      }

      return tx.tukarJadwal.create({
        data: {
          pengajuId: session.user.id,
          penerimaId: jadwalPenerima.guru.userId,

          jadwalPengajuId: jadwalPengaju.id,

          jadwalPenerimaId: jadwalPenerima.id,

          tanggalJadwalPengaju: tanggalPengaju,

          tanggalJadwalPenerima: tanggalPenerima,

          status: StatusTukarJadwal.MENUNGGU,
        },

        select: {
          id: true,
          status: true,
          tanggalJadwalPengaju: true,
          tanggalJadwalPenerima: true,
          createdAt: true,

          pengaju: {
            select: {
              id: true,
              nama: true,
            },
          },

          penerima: {
            select: {
              id: true,
              nama: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "Pengajuan tukar jadwal berhasil dikirim",

        data: {
          ...hasil,

          tanggalJadwalPengaju: formatTanggal(hasil.tanggalJadwalPengaju),

          tanggalJadwalPenerima: formatTanggal(hasil.tanggalJadwalPenerima),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("TUKAR_JADWAL_POST_ERROR:", error);

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    const errorMap: Record<
      string,
      {
        status: number;
        message: string;
      }
    > = {
      JADWAL_PENGAJU_TIDAK_DITEMUKAN: {
        status: 404,
        message: "Jadwal yang ingin ditukar tidak ditemukan",
      },

      JADWAL_PENERIMA_TIDAK_DITEMUKAN: {
        status: 404,
        message: "Jadwal guru tujuan tidak ditemukan",
      },

      JADWAL_PENGAJU_BUKAN_MILIK_SENDIRI: {
        status: 403,
        message: "Anda hanya dapat menukar jadwal milik sendiri",
      },

      JADWAL_PENERIMA_MILIK_SENDIRI: {
        status: 400,
        message: "Jadwal tujuan harus dimiliki guru lain",
      },

      GURU_TIDAK_AKTIF: {
        status: 409,
        message: "Salah satu guru sudah tidak aktif",
      },

      PENERIMA_BUKAN_GURU: {
        status: 409,
        message: "Pemilik jadwal tujuan bukan guru aktif",
      },

      SALAH_SATU_JADWAL_SUDAH_DIMULAI: {
        status: 409,
        message: "Salah satu jam mengajar sudah dimulai atau sudah lewat",
      },

      SLOT_JADWAL_SAMA: {
        status: 400,
        message: "Kedua jadwal berada pada slot waktu yang sama",
      },

      ABSENSI_MENGAJAR_SUDAH_TERCATAT: {
        status: 409,
        message: "Salah satu absensi jam mengajar sudah tercatat",
      },

      JADWAL_SUDAH_TERLIBAT_TUKAR: {
        status: 409,
        message: "Salah satu jadwal sedang terlibat pertukaran aktif",
      },

      PERTUKARAN_HARI_MINGGU: {
        status: 400,
        message: "Pertukaran jadwal tidak dapat dilakukan pada hari Minggu",
      },

      PENGAJU_BENTROK_DI_SLOT_BARU: {
        status: 409,
        message: "Anda memiliki jadwal lain pada slot tujuan",
      },

      PENERIMA_BENTROK_DI_SLOT_BARU: {
        status: 409,
        message: "Guru penerima memiliki jadwal lain pada slot tujuan",
      },

      KELAS_PENGAJU_BENTROK: {
        status: 409,
        message: "Kelas milik pengaju memiliki jadwal lain pada slot tujuan",
      },

      KELAS_PENERIMA_BENTROK: {
        status: 409,
        message: "Kelas milik penerima memiliki jadwal lain pada slot tujuan",
      },

      RUANGAN_PENGAJU_BENTROK: {
        status: 409,
        message: "Ruangan pengaju digunakan pada slot tujuan",
      },

      RUANGAN_PENERIMA_BENTROK: {
        status: 409,
        message: "Ruangan penerima digunakan pada slot tujuan",
      },
    };

    if (message.startsWith("VALIDASI:")) {
      return NextResponse.json(
        {
          error: message.replace("VALIDASI:", ""),
        },
        { status: 400 },
      );
    }

    if (message.startsWith("GURU_TIDAK_MASUK:")) {
      const statusKehadiran = message.replace("GURU_TIDAK_MASUK:", "");

      return NextResponse.json(
        {
          error: `Pertukaran tidak dapat diajukan karena status salah satu guru tercatat ${statusKehadiran}`,
        },
        { status: 409 },
      );
    }

    const mappedError = errorMap[message];

    if (mappedError) {
      return NextResponse.json(
        {
          error: mappedError.message,
        },
        {
          status: mappedError.status,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat membuat pengajuan tukar jadwal",
      },
      { status: 500 },
    );
  }
}
