import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function parseTanggalJakarta(tanggalStr: string) {
  const [year, month, day] = tanggalStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const tipe = searchParams.get("tipe") ?? "kehadiran";
    const periode = searchParams.get("periode") ?? "bulanan";

    const tanggalStr =
      searchParams.get("tanggal") ??
      new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Jakarta",
      });

    const tanggal = parseTanggalJakarta(tanggalStr);

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

      tanggalMulai = new Date(tanggal);
      tanggalMulai.setDate(diff);
      tanggalMulai.setHours(0, 0, 0, 0);

      tanggalSelesai = new Date(tanggalMulai);
      tanggalSelesai.setDate(tanggalMulai.getDate() + 5);
      tanggalSelesai.setHours(23, 59, 59, 999);
    } else {
      tanggalMulai = new Date(tanggal.getFullYear(), tanggal.getMonth(), 1);
      tanggalMulai.setHours(0, 0, 0, 0);

      tanggalSelesai = new Date(
        tanggal.getFullYear(),
        tanggal.getMonth() + 1,
        0,
      );
      tanggalSelesai.setHours(23, 59, 59, 999);
    }

    if (tipe === "kehadiran") {
      const users = await prisma.user.findMany({
        where: {
          role: { in: ["GURU", "STAFF"] },
          aktif: true,
        },
        orderBy: { nama: "asc" },
      });

      // Ambil semua absensi sekaligus — satu query
      const semuaAbsensi = await prisma.absensi.findMany({
        where: {
          tipe: "BERANGKAT",
          tanggal: { gte: tanggalMulai, lte: tanggalSelesai },
          user: {
            role: { in: ["GURU", "STAFF"] },
            aktif: true,
          },
        },
        select: {
          userId: true,
          status: true,
        },
      });

      // Hitung per user di memory — tidak perlu query lagi
      const laporan = users.map((user) => {
        const absensiUser = semuaAbsensi.filter((a) => a.userId === user.id);
        const hadir = absensiUser.filter((a) => a.status === "HADIR").length;
        const terlambat = absensiUser.filter(
          (a) => a.status === "TERLAMBAT",
        ).length;
        const total = absensiUser.length;

        return {
          nama: user.nama,
          nip: user.nip,
          role: user.role,
          hadir,
          terlambat,
          tidakHadir: 0,
          total,
          persentase: total > 0 ? Math.round((hadir / total) * 100) : 0,
        };
      });

      return NextResponse.json({
        tipe,
        periode,
        tanggalMulai,
        tanggalSelesai,
        laporan,
      });
    } else {
      // Laporan mengajar
      const guru = await prisma.guru.findMany({
        include: { user: true },
      });

      // Ambil semua absensi mengajar sekaligus — satu query
      const semuaAbsensi = await prisma.absensi.findMany({
        where: {
          tipe: "JAM_MENGAJAR",
          tanggal: { gte: tanggalMulai, lte: tanggalSelesai },
        },
        select: {
          userId: true,
          status: true,
        },
      });

      // Hitung per guru di memory
      const laporan = guru.map((g) => {
        const absensiGuru = semuaAbsensi.filter((a) => a.userId === g.userId);
        const hadir = absensiGuru.filter((a) => a.status === "HADIR").length;
        const terlambat = absensiGuru.filter(
          (a) => a.status === "TERLAMBAT",
        ).length;
        const total = absensiGuru.length;

        return {
          nama: g.user.nama,
          nip: g.user.nip,
          hadir,
          terlambat,
          tidakHadir: 0,
          total,
          persentase: total > 0 ? Math.round((hadir / total) * 100) : 0,
        };
      });

      return NextResponse.json({
        tipe,
        periode,
        tanggalMulai,
        tanggalSelesai,
        laporan,
      });
    }

    const guru = await prisma.guru.findMany({
      include: { user: true },
      orderBy: {
        user: {
          nama: "asc",
        },
      },
    });

    const laporan = await Promise.all(
      guru.map(async (g) => {
        const absensi = await prisma.absensi.findMany({
          where: {
            userId: g.userId,
            tipe: "JAM_MENGAJAR",
            tanggal: {
              gte: tanggalMulai,
              lte: tanggalSelesai,
            },
          },
        });

        const hadir = absensi.filter((a) => a.status === "HADIR").length;
        const terlambat = absensi.filter(
          (a) => a.status === "TERLAMBAT",
        ).length;

        const total = hadir + terlambat;

        return {
          nama: g.user.nama,
          nip: g.user.nip,
          role: "GURU",
          hadir,
          terlambat,
          tidakHadir: 0,
          total,
          persentase:
            total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0,
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
  } catch (error) {
    console.error("LAPORAN_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
