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

    if (
      !session ||
      !["ADMIN", "PIMPINAN", "GURU", "STAFF"].includes(session.user.role)
    ) {
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

    const [totalGuru, totalStaff, totalSiswa, absensiSiswaHariIni] =
      await Promise.all([
        prisma.user.count({ where: { role: "GURU", aktif: true } }),
        prisma.user.count({ where: { role: "STAFF", aktif: true } }),
        prisma.siswa.count({ where: { aktif: true } }),
        prisma.absensiSiswa.findMany({ where: { tanggal } }),
      ]);

    const siswaHadir = absensiSiswaHariIni.filter(
      (a) => a.status === "HADIR" || a.status === "TERLAMBAT",
    ).length;

    const siswaTerlambat = absensiSiswaHariIni.filter(
      (a) => a.status === "TERLAMBAT",
    ).length;

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
      (a) =>
        a.user.role === "GURU" &&
        (a.status === "HADIR" || a.status === "TERLAMBAT"),
    ).length;

    const guruTerlambat = 0;

    const staffHadir = absensiHariIni.filter(
      (a) =>
        a.user.role === "STAFF" &&
        (a.status === "HADIR" || a.status === "TERLAMBAT"),
    ).length;

    const staffTerlambat = 0;

    const jadwalWhere: {
      hari: string;
      aktif: boolean;
      guruId?: string;
    } = {
      hari: hariIni as string,
      aktif: true,
    };

    if (session.user.role === "GURU") {
      const guru = await prisma.guru.findUnique({
        where: { userId: session.user.id },
      });
      if (!guru) {
        return NextResponse.json({
          totalGuru,
          totalStaff,
          totalSiswa,
          guruHadir,
          guruTerlambat,
          guruTidakHadir: totalGuru - guruHadir,
          staffHadir,
          staffTerlambat,
          staffTidakHadir: totalStaff - staffHadir,
          siswaHadir,
          siswaTerlambat,
          siswaTidakHadir: totalSiswa - siswaHadir,
          jadwal: [],
        });
      }
      jadwalWhere.guruId = guru.id;
    }

    const jadwalHariIni =
      hariIni && session.user.role !== "STAFF"
        ? await prisma.jadwal.findMany({
            where: jadwalWhere as any,
            include: {
              guru: { include: { user: true } },
              kelas: true,
              mataPelajaran: true,
              ruangan: true,
            },
            orderBy: { jamMulai: "asc" },
          })
        : [];

    // Ambil semua absensi mengajar hari ini sekaligus — satu query
    const semuaAbsensiMengajar = await prisma.absensi.findMany({
      where: {
        tipe: "JAM_MENGAJAR",
        tanggal,
        jadwalId: { in: jadwalHariIni.map((j) => j.id) },
      },
      select: {
        userId: true,
        jadwalId: true,
        status: true,
        waktuScan: true,
      },
    });

    // Hitung per jadwal di memory — tidak perlu query lagi
    const jadwalDenganStatus = jadwalHariIni.map((j) => {
      const absensi = semuaAbsensiMengajar.find(
        (a) => a.userId === j.guru.userId && a.jadwalId === j.id,
      );

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
    });

    return NextResponse.json({
      totalGuru,
      totalStaff,
      totalSiswa,
      guruHadir,
      guruTerlambat,
      guruTidakHadir: totalGuru - guruHadir,
      staffHadir,
      staffTerlambat,
      staffTidakHadir: totalStaff - staffHadir,
      siswaHadir,
      siswaTerlambat,
      siswaTidakHadir: totalSiswa - siswaHadir,
      jadwal: jadwalDenganStatus,
    });
  } catch (error) {
    console.error("DASHBOARD_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
