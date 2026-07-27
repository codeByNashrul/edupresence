import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { todayJakarta } from "@/lib/time";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role | undefined;

    const allowedRoles: Role[] = [
      Role.ADMIN,
      Role.PIMPINAN,
      Role.GURU,
      Role.PIKET,
    ];

    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke jadwal" },
        { status: 403 },
      );
    }

    const where: Prisma.JadwalWhereInput = {
      aktif: true,
    };

    // Guru hanya melihat jadwalnya sendiri
    if (role === Role.GURU) {
      where.guru = {
        userId: session.user.id,
      };
    }

    const tanggal = todayJakarta();

    const jadwal = await prisma.jadwal.findMany({
      where,
      include: {
        guru: {
          include: {
            user: true,
          },
        },
        kelas: true,
        mataPelajaran: true,
        ruangan: true,
        absensi: {
          where: {
            tanggal,
            tipe: "JAM_MENGAJAR",
          },
          orderBy: {
            waktuScan: "desc",
          },
          take: 1,
        },
      },
      orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
    });

    const result = jadwal.map((item) => {
      const absensiHariIni = item.absensi[0] ?? null;

      return {
        ...item,
        absensiHariIni: absensiHariIni
          ? {
              status: absensiHariIni.status,
              waktuScan: absensiHariIni.waktuScan,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("JADWAL_GET_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Hanya admin yang dapat menambah jadwal" },
        { status: 403 },
      );
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const {
      guruId,
      kelasId,
      mataPelajaranId,
      ruanganId,
      hari,
      jamMulai,
      jamSelesai,
    } = body as {
      guruId?: string;
      kelasId?: string;
      mataPelajaranId?: string;
      ruanganId?: string;
      hari?: Prisma.JadwalCreateInput["hari"];
      jamMulai?: string;
      jamSelesai?: string;
    };

    if (
      !guruId ||
      !kelasId ||
      !mataPelajaranId ||
      !ruanganId ||
      !hari ||
      !jamMulai ||
      !jamSelesai
    ) {
      return NextResponse.json(
        { error: "Semua data jadwal wajib diisi" },
        { status: 400 },
      );
    }

    const jadwal = await prisma.jadwal.create({
      data: {
        guruId,
        kelasId,
        mataPelajaranId,
        ruanganId,
        hari,
        jamMulai,
        jamSelesai,
      },
      include: {
        guru: {
          include: {
            user: true,
          },
        },
        kelas: true,
        mataPelajaran: true,
        ruangan: true,
      },
    });

    return NextResponse.json(jadwal, {
      status: 201,
    });
  } catch (error) {
    console.error("JADWAL_POST_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
