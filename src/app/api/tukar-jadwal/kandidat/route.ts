import { NextResponse } from "next/server";
import {
  HariMinggu,
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

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

function parseTanggal(value: string | null) {
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

function formatTanggalKey(tanggal: Date) {
  return tanggal.toISOString().slice(0, 10);
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

function tanggalSama(a: Date, b: Date) {
  return a.getTime() === b.getTime();
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

function getJadwalTerlibatTukar<
  T extends {
    jadwalPengajuId: string;
    jadwalPenerimaId: string;
    tanggalJadwalPengaju: Date;
    tanggalJadwalPenerima: Date;
  },
>(data: T[], tanggal: Date) {
  const jadwalIds = new Set<string>();

  for (const item of data) {
    if (tanggalSama(item.tanggalJadwalPengaju, tanggal)) {
      jadwalIds.add(item.jadwalPengajuId);
    }

    if (tanggalSama(item.tanggalJadwalPenerima, tanggal)) {
      jadwalIds.add(item.jadwalPenerimaId);
    }
  }

  return jadwalIds;
}

const STATUS_TIDAK_MASUK: StatusAbsensi[] = [
  StatusAbsensi.IZIN,
  StatusAbsensi.SAKIT,
  StatusAbsensi.ALPHA,
];

const STATUS_TUKAR_AKTIF: StatusTukarJadwal[] = [
  StatusTukarJadwal.MENUNGGU,
  StatusTukarJadwal.DISETUJUI,
];

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    if (!sessionRoles.has(Role.GURU)) {
      return NextResponse.json(
        {
          error: "Hanya guru yang dapat mengajukan pertukaran jadwal",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);

    const tanggalPengajuParam = searchParams.get("tanggalPengaju");

    const tanggalPenerimaParam =
      searchParams.get("tanggalPenerima") ?? tanggalPengajuParam;

    const jadwalPengajuId = searchParams.get("jadwalPengajuId")?.trim() || null;

    const tanggalPengaju = parseTanggal(tanggalPengajuParam);

    const tanggalPenerima = parseTanggal(tanggalPenerimaParam);

    if (!tanggalPengaju || !tanggalPenerima) {
      return NextResponse.json(
        {
          error: "Format tanggal tidak valid. Gunakan YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    const hariPengaju = getHariMinggu(tanggalPengaju);
    const hariPenerima = getHariMinggu(tanggalPenerima);

    if (!hariPengaju || !hariPenerima) {
      return NextResponse.json(
        {
          error: "Pertukaran jadwal tidak dapat dilakukan pada hari Minggu",
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

    const guruSaya = await prisma.guru.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!guruSaya) {
      return NextResponse.json(
        {
          error: "Profil guru tidak ditemukan untuk akun ini",
        },
        { status: 404 },
      );
    }

    const periodePengaju = getPeriodeAkademik(tanggalPengaju);

    const periodePenerima = getPeriodeAkademik(tanggalPenerima);

    const selectJadwal = {
      id: true,
      guruId: true,
      kelasId: true,
      mataPelajaranId: true,
      ruanganId: true,
      hari: true,
      jamMulai: true,
      jamSelesai: true,

      guru: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              nama: true,
              aktif: true,
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
    } as const;

    const [semuaJadwalTanggalPengaju, semuaJadwalTanggalPenerima] =
      await prisma.$transaction([
        prisma.jadwal.findMany({
          where: {
            aktif: true,
            hari: hariPengaju,
            tahunAjaran: periodePengaju.tahunAjaran,
            semester: periodePengaju.semester,
          },
          select: selectJadwal,
          orderBy: [
            {
              jamMulai: "asc",
            },
            {
              guru: {
                user: {
                  nama: "asc",
                },
              },
            },
          ],
        }),

        prisma.jadwal.findMany({
          where: {
            aktif: true,
            hari: hariPenerima,
            tahunAjaran: periodePenerima.tahunAjaran,
            semester: periodePenerima.semester,
          },
          select: selectJadwal,
          orderBy: [
            {
              jamMulai: "asc",
            },
            {
              guru: {
                user: {
                  nama: "asc",
                },
              },
            },
          ],
        }),
      ]);

    const jadwalSayaRaw = semuaJadwalTanggalPengaju.filter(
      (jadwal) =>
        jadwal.guru.userId === session.user.id && jadwal.guru.user.aktif,
    );

    const jadwalSayaIds = jadwalSayaRaw.map((jadwal) => jadwal.id);

    const [absensiMengajarSaya, absensiBerangkatSaya, tukarAktifSaya] =
      await prisma.$transaction([
        jadwalSayaIds.length > 0
          ? prisma.absensi.findMany({
              where: {
                userId: session.user.id,
                tanggal: tanggalPengaju,
                tipe: TipeAbsensi.JAM_MENGAJAR,
                jadwalId: {
                  in: jadwalSayaIds,
                },
              },
              select: {
                jadwalId: true,
                status: true,
              },
            })
          : prisma.absensi.findMany({
              where: {
                id: "__tidak_ada__",
              },
              select: {
                jadwalId: true,
                status: true,
              },
            }),

        prisma.absensi.findFirst({
          where: {
            userId: session.user.id,
            // Pengaju nantinya mengajar pada tanggal milik penerima
            tanggal: tanggalPenerima,
            tipe: TipeAbsensi.BERANGKAT,
            status: {
              in: STATUS_TIDAK_MASUK,
            },
          },
          select: {
            status: true,
          },
        }),

        jadwalSayaIds.length > 0
          ? prisma.tukarJadwal.findMany({
              where: {
                status: {
                  in: STATUS_TUKAR_AKTIF,
                },
                OR: [
                  {
                    jadwalPengajuId: {
                      in: jadwalSayaIds,
                    },
                    tanggalJadwalPengaju: tanggalPengaju,
                  },
                  {
                    jadwalPenerimaId: {
                      in: jadwalSayaIds,
                    },
                    tanggalJadwalPenerima: tanggalPengaju,
                  },
                ],
              },
              select: {
                jadwalPengajuId: true,
                jadwalPenerimaId: true,
                tanggalJadwalPengaju: true,
                tanggalJadwalPenerima: true,
              },
            })
          : prisma.tukarJadwal.findMany({
              where: {
                id: "__tidak_ada__",
              },
              select: {
                jadwalPengajuId: true,
                jadwalPenerimaId: true,
                tanggalJadwalPengaju: true,
                tanggalJadwalPenerima: true,
              },
            }),
      ]);

    const jadwalSudahDiabsen = new Set(
      absensiMengajarSaya
        .map((absensi) => absensi.jadwalId)
        .filter((id): id is string => typeof id === "string"),
    );

    const jadwalTerlibatTukar = getJadwalTerlibatTukar(
      tukarAktifSaya,
      tanggalPengaju,
    );

    const jadwalSaya = jadwalSayaRaw.map((jadwal) => {
      const alasanTidakTersedia: string[] = [];

      if (jadwalSudahDimulai(tanggalPengaju, jadwal.jamMulai)) {
        alasanTidakTersedia.push("Jam mengajar sudah dimulai atau sudah lewat");
      }

      if (jadwalSudahDiabsen.has(jadwal.id)) {
        alasanTidakTersedia.push("Absensi jam mengajar sudah tercatat");
      }

      if (jadwalTerlibatTukar.has(jadwal.id)) {
        alasanTidakTersedia.push("Jadwal sedang terlibat pengajuan tukar");
      }

      if (absensiBerangkatSaya) {
        alasanTidakTersedia.push(
          `Status kehadiran Anda tercatat ${absensiBerangkatSaya.status}`,
        );
      }

      return {
        id: jadwal.id,
        tanggal: formatTanggalKey(tanggalPengaju),
        hari: jadwal.hari,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,

        mapel: jadwal.mataPelajaran.nama,
        kelas: jadwal.kelas.nama,
        ruangan: jadwal.ruangan.nama,

        dapatDitukar: alasanTidakTersedia.length === 0,

        alasanTidakTersedia,
      };
    });

    if (!jadwalPengajuId) {
      return NextResponse.json({
        tanggalPengaju: formatTanggalKey(tanggalPengaju),

        tanggalPenerima: formatTanggalKey(tanggalPenerima),

        periodePengaju,
        periodePenerima,

        jadwalSaya,
        kandidat: [],
      });
    }

    const jadwalPengaju = jadwalSayaRaw.find(
      (jadwal) => jadwal.id === jadwalPengajuId,
    );

    if (!jadwalPengaju) {
      return NextResponse.json(
        {
          error:
            "Jadwal yang dipilih bukan jadwal milik Anda pada tanggal tersebut",
        },
        { status: 404 },
      );
    }

    const informasiJadwalPengaju = jadwalSaya.find(
      (jadwal) => jadwal.id === jadwalPengajuId,
    );

    if (!informasiJadwalPengaju?.dapatDitukar) {
      return NextResponse.json(
        {
          error:
            informasiJadwalPengaju?.alasanTidakTersedia[0] ??
            "Jadwal tidak dapat ditukar",

          jadwalSaya,
          kandidat: [],
        },
        { status: 409 },
      );
    }

    const kandidatRaw = semuaJadwalTanggalPenerima.filter(
      (jadwal) =>
        jadwal.guru.userId !== session.user.id && jadwal.guru.user.aktif,
    );

    const kandidatIds = kandidatRaw.map((jadwal) => jadwal.id);

    const kandidatUserIds = Array.from(
      new Set(kandidatRaw.map((jadwal) => jadwal.guru.userId)),
    );

    const [
      absensiMengajarKandidat,
      absensiBerangkatKandidat,
      tukarAktifKandidat,
    ] = await prisma.$transaction([
      kandidatIds.length > 0
        ? prisma.absensi.findMany({
            where: {
              tanggal: tanggalPenerima,
              tipe: TipeAbsensi.JAM_MENGAJAR,
              jadwalId: {
                in: kandidatIds,
              },
            },
            select: {
              userId: true,
              jadwalId: true,
              status: true,
            },
          })
        : prisma.absensi.findMany({
            where: {
              id: "__tidak_ada__",
            },
            select: {
              userId: true,
              jadwalId: true,
              status: true,
            },
          }),

      kandidatUserIds.length > 0
        ? prisma.absensi.findMany({
            where: {
              userId: {
                in: kandidatUserIds,
              },
              tanggal: tanggalPengaju,
              tipe: TipeAbsensi.BERANGKAT,
              status: {
                in: STATUS_TIDAK_MASUK,
              },
            },
            select: {
              userId: true,
              status: true,
            },
          })
        : prisma.absensi.findMany({
            where: {
              id: "__tidak_ada__",
            },
            select: {
              userId: true,
              status: true,
            },
          }),

      kandidatIds.length > 0
        ? prisma.tukarJadwal.findMany({
            where: {
              status: {
                in: STATUS_TUKAR_AKTIF,
              },
              OR: [
                {
                  jadwalPengajuId: {
                    in: kandidatIds,
                  },
                  tanggalJadwalPengaju: tanggalPenerima,
                },
                {
                  jadwalPenerimaId: {
                    in: kandidatIds,
                  },
                  tanggalJadwalPenerima: tanggalPenerima,
                },
              ],
            },
            select: {
              jadwalPengajuId: true,
              jadwalPenerimaId: true,
              tanggalJadwalPengaju: true,
              tanggalJadwalPenerima: true,
            },
          })
        : prisma.tukarJadwal.findMany({
            where: {
              id: "__tidak_ada__",
            },
            select: {
              jadwalPengajuId: true,
              jadwalPenerimaId: true,
              tanggalJadwalPengaju: true,
              tanggalJadwalPenerima: true,
            },
          }),
    ]);

    const kandidatSudahDiabsen = new Set(
      absensiMengajarKandidat.map(
        (absensi) => `${absensi.userId}:${absensi.jadwalId}`,
      ),
    );

    const statusTidakMasukByUser = new Map(
      absensiBerangkatKandidat.map((absensi) => [
        absensi.userId,
        absensi.status,
      ]),
    );

    const kandidatTerlibatTukar = getJadwalTerlibatTukar(
      tukarAktifKandidat,
      tanggalPenerima,
    );

    const kandidat = kandidatRaw
      .filter((jadwalKandidat) => {
        if (jadwalSudahDimulai(tanggalPenerima, jadwalKandidat.jamMulai)) {
          return false;
        }

        if (
          kandidatSudahDiabsen.has(
            `${jadwalKandidat.guru.userId}:${jadwalKandidat.id}`,
          )
        ) {
          return false;
        }

        if (kandidatTerlibatTukar.has(jadwalKandidat.id)) {
          return false;
        }

        if (statusTidakMasukByUser.has(jadwalKandidat.guru.userId)) {
          return false;
        }

        if (
          tanggalSama(tanggalPengaju, tanggalPenerima) &&
          jadwalPengaju.jamMulai === jadwalKandidat.jamMulai &&
          jadwalPengaju.jamSelesai === jadwalKandidat.jamSelesai
        ) {
          return false;
        }

        const idsYangDitukar = new Set([jadwalPengaju.id, jadwalKandidat.id]);

        const pengajuBentrokDiSlotBaru = semuaJadwalTanggalPenerima.some(
          (jadwalLain) =>
            !idsYangDitukar.has(jadwalLain.id) &&
            jadwalLain.guru.userId === session.user.id &&
            jadwalBertabrakan(
              jadwalLain.jamMulai,
              jadwalLain.jamSelesai,
              jadwalKandidat.jamMulai,
              jadwalKandidat.jamSelesai,
            ),
        );

        if (pengajuBentrokDiSlotBaru) {
          return false;
        }

        const penerimaBentrokDiSlotBaru = semuaJadwalTanggalPengaju.some(
          (jadwalLain) =>
            !idsYangDitukar.has(jadwalLain.id) &&
            jadwalLain.guru.userId === jadwalKandidat.guru.userId &&
            jadwalBertabrakan(
              jadwalLain.jamMulai,
              jadwalLain.jamSelesai,
              jadwalPengaju.jamMulai,
              jadwalPengaju.jamSelesai,
            ),
        );

        if (penerimaBentrokDiSlotBaru) {
          return false;
        }

        const kelasPengajuBentrok = semuaJadwalTanggalPenerima.some(
          (jadwalLain) =>
            !idsYangDitukar.has(jadwalLain.id) &&
            jadwalLain.kelasId === jadwalPengaju.kelasId &&
            jadwalBertabrakan(
              jadwalLain.jamMulai,
              jadwalLain.jamSelesai,
              jadwalKandidat.jamMulai,
              jadwalKandidat.jamSelesai,
            ),
        );

        if (kelasPengajuBentrok) {
          return false;
        }

        const kelasPenerimaBentrok = semuaJadwalTanggalPengaju.some(
          (jadwalLain) =>
            !idsYangDitukar.has(jadwalLain.id) &&
            jadwalLain.kelasId === jadwalKandidat.kelasId &&
            jadwalBertabrakan(
              jadwalLain.jamMulai,
              jadwalLain.jamSelesai,
              jadwalPengaju.jamMulai,
              jadwalPengaju.jamSelesai,
            ),
        );

        if (kelasPenerimaBentrok) {
          return false;
        }

        const ruanganPengajuBentrok = semuaJadwalTanggalPenerima.some(
          (jadwalLain) =>
            !idsYangDitukar.has(jadwalLain.id) &&
            jadwalLain.ruanganId === jadwalPengaju.ruanganId &&
            jadwalBertabrakan(
              jadwalLain.jamMulai,
              jadwalLain.jamSelesai,
              jadwalKandidat.jamMulai,
              jadwalKandidat.jamSelesai,
            ),
        );

        if (ruanganPengajuBentrok) {
          return false;
        }

        const ruanganPenerimaBentrok = semuaJadwalTanggalPengaju.some(
          (jadwalLain) =>
            !idsYangDitukar.has(jadwalLain.id) &&
            jadwalLain.ruanganId === jadwalKandidat.ruanganId &&
            jadwalBertabrakan(
              jadwalLain.jamMulai,
              jadwalLain.jamSelesai,
              jadwalPengaju.jamMulai,
              jadwalPengaju.jamSelesai,
            ),
        );

        return !ruanganPenerimaBentrok;
      })
      .map((jadwal) => ({
        id: jadwal.id,

        tanggal: formatTanggalKey(tanggalPenerima),

        hari: jadwal.hari,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,

        guruId: jadwal.guru.userId,
        guru: jadwal.guru.user.nama,

        mapel: jadwal.mataPelajaran.nama,
        kelas: jadwal.kelas.nama,
        ruangan: jadwal.ruangan.nama,
      }));

    return NextResponse.json({
      tanggalPengaju: formatTanggalKey(tanggalPengaju),

      tanggalPenerima: formatTanggalKey(tanggalPenerima),

      periodePengaju,
      periodePenerima,

      jadwalPengaju: {
        id: jadwalPengaju.id,

        tanggal: formatTanggalKey(tanggalPengaju),

        hari: jadwalPengaju.hari,
        jamMulai: jadwalPengaju.jamMulai,
        jamSelesai: jadwalPengaju.jamSelesai,

        mapel: jadwalPengaju.mataPelajaran.nama,

        kelas: jadwalPengaju.kelas.nama,
        ruangan: jadwalPengaju.ruangan.nama,
      },

      jadwalSaya,
      kandidat,

      jumlahKandidat: kandidat.length,
    });
  } catch (error) {
    console.error("TUKAR_JADWAL_KANDIDAT_ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat mengambil kandidat tukar jadwal",
      },
      { status: 500 },
    );
  }
}
