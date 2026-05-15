import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = { aktif: true };

    const now = new Date();
    const tanggal = new Date(now);
    tanggal.setHours(0, 0, 0, 0);

    const jadwal = await prisma.jadwal.findMany({
      where,
      include: {
        guru: {
          include: { user: true },
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

    const result = jadwal.map((j) => {
      const absensiHariIni = j.absensi[0] ?? null;

      return {
        ...j,
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
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      guruId,
      kelasId,
      mataPelajaranId,
      ruanganId,
      hari,
      jamMulai,
      jamSelesai,
    } = await req.json();

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
        guru: { include: { user: true } },
        kelas: true,
        mataPelajaran: true,
        ruangan: true,
      },
    });

    return NextResponse.json(jadwal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
