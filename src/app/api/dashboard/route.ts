import { NextResponse } from "next/server";
import { Role, type HariMinggu, type SemesterAkademik } from "@prisma/client";

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

function userMemilikiRole(
  user: {
    role: Role;
    rolesTambahan: Role[];
  },
  targetRole: Role,
) {
  return user.role === targetRole || user.rolesTambahan.includes(targetRole);
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = Array.from(
      new Set([
        session.user.role,
        ...(Array.isArray(session.user.roles) ? session.user.roles : []),
      ]),
    );

    const memilikiRoleSession = (allowedRoles: Role[]) =>
      allowedRoles.some((allowedRole) => sessionRoles.includes(allowedRole));

    if (
      !memilikiRoleSession([Role.ADMIN, Role.PIMPINAN, Role.GURU, Role.STAFF])
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      pegawaiAktif,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          aktif: true,
          OR: [
            {
              role: Role.GURU,
            },
            {
              rolesTambahan: {
                has: Role.GURU,
              },
            },
          ],
        },
      }),
      prisma.user.count({
        where: {
          aktif: true,
          OR: [
            {
              role: Role.STAFF,
            },
            {
              rolesTambahan: {
                has: Role.STAFF,
              },
            },
          ],
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
          userId: true,
          status: true,
          user: {
            select: {
              role: true,
              rolesTambahan: true,
              aktif: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: {
          aktif: true,
          OR: [
            {
              role: {
                in: [Role.GURU, Role.STAFF],
              },
            },
            {
              rolesTambahan: {
                hasSome: [Role.GURU, Role.STAFF],
              },
            },
          ],
        },
        select: {
          id: true,
        },
      }),
    ]);

    const totalPegawaiUnik = pegawaiAktif.length;

    const absensiPegawaiByUser = new Map<
      string,
      (typeof absensiHariIni)[number]
    >();

    for (const absensi of absensiHariIni) {
      const termasukPegawai =
        userMemilikiRole(absensi.user, Role.GURU) ||
        userMemilikiRole(absensi.user, Role.STAFF);

      if (
        absensi.user.aktif &&
        termasukPegawai &&
        !absensiPegawaiByUser.has(absensi.userId)
      ) {
        absensiPegawaiByUser.set(absensi.userId, absensi);
      }
    }

    const absensiPegawaiUnik = Array.from(absensiPegawaiByUser.values());

    const pegawaiHadirUnik = absensiPegawaiUnik.filter(
      (absensi) => absensi.status === "HADIR",
    ).length;

    const pegawaiTerlambatUnik = absensiPegawaiUnik.filter(
      (absensi) => absensi.status === "TERLAMBAT",
    ).length;

    const pegawaiTidakHadirUnik = hitungTidakHadir(
      totalPegawaiUnik,
      pegawaiHadirUnik,
      pegawaiTerlambatUnik,
    );
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
        userMemilikiRole(absensi.user, Role.GURU) &&
        absensi.status === "HADIR",
    ).length;

    const guruTerlambat = absensiHariIni.filter(
      (absensi) =>
        absensi.user.aktif &&
        userMemilikiRole(absensi.user, Role.GURU) &&
        absensi.status === "TERLAMBAT",
    ).length;

    const staffHadir = absensiHariIni.filter(
      (absensi) =>
        absensi.user.aktif &&
        userMemilikiRole(absensi.user, Role.STAFF) &&
        absensi.status === "HADIR",
    ).length;

    const staffTerlambat = absensiHariIni.filter(
      (absensi) =>
        absensi.user.aktif &&
        userMemilikiRole(absensi.user, Role.STAFF) &&
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

    const dapatMelihatSemuaJadwal = memilikiRoleSession([
      Role.ADMIN,
      Role.PIMPINAN,
    ]);

    const memilikiPeranGuru = memilikiRoleSession([Role.GURU]);

    let guruId: string | undefined;

    if (memilikiPeranGuru && !dapatMelihatSemuaJadwal) {
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

          totalPegawaiUnik,
          pegawaiHadirUnik,
          pegawaiTerlambatUnik,
          pegawaiTidakHadirUnik,

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
      hariIni && (dapatMelihatSemuaJadwal || memilikiPeranGuru)
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

      totalPegawaiUnik,
      pegawaiHadirUnik,
      pegawaiTerlambatUnik,
      pegawaiTidakHadirUnik,

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
