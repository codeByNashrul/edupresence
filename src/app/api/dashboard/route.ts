import { NextResponse } from "next/server";
import type { HariMinggu, SemesterAkademik } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function getTanggalJakartaSekarang() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseTanggal(tanggalStr?: string | null) {
  const tanggalValue = tanggalStr?.trim() || getTanggalJakartaSekarang();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalValue)) {
    return null;
  }

  const [year, month, day] = tanggalValue.split("-").map(Number);

  const tanggal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    tanggal.getUTCFullYear() !== year ||
    tanggal.getUTCMonth() !== month - 1 ||
    tanggal.getUTCDate() !== day
  ) {
    return null;
  }

  return tanggal;
}

function getHariMinggu(tanggal: Date): HariMinggu | null {
  const hariMap: Partial<Record<number, HariMinggu>> = {
    1: "SENIN",
    2: "SELASA",
    3: "RABU",
    4: "KAMIS",
    5: "JUMAT",
    6: "SABTU",
  };

  return hariMap[tanggal.getUTCDay()] ?? null;
}

function getPeriodeAkademik(tanggal: Date): {
  tahunAjaran: string;
  semester: SemesterAkademik;
} {
  const tahun = tanggal.getUTCFullYear();
  const bulan = tanggal.getUTCMonth() + 1;

  if (bulan >= 7) {
    return {
      tahunAjaran: `${tahun}/${tahun + 1}`,
      semester: "GANJIL",
    };
  }

  return {
    tahunAjaran: `${tahun - 1}/${tahun}`,
    semester: "GENAP",
  };
}

function hitungTidakHadir(total: number, hadir: number, terlambat: number) {
  return Math.max(total - hadir - terlambat, 0);
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (
      !session?.user ||
      !["ADMIN", "PIMPINAN", "GURU", "STAFF"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tanggalParam = searchParams.get("tanggal");
    const tanggal = parseTanggal(tanggalParam);

    if (!tanggal) {
      return NextResponse.json(
        {
          error: "Format tanggal tidak valid. Gunakan YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    const hariIni = getHariMinggu(tanggal);

    const { tahunAjaran, semester } = getPeriodeAkademik(tanggal);

    const [
      totalGuru,
      totalStaff,
      totalSiswa,
      absensiSiswaHariIni,
      absensiHariIni,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: "GURU",
          aktif: true,
        },
      }),

      prisma.user.count({
        where: {
          role: "STAFF",
          aktif: true,
        },
      }),

      prisma.siswa.count({
        where: {
          aktif: true,
        },
      }),

      prisma.absensiSiswa.findMany({
        where: {
          tanggal,
        },
        select: {
          status: true,
        },
      }),

      prisma.absensi.findMany({
        where: {
          tanggal,
          tipe: "BERANGKAT",
        },
        select: {
          status: true,
          user: {
            select: {
              role: true,
              aktif: true,
            },
          },
        },
      }),
    ]);

    /*
     * HADIR dan TERLAMBAT harus dihitung terpisah.
     * Jangan memasukkan TERLAMBAT ke jumlah HADIR.
     */
    const siswaHadir = absensiSiswaHariIni.filter(
      (absensi) => absensi.status === "HADIR",
    ).length;

    const siswaTerlambat = absensiSiswaHariIni.filter(
      (absensi) => absensi.status === "TERLAMBAT",
    ).length;

    const guruHadir = absensiHariIni.filter(
      (absensi) =>
        absensi.user.aktif &&
        absensi.user.role === "GURU" &&
        absensi.status === "HADIR",
    ).length;

    const guruTerlambat = absensiHariIni.filter(
      (absensi) =>
        absensi.user.aktif &&
        absensi.user.role === "GURU" &&
        absensi.status === "TERLAMBAT",
    ).length;

    const staffHadir = absensiHariIni.filter(
      (absensi) =>
        absensi.user.aktif &&
        absensi.user.role === "STAFF" &&
        absensi.status === "HADIR",
    ).length;

    const staffTerlambat = absensiHariIni.filter(
      (absensi) =>
        absensi.user.aktif &&
        absensi.user.role === "STAFF" &&
        absensi.status === "TERLAMBAT",
    ).length;

    const guruTidakHadir = hitungTidakHadir(
      totalGuru,
      guruHadir,
      guruTerlambat,
    );

    const staffTidakHadir = hitungTidakHadir(
      totalStaff,
      staffHadir,
      staffTerlambat,
    );

    const siswaTidakHadir = hitungTidakHadir(
      totalSiswa,
      siswaHadir,
      siswaTerlambat,
    );

    let guruId: string | undefined;

    if (session.user.role === "GURU") {
      const guru = await prisma.guru.findUnique({
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!guru) {
        return NextResponse.json({
          totalGuru,
          totalStaff,
          totalSiswa,

          guruHadir,
          guruTerlambat,
          guruTidakHadir,

          staffHadir,
          staffTerlambat,
          staffTidakHadir,

          siswaHadir,
          siswaTerlambat,
          siswaTidakHadir,

          periode: {
            tahunAjaran,
            semester,
          },

          jadwal: [],
        });
      }

      guruId = guru.id;
    }

    const jadwalHariIni =
      hariIni && session.user.role !== "STAFF"
        ? await prisma.jadwal.findMany({
            where: {
              hari: hariIni,
              aktif: true,

              tahunAjaran,
              semester,

              ...(guruId
                ? {
                    guruId,
                  }
                : {}),
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

            orderBy: {
              jamMulai: "asc",
            },
          })
        : [];

    const jadwalIds = jadwalHariIni.map((jadwal) => jadwal.id);

    const semuaAbsensiMengajar =
      jadwalIds.length > 0
        ? await prisma.absensi.findMany({
            where: {
              tipe: "JAM_MENGAJAR",
              tanggal,
              jadwalId: {
                in: jadwalIds,
              },
            },

            select: {
              userId: true,
              jadwalId: true,
              status: true,
              waktuScan: true,
            },
          })
        : [];

    const absensiMengajarByJadwal = new Map(
      semuaAbsensiMengajar.map((absensi) => [
        `${absensi.userId}:${absensi.jadwalId}`,
        absensi,
      ]),
    );

    const jadwalDenganStatus = jadwalHariIni.map((jadwal) => {
      const absensi = absensiMengajarByJadwal.get(
        `${jadwal.guru.userId}:${jadwal.id}`,
      );

      return {
        id: jadwal.id,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,

        guru: jadwal.guru.user.nama,
        guruId: jadwal.guru.userId,
        noWa: jadwal.guru.user.noWa,

        mapel: jadwal.mataPelajaran.nama,
        kelas: jadwal.kelas.nama,
        ruangan: jadwal.ruangan.nama,

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
      guruTidakHadir,

      staffHadir,
      staffTerlambat,
      staffTidakHadir,

      siswaHadir,
      siswaTerlambat,
      siswaTidakHadir,

      periode: {
        tahunAjaran,
        semester,
      },

      jadwal: jadwalDenganStatus,
    });
  } catch (error) {
    console.error("DASHBOARD_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
