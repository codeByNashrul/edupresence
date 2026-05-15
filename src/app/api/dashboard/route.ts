import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta, timeJakarta, dayJakarta } from "@/lib/time";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = nowJakarta();
    const tanggal = todayJakarta();

    // Hitung hari ini
    const hariMap: Record<number, string> = {
      1: "SENIN",
      2: "SELASA",
      3: "RABU",
      4: "KAMIS",
      5: "JUMAT",
      6: "SABTU",
    };
    const hariIni = hariMap[now.getDay()];

    // Total guru & staff aktif
    const [totalGuru, totalStaff] = await Promise.all([
      prisma.user.count({ where: { role: "GURU", aktif: true } }),
      prisma.user.count({ where: { role: "STAFF", aktif: true } }),
    ]);

    // Absensi berangkat hari ini
    const absensiHariIni = await prisma.absensi.findMany({
      where: { tanggal, tipe: "BERANGKAT" },
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

    // Jadwal hari ini + status absensi mengajar
    const jadwalHariIni = await prisma.jadwal.findMany({
      where: { hari: hariIni as any, aktif: true },
      include: {
        guru: { include: { user: true } },
        kelas: true,
        mataPelajaran: true,
        ruangan: true,
      },
      orderBy: { jamMulai: "asc" },
    });

    // Cek absensi mengajar per jadwal
    const jadwalDenganStatus = await Promise.all(
      jadwalHariIni.map(async (j) => {
        const absensi = await prisma.absensi.findFirst({
          where: {
            userId: j.guru.userId,
            jadwalId: j.id,
            tanggal,
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
