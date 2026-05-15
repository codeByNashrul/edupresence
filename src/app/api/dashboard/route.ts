import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta } from "@/lib/time";

function parseTanggal(tanggalStr?: string | null) {
  if (!tanggalStr) {
    const now = nowJakarta();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  const [year, month, day] = tanggalStr.split("-").map(Number);
  const tanggal = new Date(year, month - 1, day);
  tanggal.setHours(0, 0, 0, 0);
  return tanggal;
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tanggalParam = searchParams.get("tanggal");
    const tanggal = parseTanggal(tanggalParam);

    const hariMap: Record<number, string> = {
      1: "SENIN",
      2: "SELASA",
      3: "RABU",
      4: "KAMIS",
      5: "JUMAT",
      6: "SABTU",
    };

    const hariIni = hariMap[tanggal.getDay()];

    const [totalGuru, totalStaff] = await Promise.all([
      prisma.user.count({ where: { role: "GURU", aktif: true } }),
      prisma.user.count({ where: { role: "STAFF", aktif: true } }),
    ]);

    const absensiHariIni = await prisma.absensi.findMany({
      where: {
        tanggal,
        tipe: "BERANGKAT",
      },
      include: {
        user: true,
      },
    });

    const guruHadir = absensiHariIni.filter(
      (a) => a.user.role === "GURU" && a.status === "HADIR",
    ).length;

    const guruTerlambat = absensiHariIni.filter(
      (a) => a.user.role === "GURU" && a.status === "TERLAMBAT",
    ).length;

    const staffHadir = absensiHariIni.filter(
      (a) => a.user.role === "STAFF" && a.status === "HADIR",
    ).length;

    const staffTerlambat = absensiHariIni.filter(
      (a) => a.user.role === "STAFF" && a.status === "TERLAMBAT",
    ).length;

    const jadwalHariIni = hariIni
      ? await prisma.jadwal.findMany({
          where: {
            hari: hariIni as any,
            aktif: true,
          },
          include: {
            guru: { include: { user: true } },
            kelas: true,
            mataPelajaran: true,
            ruangan: true,
          },
          orderBy: { jamMulai: "asc" },
        })
      : [];

    const jadwalDenganStatus = await Promise.all(
      jadwalHariIni.map(async (j) => {
        const absensi = await prisma.absensi.findFirst({
          where: {
            userId: j.guru.userId,
            jadwalId: j.id,
            tanggal,
            tipe: "JAM_MENGAJAR",
          },
        });

        return {
          id: j.id,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          guru: j.guru.user.nama,
          guruId: j.guru.userId,
          noWa: j.guru.user.noWa,
          mapel: j.mataPelajaran.nama,
          kelas: j.kelas.nama,
          ruangan: j.ruangan.nama,
          status: absensi?.status ?? "BELUM",
          waktuScan: absensi?.waktuScan ?? null,
        };
      }),
    );

    return NextResponse.json({
      totalGuru,
      totalStaff,
      guruHadir,
      guruTerlambat,
      guruTidakHadir: totalGuru - guruHadir - guruTerlambat,
      staffHadir,
      staffTerlambat,
      staffTidakHadir: totalStaff - staffHadir - staffTerlambat,
      jadwal: jadwalDenganStatus,
    });
  } catch (error) {
    console.error("DASHBOARD_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
