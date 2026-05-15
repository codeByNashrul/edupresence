import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan"); // format: 2025-05

    let tanggalMulai: Date;
    let tanggalSelesai: Date;

    if (bulan) {
      const [tahun, bln] = bulan.split("-").map(Number);
      tanggalMulai = new Date(tahun, bln - 1, 1);
      tanggalSelesai = new Date(tahun, bln, 0);
    } else {
      // Default bulan ini
      const now = new Date();
      tanggalMulai = new Date(now.getFullYear(), now.getMonth(), 1);
      tanggalSelesai = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const riwayat = await prisma.absensi.findMany({
      where: {
        userId: session.user.id,
        tanggal: {
          gte: tanggalMulai,
          lte: tanggalSelesai,
        },
      },
      include: {
        ruangan: true,
        jadwal: {
          include: {
            mataPelajaran: true,
            kelas: true,
          },
        },
      },
      orderBy: { tanggal: "desc" },
    });

    return NextResponse.json(riwayat);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
