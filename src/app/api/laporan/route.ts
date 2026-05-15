import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PIMPINAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipe = searchParams.get("tipe") ?? "kehadiran"; // kehadiran | mengajar
    const periode = searchParams.get("periode") ?? "bulanan"; // harian | mingguan | bulanan
    const tanggalStr =
      searchParams.get("tanggal") ?? new Date().toISOString().split("T")[0];

    const tanggal = new Date(tanggalStr);
    let tanggalMulai: Date;
    let tanggalSelesai: Date;

    if (periode === "harian") {
      tanggalMulai = new Date(tanggal);
      tanggalMulai.setHours(0, 0, 0, 0);
      tanggalSelesai = new Date(tanggal);
      tanggalSelesai.setHours(23, 59, 59, 999);
    } else if (periode === "mingguan") {
      const day = tanggal.getDay();
      const diff = tanggal.getDate() - day + (day === 0 ? -6 : 1);
      tanggalMulai = new Date(tanggal.setDate(diff));
      tanggalMulai.setHours(0, 0, 0, 0);
      tanggalSelesai = new Date(tanggalMulai);
      tanggalSelesai.setDate(tanggalMulai.getDate() + 5);
      tanggalSelesai.setHours(23, 59, 59, 999);
    } else {
      tanggalMulai = new Date(tanggal.getFullYear(), tanggal.getMonth(), 1);
      tanggalSelesai = new Date(
        tanggal.getFullYear(),
        tanggal.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
    }

    if (tipe === "kehadiran") {
      // Laporan kehadiran guru & staff
      const users = await prisma.user.findMany({
        where: {
          role: { in: ["GURU", "STAFF"] },
          aktif: true,
        },
        orderBy: { nama: "asc" },
      });

      const laporan = await Promise.all(
        users.map(async (user) => {
          const absensi = await prisma.absensi.findMany({
            where: {
              userId: user.id,
              tipe: "BERANGKAT",
              tanggal: { gte: tanggalMulai, lte: tanggalSelesai },
            },
          });

          const hadir = absensi.filter((a) => a.status === "HADIR").length;
          const terlambat = absensi.filter(
            (a) => a.status === "TERLAMBAT",
          ).length;
          const total = absensi.length;
          const tidakHadir = 0; // tidak bisa dihitung tanpa jadwal kerja

          return {
            nama: user.nama,
            nip: user.nip,
            role: user.role,
            hadir,
            terlambat,
            tidakHadir,
            total,
            persentase: total > 0 ? Math.round((hadir / total) * 100) : 0,
          };
        }),
      );

      return NextResponse.json({
        tipe,
        periode,
        tanggalMulai,
        tanggalSelesai,
        laporan,
      });
    } else {
      // Laporan mengajar guru
      const guru = await prisma.guru.findMany({
        include: { user: true },
      });

      const laporan = await Promise.all(
        guru.map(async (g) => {
          const absensi = await prisma.absensi.findMany({
            where: {
              userId: g.userId,
              tipe: "JAM_MENGAJAR",
              tanggal: { gte: tanggalMulai, lte: tanggalSelesai },
            },
          });

          const hadir = absensi.filter((a) => a.status === "HADIR").length;
          const terlambat = absensi.filter(
            (a) => a.status === "TERLAMBAT",
          ).length;
          const total = absensi.length;

          return {
            nama: g.user.nama,
            nip: g.user.nip,
            hadir,
            terlambat,
            tidakHadir: 0,
            total,
            persentase: total > 0 ? Math.round((hadir / total) * 100) : 0,
          };
        }),
      );

      return NextResponse.json({
        tipe,
        periode,
        tanggalMulai,
        tanggalSelesai,
        laporan,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
