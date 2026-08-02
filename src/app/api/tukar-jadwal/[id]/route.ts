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
import { nowJakarta, timeJakarta, todayJakarta } from "@/lib/time";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

type AksiTukarJadwal = "SETUJUI" | "TOLAK" | "BATALKAN";

type PatchBody = {
  aksi?: AksiTukarJadwal;
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

function tanggalSama(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

function formatTanggal(tanggal: Date) {
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

  if (tanggal.getTime() < hariIni.getTime()) {
    return true;
  }

  if (!tanggalSama(tanggal, hariIni)) {
    return false;
  }

  return jamMulai <= timeJakarta();
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
    return `Tanggal tidak sesuai dengan hari jadwal ${jadwal.hari}`;
  }

  const periode = getPeriodeAkademik(tanggal);

  if (
    jadwal.tahunAjaran !== periode.tahunAjaran ||
    jadwal.semester !== periode.semester
  ) {
    return "Jadwal tidak berada pada periode akademik tanggal tersebut";
  }

  return null;
}

class RouteError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    if (!sessionRoles.has(Role.GURU)) {
      return NextResponse.json(
        {
          error: "Hanya guru yang dapat merespons pertukaran jadwal",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "ID pengajuan tidak valid" },
        { status: 400 },
      );
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Data aksi tidak valid" },
        { status: 400 },
      );
    }

    const { aksi } = body as PatchBody;

    const allowedActions: AksiTukarJadwal[] = ["SETUJUI", "TOLAK", "BATALKAN"];

    if (!aksi || !allowedActions.includes(aksi)) {
      return NextResponse.json(
        {
          error: "Aksi harus SETUJUI, TOLAK, atau BATALKAN",
        },
        { status: 400 },
      );
    }

    const hasil = await prisma.$transaction(async (tx) => {
      const pengajuan = await tx.tukarJadwal.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          pengajuId: true,
          penerimaId: true,
          status: true,

          tanggalJadwalPengaju: true,
          tanggalJadwalPenerima: true,

          pengaju: {
            select: {
              id: true,
              nama: true,
              aktif: true,
            },
          },

          penerima: {
            select: {
              id: true,
              nama: true,
              aktif: true,
            },
          },

          jadwalPengaju: {
            select: jadwalDetailSelect,
          },

          jadwalPenerima: {
            select: jadwalDetailSelect,
          },
        },
      });

      if (!pengajuan) {
        throw new RouteError(404, "Pengajuan tukar jadwal tidak ditemukan");
      }

      if (pengajuan.status !== StatusTukarJadwal.MENUNGGU) {
        throw new RouteError(
          409,
          `Pengajuan sudah berstatus ${pengajuan.status}`,
        );
      }

      const sebagaiPengaju = pengajuan.pengajuId === session.user.id;

      const sebagaiPenerima = pengajuan.penerimaId === session.user.id;

      /*
       * Pengajuan hanya boleh dibatalkan oleh pengaju.
       */
      if (aksi === "BATALKAN") {
        if (!sebagaiPengaju) {
          throw new RouteError(
            403,
            "Hanya pengaju yang dapat membatalkan pengajuan",
          );
        }

        const updateResult = await tx.tukarJadwal.updateMany({
          where: {
            id: pengajuan.id,
            status: StatusTukarJadwal.MENUNGGU,
          },

          data: {
            status: StatusTukarJadwal.DIBATALKAN,
            dibatalkanAt: nowJakarta(),
          },
        });

        if (updateResult.count === 0) {
          throw new RouteError(
            409,
            "Status pengajuan sudah berubah. Silakan muat ulang halaman.",
          );
        }

        return {
          id: pengajuan.id,
          status: StatusTukarJadwal.DIBATALKAN,
          message: "Pengajuan tukar jadwal berhasil dibatalkan",
        };
      }

      /*
       * Setujui dan tolak hanya boleh dilakukan oleh penerima.
       */
      if (!sebagaiPenerima) {
        throw new RouteError(
          403,
          "Hanya guru penerima yang dapat merespons pengajuan",
        );
      }

      if (aksi === "TOLAK") {
        const updateResult = await tx.tukarJadwal.updateMany({
          where: {
            id: pengajuan.id,
            status: StatusTukarJadwal.MENUNGGU,
          },

          data: {
            status: StatusTukarJadwal.DITOLAK,
            ditanggapiAt: nowJakarta(),
          },
        });

        if (updateResult.count === 0) {
          throw new RouteError(
            409,
            "Status pengajuan sudah berubah. Silakan muat ulang halaman.",
          );
        }

        return {
          id: pengajuan.id,
          status: StatusTukarJadwal.DITOLAK,
          message: "Pengajuan tukar jadwal berhasil ditolak",
        };
      }

      /*
       * Validasi ulang saat penerima menekan SETUJUI.
       * Kondisi jadwal mungkin telah berubah sejak pengajuan dibuat.
       */
      if (!pengajuan.pengaju.aktif || !pengajuan.penerima.aktif) {
        throw new RouteError(409, "Salah satu guru sudah tidak aktif");
      }

      if (!pengajuan.jadwalPengaju.aktif || !pengajuan.jadwalPenerima.aktif) {
        throw new RouteError(409, "Salah satu jadwal sudah tidak aktif");
      }

      const errorTanggalPengaju = validasiTanggalJadwal(
        pengajuan.tanggalJadwalPengaju,
        pengajuan.jadwalPengaju,
      );

      if (errorTanggalPengaju) {
        throw new RouteError(409, errorTanggalPengaju);
      }

      const errorTanggalPenerima = validasiTanggalJadwal(
        pengajuan.tanggalJadwalPenerima,
        pengajuan.jadwalPenerima,
      );

      if (errorTanggalPenerima) {
        throw new RouteError(409, errorTanggalPenerima);
      }

      if (
        jadwalSudahDimulai(
          pengajuan.tanggalJadwalPengaju,
          pengajuan.jadwalPengaju.jamMulai,
        ) ||
        jadwalSudahDimulai(
          pengajuan.tanggalJadwalPenerima,
          pengajuan.jadwalPenerima.jamMulai,
        )
      ) {
        throw new RouteError(
          409,
          "Salah satu jam mengajar sudah dimulai atau sudah lewat",
        );
      }

      const [absensiMengajar, absensiTidakMasuk, pertukaranAktifLain] =
        await Promise.all([
          tx.absensi.findFirst({
            where: {
              OR: [
                {
                  userId: pengajuan.pengajuId,
                  tanggal: pengajuan.tanggalJadwalPengaju,
                  tipe: TipeAbsensi.JAM_MENGAJAR,
                  jadwalId: pengajuan.jadwalPengaju.id,
                },
                {
                  userId: pengajuan.penerimaId,
                  tanggal: pengajuan.tanggalJadwalPenerima,
                  tipe: TipeAbsensi.JAM_MENGAJAR,
                  jadwalId: pengajuan.jadwalPenerima.id,
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
                  // Pengaju akan mengajar di tanggal milik penerima.
                  userId: pengajuan.pengajuId,
                  tanggal: pengajuan.tanggalJadwalPenerima,
                },
                {
                  // Penerima akan mengajar di tanggal milik pengaju.
                  userId: pengajuan.penerimaId,
                  tanggal: pengajuan.tanggalJadwalPengaju,
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
              id: {
                not: pengajuan.id,
              },

              status: {
                in: STATUS_TUKAR_AKTIF,
              },

              OR: [
                {
                  jadwalPengajuId: pengajuan.jadwalPengaju.id,
                  tanggalJadwalPengaju: pengajuan.tanggalJadwalPengaju,
                },
                {
                  jadwalPenerimaId: pengajuan.jadwalPengaju.id,
                  tanggalJadwalPenerima: pengajuan.tanggalJadwalPengaju,
                },
                {
                  jadwalPengajuId: pengajuan.jadwalPenerima.id,
                  tanggalJadwalPengaju: pengajuan.tanggalJadwalPenerima,
                },
                {
                  jadwalPenerimaId: pengajuan.jadwalPenerima.id,
                  tanggalJadwalPenerima: pengajuan.tanggalJadwalPenerima,
                },
              ],
            },

            select: {
              id: true,
            },
          }),
        ]);

      if (absensiMengajar) {
        throw new RouteError(
          409,
          "Salah satu absensi jam mengajar sudah tercatat",
        );
      }

      if (absensiTidakMasuk) {
        throw new RouteError(
          409,
          `Pertukaran tidak dapat disetujui karena salah satu guru berstatus ${absensiTidakMasuk.status}`,
        );
      }

      if (pertukaranAktifLain) {
        throw new RouteError(
          409,
          "Salah satu jadwal sudah terlibat pertukaran lain",
        );
      }

      const hariPengaju = getHariMinggu(pengajuan.tanggalJadwalPengaju);

      const hariPenerima = getHariMinggu(pengajuan.tanggalJadwalPenerima);

      if (!hariPengaju || !hariPenerima) {
        throw new RouteError(
          400,
          "Pertukaran tidak dapat dilakukan pada hari Minggu",
        );
      }

      const periodePengaju = getPeriodeAkademik(pengajuan.tanggalJadwalPengaju);

      const periodePenerima = getPeriodeAkademik(
        pengajuan.tanggalJadwalPenerima,
      );

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

      const jadwalYangDitukar = new Set([
        pengajuan.jadwalPengaju.id,
        pengajuan.jadwalPenerima.id,
      ]);

      const pengajuBentrokDiSlotBaru = semuaJadwalTanggalPenerima.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.guru.userId === pengajuan.pengajuId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            pengajuan.jadwalPenerima.jamMulai,
            pengajuan.jadwalPenerima.jamSelesai,
          ),
      );

      if (pengajuBentrokDiSlotBaru) {
        throw new RouteError(
          409,
          "Guru pengaju memiliki jadwal lain pada slot tujuan",
        );
      }

      const penerimaBentrokDiSlotBaru = semuaJadwalTanggalPengaju.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.guru.userId === pengajuan.penerimaId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            pengajuan.jadwalPengaju.jamMulai,
            pengajuan.jadwalPengaju.jamSelesai,
          ),
      );

      if (penerimaBentrokDiSlotBaru) {
        throw new RouteError(
          409,
          "Guru penerima memiliki jadwal lain pada slot tujuan",
        );
      }

      const kelasPengajuBentrok = semuaJadwalTanggalPenerima.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.kelasId === pengajuan.jadwalPengaju.kelasId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            pengajuan.jadwalPenerima.jamMulai,
            pengajuan.jadwalPenerima.jamSelesai,
          ),
      );

      if (kelasPengajuBentrok) {
        throw new RouteError(
          409,
          "Kelas pengaju memiliki jadwal lain pada slot tujuan",
        );
      }

      const kelasPenerimaBentrok = semuaJadwalTanggalPengaju.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.kelasId === pengajuan.jadwalPenerima.kelasId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            pengajuan.jadwalPengaju.jamMulai,
            pengajuan.jadwalPengaju.jamSelesai,
          ),
      );

      if (kelasPenerimaBentrok) {
        throw new RouteError(
          409,
          "Kelas penerima memiliki jadwal lain pada slot tujuan",
        );
      }

      const ruanganPengajuBentrok = semuaJadwalTanggalPenerima.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.ruanganId === pengajuan.jadwalPengaju.ruanganId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            pengajuan.jadwalPenerima.jamMulai,
            pengajuan.jadwalPenerima.jamSelesai,
          ),
      );

      if (ruanganPengajuBentrok) {
        throw new RouteError(409, "Ruangan pengaju digunakan pada slot tujuan");
      }

      const ruanganPenerimaBentrok = semuaJadwalTanggalPengaju.some(
        (jadwal) =>
          !jadwalYangDitukar.has(jadwal.id) &&
          jadwal.ruanganId === pengajuan.jadwalPenerima.ruanganId &&
          jadwalBertabrakan(
            jadwal.jamMulai,
            jadwal.jamSelesai,
            pengajuan.jadwalPengaju.jamMulai,
            pengajuan.jadwalPengaju.jamSelesai,
          ),
      );

      if (ruanganPenerimaBentrok) {
        throw new RouteError(
          409,
          "Ruangan penerima digunakan pada slot tujuan",
        );
      }

      const updateResult = await tx.tukarJadwal.updateMany({
        where: {
          id: pengajuan.id,
          status: StatusTukarJadwal.MENUNGGU,
        },

        data: {
          status: StatusTukarJadwal.DISETUJUI,
          ditanggapiAt: nowJakarta(),
        },
      });

      if (updateResult.count === 0) {
        throw new RouteError(
          409,
          "Status pengajuan sudah berubah. Silakan muat ulang halaman.",
        );
      }

      return {
        id: pengajuan.id,
        status: StatusTukarJadwal.DISETUJUI,
        message: "Pertukaran jadwal berhasil disetujui",

        pengaju: {
          id: pengajuan.pengaju.id,
          nama: pengajuan.pengaju.nama,
        },

        penerima: {
          id: pengajuan.penerima.id,
          nama: pengajuan.penerima.nama,
        },

        jadwalPengaju: {
          tanggal: formatTanggal(pengajuan.tanggalJadwalPengaju),
          jamMulai: pengajuan.jadwalPengaju.jamMulai,
          jamSelesai: pengajuan.jadwalPengaju.jamSelesai,
          mapel: pengajuan.jadwalPengaju.mataPelajaran.nama,
          kelas: pengajuan.jadwalPengaju.kelas.nama,
        },

        jadwalPenerima: {
          tanggal: formatTanggal(pengajuan.tanggalJadwalPenerima),
          jamMulai: pengajuan.jadwalPenerima.jamMulai,
          jamSelesai: pengajuan.jadwalPenerima.jamSelesai,
          mapel: pengajuan.jadwalPenerima.mataPelajaran.nama,
          kelas: pengajuan.jadwalPenerima.kelas.nama,
        },
      };
    });

    return NextResponse.json({
      message: hasil.message,
      data: hasil,
    });
  } catch (error) {
    console.error("TUKAR_JADWAL_PATCH_ERROR:", error);

    if (error instanceof RouteError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: error.statusCode,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat memproses pengajuan tukar jadwal",
      },
      { status: 500 },
    );
  }
}
