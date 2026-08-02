import {
  HariMinggu,
  Prisma,
  SemesterAkademik,
  StatusTukarJadwal,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const JADWAL_SELECT = {
  id: true,
  guruId: true,
  kelasId: true,
  mataPelajaranId: true,
  ruanganId: true,

  hari: true,
  jamMulai: true,
  jamSelesai: true,

  tahunAjaran: true,
  semester: true,
  aktif: true,

  guru: {
    select: {
      id: true,
      userId: true,

      user: {
        select: {
          id: true,
          nama: true,
          noWa: true,
          aktif: true,
        },
      },
    },
  },

  kelas: {
    select: {
      id: true,
      nama: true,
    },
  },

  mataPelajaran: {
    select: {
      id: true,
      nama: true,
    },
  },

  ruangan: {
    select: {
      id: true,
      nama: true,
    },
  },
} satisfies Prisma.JadwalSelect;

type JadwalDetail = Prisma.JadwalGetPayload<{
  select: typeof JADWAL_SELECT;
}>;

export interface JadwalEfektifItem {
  /**
   * ID jadwal induk.
   * Tetap digunakan sebagai jadwalId pada absensi JAM_MENGAJAR.
   */
  id: string;
  jadwalId: string;

  tanggal: Date;
  tanggalKey: string;

  hari: HariMinggu;
  jamMulai: string;
  jamSelesai: string;

  tahunAjaran: string;
  semester: SemesterAkademik;

  guru: {
    id: string;
    userId: string;
    nama: string;
    noWa: string | null;
  };

  kelas: {
    id: string;
    nama: string;
  };

  mataPelajaran: {
    id: string;
    nama: string;
  };

  ruangan: {
    id: string;
    nama: string;
  };

  sumber: "INDUK" | "TUKAR";

  tukar: {
    id: string;
    peran: "PENGAJU" | "PENERIMA";

    ditukarDengan: {
      userId: string;
      nama: string;
    };

    jadwalAsli: {
      tanggal: string;
      hari: HariMinggu;
      jamMulai: string;
      jamSelesai: string;
    };

    slotTujuan: {
      jadwalId: string;
      tanggal: string;
      jamMulai: string;
      jamSelesai: string;
    };
  } | null;
}

type GetJadwalEfektifParams = {
  tanggal: Date;

  /**
   * Isi ketika hanya ingin mengambil jadwal seorang guru.
   * Gunakan userId, bukan guruId.
   */
  userId?: string;
};

function normalisasiTanggal(tanggal: Date) {
  return new Date(
    Date.UTC(
      tanggal.getUTCFullYear(),
      tanggal.getUTCMonth(),
      tanggal.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function tanggalSama(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

function formatTanggalKey(tanggal: Date) {
  return tanggal.toISOString().slice(0, 10);
}

function getHariMinggu(tanggal: Date): HariMinggu | null {
  const hariMap: Partial<Record<number, HariMinggu>> = {
    1: HariMinggu.SENIN,
    2: HariMinggu.SELASA,
    3: HariMinggu.RABU,
    4: HariMinggu.KAMIS,
    5: HariMinggu.JUMAT,
    6: HariMinggu.SABTU,
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
      semester: SemesterAkademik.GANJIL,
    };
  }

  return {
    tahunAjaran: `${tahun - 1}/${tahun}`,
    semester: SemesterAkademik.GENAP,
  };
}

function jadwalValid(jadwal: JadwalDetail) {
  return jadwal.aktif && jadwal.guru.user.aktif;
}

function buatJadwalInduk(
  jadwal: JadwalDetail,
  tanggal: Date,
  hari: HariMinggu,
): JadwalEfektifItem {
  return {
    id: jadwal.id,
    jadwalId: jadwal.id,

    tanggal,
    tanggalKey: formatTanggalKey(tanggal),

    hari,
    jamMulai: jadwal.jamMulai,
    jamSelesai: jadwal.jamSelesai,

    tahunAjaran: jadwal.tahunAjaran,
    semester: jadwal.semester,

    guru: {
      id: jadwal.guru.id,
      userId: jadwal.guru.userId,
      nama: jadwal.guru.user.nama,
      noWa: jadwal.guru.user.noWa,
    },

    kelas: {
      id: jadwal.kelas.id,
      nama: jadwal.kelas.nama,
    },

    mataPelajaran: {
      id: jadwal.mataPelajaran.id,
      nama: jadwal.mataPelajaran.nama,
    },

    ruangan: {
      id: jadwal.ruangan.id,
      nama: jadwal.ruangan.nama,
    },

    sumber: "INDUK",
    tukar: null,
  };
}

function buatJadwalTukar({
  tukarJadwalId,
  jadwalYangDipindah,
  jadwalPemilikSlot,
  tanggalEfektif,
  tanggalAsli,
  hariEfektif,
  peran,
}: {
  tukarJadwalId: string;
  jadwalYangDipindah: JadwalDetail;
  jadwalPemilikSlot: JadwalDetail;
  tanggalEfektif: Date;
  tanggalAsli: Date;
  hariEfektif: HariMinggu;
  peran: "PENGAJU" | "PENERIMA";
}): JadwalEfektifItem {
  return {
    /**
     * Jadwal ID tetap milik guru yang mengajar.
     * Yang berubah hanya tanggal dan jam efektif.
     */
    id: jadwalYangDipindah.id,
    jadwalId: jadwalYangDipindah.id,

    tanggal: tanggalEfektif,
    tanggalKey: formatTanggalKey(tanggalEfektif),

    hari: hariEfektif,

    /**
     * Jam mengikuti slot guru lain.
     */
    jamMulai: jadwalPemilikSlot.jamMulai,
    jamSelesai: jadwalPemilikSlot.jamSelesai,

    tahunAjaran: jadwalYangDipindah.tahunAjaran,
    semester: jadwalYangDipindah.semester,

    /**
     * Guru, mapel, kelas, dan ruangan tetap mengikuti
     * jadwal milik guru yang dipindahkan.
     */
    guru: {
      id: jadwalYangDipindah.guru.id,
      userId: jadwalYangDipindah.guru.userId,
      nama: jadwalYangDipindah.guru.user.nama,
      noWa: jadwalYangDipindah.guru.user.noWa,
    },

    kelas: {
      id: jadwalYangDipindah.kelas.id,
      nama: jadwalYangDipindah.kelas.nama,
    },

    mataPelajaran: {
      id: jadwalYangDipindah.mataPelajaran.id,
      nama: jadwalYangDipindah.mataPelajaran.nama,
    },

    ruangan: {
      id: jadwalYangDipindah.ruangan.id,
      nama: jadwalYangDipindah.ruangan.nama,
    },

    sumber: "TUKAR",

    tukar: {
      id: tukarJadwalId,
      peran,

      ditukarDengan: {
        userId: jadwalPemilikSlot.guru.userId,
        nama: jadwalPemilikSlot.guru.user.nama,
      },

      jadwalAsli: {
        tanggal: formatTanggalKey(tanggalAsli),
        hari: jadwalYangDipindah.hari,
        jamMulai: jadwalYangDipindah.jamMulai,
        jamSelesai: jadwalYangDipindah.jamSelesai,
      },

      slotTujuan: {
        jadwalId: jadwalPemilikSlot.id,
        tanggal: formatTanggalKey(tanggalEfektif),
        jamMulai: jadwalPemilikSlot.jamMulai,
        jamSelesai: jadwalPemilikSlot.jamSelesai,
      },
    },
  };
}

/**
 * Menghasilkan jadwal yang benar-benar berlaku pada satu tanggal.
 *
 * Jadwal induk tidak pernah diubah.
 * Pertukaran DISETUJUI diperlakukan sebagai pengecualian harian.
 */
export async function getJadwalEfektif({
  tanggal: tanggalInput,
  userId,
}: GetJadwalEfektifParams): Promise<JadwalEfektifItem[]> {
  const tanggal = normalisasiTanggal(tanggalInput);
  const hari = getHariMinggu(tanggal);

  if (!hari) {
    return [];
  }

  const periode = getPeriodeAkademik(tanggal);

  const [jadwalInduk, pertukaran] = await Promise.all([
    prisma.jadwal.findMany({
      where: {
        aktif: true,
        hari,
        tahunAjaran: periode.tahunAjaran,
        semester: periode.semester,
      },

      select: JADWAL_SELECT,

      orderBy: [
        {
          jamMulai: "asc",
        },
        {
          kelas: {
            nama: "asc",
          },
        },
      ],
    }),

    prisma.tukarJadwal.findMany({
      where: {
        status: StatusTukarJadwal.DISETUJUI,

        OR: [
          {
            tanggalJadwalPengaju: tanggal,
          },
          {
            tanggalJadwalPenerima: tanggal,
          },
        ],
      },

      select: {
        id: true,

        tanggalJadwalPengaju: true,
        tanggalJadwalPenerima: true,

        jadwalPengaju: {
          select: JADWAL_SELECT,
        },

        jadwalPenerima: {
          select: JADWAL_SELECT,
        },
      },
    }),
  ]);

  /**
   * Jadwal induk yang dipindahkan keluar dari tanggal ini
   * harus disembunyikan.
   */
  const jadwalYangDihapus = new Set<string>();

  const jadwalHasilTukar: JadwalEfektifItem[] = [];

  for (const tukar of pertukaran) {
    const jadwalPengaju = tukar.jadwalPengaju;
    const jadwalPenerima = tukar.jadwalPenerima;

    /**
     * Bila salah satu jadwal atau guru sudah tidak aktif,
     * abaikan pertukaran dan tampilkan jadwal induknya.
     */
    if (!jadwalValid(jadwalPengaju) || !jadwalValid(jadwalPenerima)) {
      continue;
    }

    /**
     * Pada tanggal jadwal pengaju:
     *
     * Jadwal pengaju dipindah keluar.
     * Jadwal penerima masuk ke slot milik pengaju.
     */
    if (tanggalSama(tukar.tanggalJadwalPengaju, tanggal)) {
      jadwalYangDihapus.add(jadwalPengaju.id);

      jadwalHasilTukar.push(
        buatJadwalTukar({
          tukarJadwalId: tukar.id,

          jadwalYangDipindah: jadwalPenerima,
          jadwalPemilikSlot: jadwalPengaju,

          tanggalEfektif: tanggal,
          tanggalAsli: tukar.tanggalJadwalPenerima,

          hariEfektif: hari,
          peran: "PENERIMA",
        }),
      );
    }

    /**
     * Pada tanggal jadwal penerima:
     *
     * Jadwal penerima dipindah keluar.
     * Jadwal pengaju masuk ke slot milik penerima.
     */
    if (tanggalSama(tukar.tanggalJadwalPenerima, tanggal)) {
      jadwalYangDihapus.add(jadwalPenerima.id);

      jadwalHasilTukar.push(
        buatJadwalTukar({
          tukarJadwalId: tukar.id,

          jadwalYangDipindah: jadwalPengaju,
          jadwalPemilikSlot: jadwalPenerima,

          tanggalEfektif: tanggal,
          tanggalAsli: tukar.tanggalJadwalPengaju,

          hariEfektif: hari,
          peran: "PENGAJU",
        }),
      );
    }
  }

  const jadwalIndukEfektif = jadwalInduk
    .filter(jadwalValid)
    .filter((jadwal) => !jadwalYangDihapus.has(jadwal.id))
    .map((jadwal) => buatJadwalInduk(jadwal, tanggal, hari));

  const semuaJadwal = [...jadwalIndukEfektif, ...jadwalHasilTukar]
    .filter((jadwal) => {
      if (!userId) return true;

      return jadwal.guru.userId === userId;
    })
    .sort((a, b) => {
      const urutanJam = a.jamMulai.localeCompare(b.jamMulai);

      if (urutanJam !== 0) {
        return urutanJam;
      }

      return a.kelas.nama.localeCompare(b.kelas.nama, "id-ID", {
        numeric: true,
      });
    });

  return semuaJadwal;
}
