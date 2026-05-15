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

    const kegiatanId = searchParams.get("kegiatanId");

    const kegiatan = await prisma.kegiatanSiswa.findMany({
      where: {
        aktif: true,
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    if (!kegiatanId) {
      return NextResponse.json({
        kegiatan,
        laporan: [],
      });
    }

    const laporan = await prisma.absensiKegiatanSiswa.findMany({
      where: {
        kegiatanId,
      },
      include: {
        siswa: {
          include: {
            kelas: true,
          },
        },
        kegiatan: true,
      },
      orderBy: {
        waktuScan: "asc",
      },
    });

    return NextResponse.json({
      kegiatan,
      laporan: laporan.map((item) => ({
        id: item.id,
        nama: item.siswa.nama,
        nis: item.siswa.nis,
        jenisKelamin: item.siswa.jenisKelamin,
        kelas: item.siswa.kelas.nama,
        status: item.status,
        waktuScan: item.waktuScan,
        kegiatan: item.kegiatan.nama,
      })),
    });
  } catch (error) {
    console.error("LAPORAN_KEGIATAN_SISWA_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
