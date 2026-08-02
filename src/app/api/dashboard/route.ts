import { NextResponse } from "next/server";
import {
  Role,
  StatusAbsensi,
  type HariMinggu,
  type SemesterAkademik,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getJadwalEfektif } from "@/lib/jadwal-efektif";

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

function hitungPersentase(jumlah: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((jumlah / total) * 100);
}

const EMPTY_KEHADIRAN_PEGAWAI = {
  total: 0,
  hadir: 0,
  terlambat: 0,
  izin: 0,
  sakit: 0,
  alpha: 0,
  hadirFisik: 0,
  tercatat: 0,
  belumTercatat: 0,
  tidakHadir: 0,
  persentaseKehadiranFisik: 0,
  persentaseStatusTercatat: 0,
};

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

    const isDashboardManajemen = memilikiRoleSession([
      Role.ADMIN,
      Role.PIMPINAN,
    ]);

    const isGuruSession = memilikiRoleSession([Role.GURU]);

    /*
     * Guru biasa tidak perlu menjalankan query statistik seluruh sekolah.
     * ADMIN/PIMPINAN yang juga memiliki role GURU tetap masuk dashboard manajemen.
     */
    if (isGuruSession && !isDashboardManajemen) {
      const guru = await prisma.guru.findUnique({
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!guru || !hariIni) {
        return NextResponse.json({
          totalGuru: 0,
          totalStaff: 0,
          totalSiswa: 0,

          totalPegawaiUnik: 0,
          pegawaiHadirUnik: 0,
          pegawaiTerlambatUnik: 0,
          pegawaiTidakHadirUnik: 0,

          kehadiranPegawai: EMPTY_KEHADIRAN_PEGAWAI,

          guruHadir: 0,
          guruTerlambat: 0,
          guruTidakHadir: 0,

          staffHadir: 0,
          staffTerlambat: 0,
          staffTidakHadir: 0,

          siswaHadir: 0,
          siswaTerlambat: 0,
          siswaTidakHadir: 0,

          periode: {
            tahunAjaran,
            semester,
          },

          jadwal: [],
        });
      }

      const jadwalHariIni = await getJadwalEfektif({
        tanggal,
        userId: session.user.id,
      });

      const jadwalIds = jadwalHariIni.map((jadwal) => jadwal.jadwalId);

      const semuaAbsensiMengajar =
        jadwalIds.length > 0
          ? await prisma.absensi.findMany({
              where: {
                userId: session.user.id,
                tipe: "JAM_MENGAJAR",
                tanggal,
                jadwalId: {
                  in: jadwalIds,
                },
              },

              select: {
                jadwalId: true,
                status: true,
                waktuScan: true,
              },
            })
          : [];

      const absensiMengajarByJadwal = new Map<
        string,
        (typeof semuaAbsensiMengajar)[number]
      >();

      for (const absensi of semuaAbsensiMengajar) {
        if (absensi.jadwalId) {
          absensiMengajarByJadwal.set(absensi.jadwalId, absensi);
        }
      }

      const jadwalDenganStatus = jadwalHariIni.map((jadwal) => {
        const absensi = absensiMengajarByJadwal.get(jadwal.jadwalId);

        return {
          id: jadwal.jadwalId,
          jamMulai: jadwal.jamMulai,
          jamSelesai: jadwal.jamSelesai,

          guru: jadwal.guru.nama,
          guruId: jadwal.guru.userId,
          noWa: jadwal.guru.noWa,

          mapel: jadwal.mataPelajaran.nama,
          kelas: jadwal.kelas.nama,
          ruangan: jadwal.ruangan.nama,

          status: absensi?.status ?? "BELUM",
          waktuScan: absensi?.waktuScan ?? null,

          sumberJadwal: jadwal.sumber,
          tukar: jadwal.tukar,
        };
      });

      return NextResponse.json({
        totalGuru: 0,
        totalStaff: 0,
        totalSiswa: 0,

        totalPegawaiUnik: 0,
        pegawaiHadirUnik: 0,
        pegawaiTerlambatUnik: 0,
        pegawaiTidakHadirUnik: 0,

        kehadiranPegawai: EMPTY_KEHADIRAN_PEGAWAI,

        guruHadir: 0,
        guruTerlambat: 0,
        guruTidakHadir: 0,

        staffHadir: 0,
        staffTerlambat: 0,
        staffTidakHadir: 0,

        siswaHadir: 0,
        siswaTerlambat: 0,
        siswaTidakHadir: 0,

        periode: {
          tahunAjaran,
          semester,
        },

        jadwal: jadwalDenganStatus,
      });
    }

    const [
      totalGuru,
      totalStaff,
      totalSiswa,
      absensiSiswaHariIni,
      absensiHariIni,
      pegawaiAktif,
    ] = await prisma.$transaction([
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
        orderBy: {
          createdAt: "desc",
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

    const hitungStatus = (
      data: typeof absensiPegawaiUnik,
      status: StatusAbsensi,
    ) => data.filter((absensi) => absensi.status === status).length;

    /**
     * Rekap seluruh pegawai unik.
     * Satu pegawai hanya dihitung satu kali dari absensi BERANGKAT.
     */
    const pegawaiHadirUnik = hitungStatus(
      absensiPegawaiUnik,
      StatusAbsensi.HADIR,
    );

    const pegawaiTerlambatUnik = hitungStatus(
      absensiPegawaiUnik,
      StatusAbsensi.TERLAMBAT,
    );

    const pegawaiIzinUnik = hitungStatus(
      absensiPegawaiUnik,
      StatusAbsensi.IZIN,
    );

    const pegawaiSakitUnik = hitungStatus(
      absensiPegawaiUnik,
      StatusAbsensi.SAKIT,
    );

    const pegawaiAlphaUnik = hitungStatus(
      absensiPegawaiUnik,
      StatusAbsensi.ALPHA,
    );

    const pegawaiHadirFisikUnik = pegawaiHadirUnik + pegawaiTerlambatUnik;

    const pegawaiTercatatUnik = absensiPegawaiUnik.length;

    const pegawaiBelumTercatatUnik = Math.max(
      totalPegawaiUnik - pegawaiTercatatUnik,
      0,
    );

    /**
     * Tidak hadir fisik mencakup:
     * IZIN + SAKIT + ALPHA + BELUM TERCATAT.
     */
    const pegawaiTidakHadirUnik = Math.max(
      totalPegawaiUnik - pegawaiHadirFisikUnik,
      0,
    );

    const persentaseKehadiranFisik = hitungPersentase(
      pegawaiHadirFisikUnik,
      totalPegawaiUnik,
    );

    const persentaseStatusTercatat = hitungPersentase(
      pegawaiTercatatUnik,
      totalPegawaiUnik,
    );

    const kehadiranPegawai = {
      total: totalPegawaiUnik,

      hadir: pegawaiHadirUnik,
      terlambat: pegawaiTerlambatUnik,
      izin: pegawaiIzinUnik,
      sakit: pegawaiSakitUnik,
      alpha: pegawaiAlphaUnik,

      hadirFisik: pegawaiHadirFisikUnik,
      tercatat: pegawaiTercatatUnik,
      belumTercatat: pegawaiBelumTercatatUnik,
      tidakHadir: pegawaiTidakHadirUnik,

      persentaseKehadiranFisik,
      persentaseStatusTercatat,
    };

    /**
     * Rekap siswa tetap seperti sebelumnya.
     */
    const siswaHadir = absensiSiswaHariIni.filter(
      (absensi) => absensi.status === StatusAbsensi.HADIR,
    ).length;

    const siswaTerlambat = absensiSiswaHariIni.filter(
      (absensi) => absensi.status === StatusAbsensi.TERLAMBAT,
    ).length;

    /**
     * Rekap guru memakai data pegawai yang sudah dibuat unik.
     */
    const absensiGuruUnik = absensiPegawaiUnik.filter((absensi) =>
      userMemilikiRole(absensi.user, Role.GURU),
    );

    const guruHadir = hitungStatus(absensiGuruUnik, StatusAbsensi.HADIR);

    const guruTerlambat = hitungStatus(
      absensiGuruUnik,
      StatusAbsensi.TERLAMBAT,
    );

    const guruIzin = hitungStatus(absensiGuruUnik, StatusAbsensi.IZIN);

    const guruSakit = hitungStatus(absensiGuruUnik, StatusAbsensi.SAKIT);

    const guruAlpha = hitungStatus(absensiGuruUnik, StatusAbsensi.ALPHA);

    const guruTercatat = absensiGuruUnik.length;

    const guruBelumTercatat = Math.max(totalGuru - guruTercatat, 0);

    const guruTidakHadir = Math.max(totalGuru - guruHadir - guruTerlambat, 0);

    /**
     * Rekap staff memakai data pegawai yang sudah dibuat unik.
     */
    const absensiStaffUnik = absensiPegawaiUnik.filter((absensi) =>
      userMemilikiRole(absensi.user, Role.STAFF),
    );

    const staffHadir = hitungStatus(absensiStaffUnik, StatusAbsensi.HADIR);

    const staffTerlambat = hitungStatus(
      absensiStaffUnik,
      StatusAbsensi.TERLAMBAT,
    );

    const staffIzin = hitungStatus(absensiStaffUnik, StatusAbsensi.IZIN);

    const staffSakit = hitungStatus(absensiStaffUnik, StatusAbsensi.SAKIT);

    const staffAlpha = hitungStatus(absensiStaffUnik, StatusAbsensi.ALPHA);

    const staffTercatat = absensiStaffUnik.length;

    const staffBelumTercatat = Math.max(totalStaff - staffTercatat, 0);

    const staffTidakHadir = Math.max(
      totalStaff - staffHadir - staffTerlambat,
      0,
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

    const jadwalHariIni =
      hariIni && dapatMelihatSemuaJadwal
        ? await getJadwalEfektif({
            tanggal,
          })
        : [];

    const jadwalIds = jadwalHariIni.map((jadwal) => jadwal.jadwalId);

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
        `${jadwal.guru.userId}:${jadwal.jadwalId}`,
      );

      return {
        id: jadwal.jadwalId,
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,

        guru: jadwal.guru.nama,
        guruId: jadwal.guru.userId,
        noWa: jadwal.guru.noWa,

        mapel: jadwal.mataPelajaran.nama,
        kelas: jadwal.kelas.nama,
        ruangan: jadwal.ruangan.nama,

        status: absensi?.status ?? "BELUM",
        waktuScan: absensi?.waktuScan ?? null,

        sumberJadwal: jadwal.sumber,
        tukar: jadwal.tukar,
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

      pegawaiIzinUnik,
      pegawaiSakitUnik,
      pegawaiAlphaUnik,
      pegawaiHadirFisikUnik,
      pegawaiTercatatUnik,
      pegawaiBelumTercatatUnik,

      persentaseKehadiranFisik,
      persentaseStatusTercatat,

      kehadiranPegawai,

      guruHadir,
      guruTerlambat,
      guruTidakHadir,
      guruIzin,
      guruSakit,
      guruAlpha,
      guruTercatat,
      guruBelumTercatat,

      staffHadir,
      staffTerlambat,
      staffTidakHadir,
      staffIzin,
      staffSakit,
      staffAlpha,
      staffTercatat,
      staffBelumTercatat,

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
