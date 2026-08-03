import {
  JenisIzin,
  Role,
  SumberAbsensi,
  StatusAbsensi,
  StatusIzin,
  TipeAbsensi,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getJadwalEfektif } from "@/lib/jadwal-efektif";
import { prisma } from "@/lib/prisma";
import { nowJakarta } from "@/lib/time";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

class RouteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function dateKeyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateKeysInclusive(tanggalMulai: Date, tanggalAkhir: Date) {
  const startKey = dateKeyFromDate(tanggalMulai);
  const endKey = dateKeyFromDate(tanggalAkhir);

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

function formatTanggalIndonesia(date: Date) {
  return date.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusAbsensi(jenisIzin: JenisIzin) {
  return jenisIzin === JenisIzin.SAKIT
    ? StatusAbsensi.SAKIT
    : StatusAbsensi.IZIN;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "ID izin tidak valid" },
        { status: 400 },
      );
    }

    const body: unknown = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Data status tidak valid" },
        { status: 400 },
      );
    }

    const rawStatus = (body as { status?: unknown }).status;

    const status =
      typeof rawStatus === "string"
        ? (rawStatus.trim().toUpperCase() as StatusIzin)
        : null;

    if (!status || !Object.values(StatusIzin).includes(status)) {
      return NextResponse.json(
        { error: "Status izin tidak valid" },
        { status: 400 },
      );
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    const isManagement =
      sessionRoles.has(Role.ADMIN) || sessionRoles.has(Role.PIMPINAN);

    const izin = await prisma.izin.findUnique({
      where: {
        id,
      },

      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
            role: true,
            rolesTambahan: true,
            aktif: true,
          },
        },
      },
    });

    if (!izin) {
      return NextResponse.json(
        { error: "Izin tidak ditemukan" },
        { status: 404 },
      );
    }

    const isOwner = izin.userId === session.user.id;

    if (!isManagement && !isOwner) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses" },
        { status: 403 },
      );
    }

    /*
     * Pengguna biasa hanya boleh membatalkan izin sendiri.
     * APPROVED dan DITOLAK hanya dapat diproses manajemen.
     */
    if (!isManagement && status !== StatusIzin.DIBATALKAN) {
      return NextResponse.json(
        {
          error: "Pengguna hanya dapat membatalkan izin miliknya sendiri",
        },
        { status: 403 },
      );
    }

    /*
     * Jadwal efektif dipersiapkan sebelum transaksi.
     * Ini mencakup jadwal hasil tukar yang sudah disetujui.
     */
    const tanggalKeys = getDateKeysInclusive(
      izin.tanggalMulai,
      izin.tanggalAkhir,
    );

    const tanggalList = tanggalKeys.map(dateFromKey);

    const jadwalEfektifByTanggal = new Map<
      string,
      Awaited<ReturnType<typeof getJadwalEfektif>>
    >();

    if (status === StatusIzin.APPROVED) {
      const hasilJadwal = await Promise.all(
        tanggalKeys.map(async (tanggalKey) => {
          const jadwal = await getJadwalEfektif({
            tanggal: dateFromKey(tanggalKey),
            userId: izin.userId,
          });

          return {
            tanggalKey,
            jadwal,
          };
        }),
      );

      for (const item of hasilJadwal) {
        jadwalEfektifByTanggal.set(item.tanggalKey, item.jadwal);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      /*
       * Ketika APPROVED, sinkronkan izin ke absensi.
       */
      if (status === StatusIzin.APPROVED) {
        if (!izin.user.aktif) {
          throw new RouteError(409, "Pengguna sudah tidak aktif");
        }

        const izinTumpangTindih = await tx.izin.findFirst({
          where: {
            id: {
              not: izin.id,
            },

            userId: izin.userId,
            status: StatusIzin.APPROVED,

            tanggalMulai: {
              lte: izin.tanggalAkhir,
            },

            tanggalAkhir: {
              gte: izin.tanggalMulai,
            },
          },

          select: {
            id: true,
          },
        });

        if (izinTumpangTindih) {
          throw new RouteError(
            409,
            "Sudah ada izin aktif pada rentang tanggal tersebut",
          );
        }

        /*
         * Hapus sinkronisasi lama dari izin yang sama agar
         * proses APPROVED bersifat idempotent.
         */
        await tx.absensi.deleteMany({
          where: {
            izinId: izin.id,
            sumber: SumberAbsensi.PERIZINAN,
          },
        });

        /*
         * Jangan menimpa absensi QR/manual atau absensi
         * dari izin lain.
         */
        const absensiKonflik = await tx.absensi.findFirst({
          where: {
            userId: izin.userId,

            tanggal: {
              in: tanggalList,
            },

            tipe: {
              in: [
                TipeAbsensi.BERANGKAT,
                TipeAbsensi.PULANG,
                TipeAbsensi.JAM_MENGAJAR,
              ],
            },

            OR: [
              {
                sumber: {
                  not: SumberAbsensi.PERIZINAN,
                },
              },
              {
                sumber: SumberAbsensi.PERIZINAN,

                izinId: {
                  not: izin.id,
                },
              },
            ],
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

        if (absensiKonflik) {
          throw new RouteError(
            409,
            `Absensi tanggal ${formatTanggalIndonesia(
              absensiKonflik.tanggal,
            )} sudah tercatat sebagai ${absensiKonflik.status}`,
          );
        }

        const statusAbsensi = getStatusAbsensi(izin.jenisIzin);

        const waktuPencatatan = nowJakarta();

        const dataAbsensi = tanggalKeys.flatMap((tanggalKey) => {
          const tanggal = dateFromKey(tanggalKey);

          const jadwalTanggalIni = jadwalEfektifByTanggal.get(tanggalKey) ?? [];

          return [
            {
              userId: izin.userId,
              ruanganId: null,
              jadwalId: null,

              tipe: TipeAbsensi.BERANGKAT,
              status: statusAbsensi,

              tanggal,
              waktuScan: waktuPencatatan,

              sumber: SumberAbsensi.PERIZINAN,

              izinId: izin.id,
              dicatatOlehId: session.user.id,
            },

            ...jadwalTanggalIni.map((jadwal) => ({
              userId: izin.userId,

              jadwalId: jadwal.jadwalId,

              ruanganId: jadwal.ruangan.id,

              tipe: TipeAbsensi.JAM_MENGAJAR,

              status: statusAbsensi,

              tanggal,
              waktuScan: waktuPencatatan,

              sumber: SumberAbsensi.PERIZINAN,

              izinId: izin.id,

              dicatatOlehId: session.user.id,
            })),
          ];
        });

        if (dataAbsensi.length > 0) {
          await tx.absensi.createMany({
            data: dataAbsensi,
          });
        }

        const updated = await tx.izin.update({
          where: {
            id: izin.id,
          },

          data: {
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

        return {
          izin: updated,

          sinkronisasi: {
            kehadiranHarian: tanggalKeys.length,

            jadwalMengajar: dataAbsensi.filter(
              (item) => item.tipe === TipeAbsensi.JAM_MENGAJAR,
            ).length,
          },
        };
      }

      /*
       * DITOLAK atau DIBATALKAN:
       * hapus seluruh absensi hasil izin tersebut.
       */
      await tx.absensi.deleteMany({
        where: {
          izinId: izin.id,
          sumber: SumberAbsensi.PERIZINAN,
        },
      });

      const updated = await tx.izin.update({
        where: {
          id: izin.id,
        },

        data: {
          status,
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

      return {
        izin: updated,

        sinkronisasi: {
          kehadiranHarian: 0,
          jadwalMengajar: 0,
        },
      };
    });

    return NextResponse.json({
      ...result.izin,
      sinkronisasi: result.sinkronisasi,
    });
  } catch (error) {
    console.error("PUT_IZIN_ERROR:", error);

    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "ID izin tidak valid" },
        { status: 400 },
      );
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    const isManagement =
      sessionRoles.has(Role.ADMIN) || sessionRoles.has(Role.PIMPINAN);

    const izin = await prisma.izin.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        userId: true,
      },
    });

    if (!izin) {
      return NextResponse.json(
        { error: "Izin tidak ditemukan" },
        { status: 404 },
      );
    }

    const isOwner = izin.userId === session.user.id;

    if (!isManagement && !isOwner) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses" },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      /*
       * Absensi harus dibersihkan sebelum izin dihapus.
       */
      await tx.absensi.deleteMany({
        where: {
          izinId: izin.id,
          sumber: SumberAbsensi.PERIZINAN,
        },
      });

      await tx.izin.delete({
        where: {
          id: izin.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Izin dan sinkronisasi absensinya berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE_IZIN_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
