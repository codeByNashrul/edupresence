import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = new Set(["ADMIN", "PIMPINAN", "GURU", "STAFF", "ORTU"]);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId || !role || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const mingguKeParam = searchParams.get("mingguKe");
    const tahunAjaran = searchParams.get("tahunAjaran");
    const semester = searchParams.get("semester");
    const kelasId = searchParams.get("kelasId");
    const search = searchParams.get("search")?.trim() ?? "";

    let mingguKe: number | undefined;

    if (mingguKeParam) {
      mingguKe = Number(mingguKeParam);

      if (!Number.isInteger(mingguKe) || mingguKe < 1) {
        return NextResponse.json(
          { error: "Minggu ke tidak valid" },
          { status: 400 },
        );
      }
    }

    const isOrtu = role === "ORTU";
    let siswaIdOrtu: string | undefined;

    /**
     * Session ORTU menyimpan ID akun UserOrtu.
     * Ambil siswaId dari tabel user_ortu.
     */
    if (isOrtu) {
      const akunOrtu = await prisma.userOrtu.findUnique({
        where: {
          id: userId,
        },
        select: {
          siswaId: true,
          aktif: true,
        },
      });

      if (!akunOrtu || !akunOrtu.aktif) {
        return NextResponse.json(
          { error: "Akun orang tua tidak ditemukan atau tidak aktif" },
          { status: 403 },
        );
      }

      siswaIdOrtu = akunOrtu.siswaId;
    }

    const data = await prisma.rekapPelanggaran.findMany({
      where: {
        ...(mingguKe !== undefined ? { mingguKe } : {}),
        ...(tahunAjaran ? { tahunAjaran } : {}),
        ...(semester ? { semester } : {}),

        /**
         * Orang tua hanya boleh membaca data anaknya sendiri.
         */
        ...(siswaIdOrtu ? { siswaId: siswaIdOrtu } : {}),

        siswa: {
          aktif: true,

          ...(search
            ? {
                nama: {
                  contains: search,
                  mode: "insensitive",
                },
              }
            : {}),

          ...(kelasId ? { kelasId } : {}),
        },
      },

      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
            jenisKelamin: true,
            kelas: {
              select: {
                id: true,
                nama: true,
              },
            },
          },
        },
      },

      orderBy: {
        siswa: {
          nama: "asc",
        },
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET_REKAP_PELANGGARAN_ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
