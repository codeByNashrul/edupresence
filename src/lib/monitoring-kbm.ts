import {
  HariMinggu,
  JenisIzin,
  SapaanGuru,
  StatusAbsensi,
  StatusIzin,
  TipeAbsensi,
} from "@prisma/client";

import { getJadwalEfektif } from "@/lib/jadwal-efektif";
import { prisma } from "@/lib/prisma";

export type StatusMonitoringKbm =
  StatusAbsensi | "BELUM_MASUK" | "TIDAK_ADA_JADWAL";

export type MonitoringKbmBlock = {
  label: string;
  jamMulai: string;
  jamSelesai: string;
  midpoint: string;
};

export type MonitoringKbmItem = {
  kelasId: string;
  kelas: string;

  jadwalId: string | null;

  guru: {
    userId: string;
    nama: string;
    sapaan: SapaanGuru | null;
    namaLengkap: string;
  } | null;

  mapel: string | null;
  ruangan: string | null;

  status: StatusMonitoringKbm;
  sumberStatus: "JAM_MENGAJAR" | "IZIN" | "BERANGKAT" | null;

  waktuScan: Date | null;
};

export type MonitoringKbmResult = {
  tanggal: string;
  hari: HariMinggu;
  blok: MonitoringKbmBlock;
  totalKelas: number;

  ringkasan: {
    hadir: number;
    terlambat: number;
    izin: number;
    sakit: number;
    alpha: number;
    belumMasuk: number;
    tidakAdaJadwal: number;
  };

  data: MonitoringKbmItem[];
  anomali: string[];
  pesan: string;
};

const BLOK_SENIN_KAMIS: Omit<MonitoringKbmBlock, "midpoint">[] = [
  {
    label: "Jam 1 - 2",
    jamMulai: "07:10",
    jamSelesai: "08:20",
  },
  {
    label: "Jam 3 - 4",
    jamMulai: "08:20",
    jamSelesai: "09:30",
  },
  {
    label: "Jam 5 - 6",
    jamMulai: "09:55",
    jamSelesai: "11:05",
  },
  {
    label: "Jam 7 - 8",
    jamMulai: "11:05",
    jamSelesai: "12:15",
  },
];

const BLOK_JUMAT: Omit<MonitoringKbmBlock, "midpoint">[] = [
  {
    label: "Jam 1 - 2",
    jamMulai: "08:30",
    jamSelesai: "09:40",
  },
  {
    label: "Jam 3 - 4",
    jamMulai: "09:40",
    jamSelesai: "10:45",
  },
];

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  return hour * 60 + minute;
}

function toTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getMidpoint(jamMulai: string, jamSelesai: string) {
  const mulai = toMinutes(jamMulai);
  const selesai = toMinutes(jamSelesai);

  // Dibulatkan ke menit terdekat.
  // Jumat 09:40–10:45 => 10:12:30 => 10:13.
  return toTime(Math.round((mulai + selesai) / 2));
}

function denganMidpoint(
  blocks: Omit<MonitoringKbmBlock, "midpoint">[],
): MonitoringKbmBlock[] {
  return blocks.map((block) => ({
    ...block,
    midpoint: getMidpoint(block.jamMulai, block.jamSelesai),
  }));
}

const BLOK_PER_HARI: Partial<Record<HariMinggu, MonitoringKbmBlock[]>> = {
  [HariMinggu.SENIN]: denganMidpoint(BLOK_SENIN_KAMIS),
  [HariMinggu.SELASA]: denganMidpoint(BLOK_SENIN_KAMIS),
  [HariMinggu.RABU]: denganMidpoint(BLOK_SENIN_KAMIS),
  [HariMinggu.KAMIS]: denganMidpoint(BLOK_SENIN_KAMIS),
  [HariMinggu.JUMAT]: denganMidpoint(BLOK_JUMAT),

  // SABTU sengaja belum diaktifkan.
};

function formatTanggalKey(tanggal: Date) {
  return tanggal.toISOString().slice(0, 10);
}

export function parseTanggalMonitoring(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [tahun, bulan, hari] = value.split("-").map(Number);

  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari, 0, 0, 0, 0));

  if (
    tanggal.getUTCFullYear() !== tahun ||
    tanggal.getUTCMonth() !== bulan - 1 ||
    tanggal.getUTCDate() !== hari
  ) {
    return null;
  }

  return tanggal;
}

function getHari(tanggal: Date): HariMinggu | null {
  const map: Partial<Record<number, HariMinggu>> = {
    1: HariMinggu.SENIN,
    2: HariMinggu.SELASA,
    3: HariMinggu.RABU,
    4: HariMinggu.KAMIS,
    5: HariMinggu.JUMAT,
    6: HariMinggu.SABTU,
  };

  return map[tanggal.getUTCDay()] ?? null;
}

export function getBlokMonitoring(tanggal: Date): MonitoringKbmBlock[] {
  const hari = getHari(tanggal);

  if (!hari) {
    return [];
  }

  return BLOK_PER_HARI[hari] ?? [];
}

function namaDenganSapaan(sapaan: SapaanGuru | null, nama: string) {
  if (sapaan === SapaanGuru.USTADZ) {
    return `Ustadz ${nama}`;
  }

  if (sapaan === SapaanGuru.USTADZAH) {
    return `Ustadzah ${nama}`;
  }

  // Jangan menebak sapaan jika data kosong.
  return nama;
}

function isKelasSmp(nama: string) {
  return /^(VII|VIII|IX)\s*-\s*[A-Z]$/i.test(nama.trim());
}

function classOrder(nama: string) {
  const normalized = nama.toUpperCase();

  const tingkat =
    normalized.startsWith("VII ") || normalized.startsWith("VII -")
      ? 7
      : normalized.startsWith("VIII ") || normalized.startsWith("VIII -")
        ? 8
        : normalized.startsWith("IX ") || normalized.startsWith("IX -")
          ? 9
          : 99;

  const match = normalized.match(/-\s*([A-Z])/);
  const rombel = match?.[1]?.charCodeAt(0) ?? 999;

  return tingkat * 1000 + rombel;
}

function formatHariIndonesia(hari: HariMinggu) {
  const labels: Record<HariMinggu, string> = {
    SENIN: "Senin",
    SELASA: "Selasa",
    RABU: "Rabu",
    KAMIS: "Kamis",
    JUMAT: "Jumat",
    SABTU: "Sabtu",
  };

  return labels[hari];
}

function formatTanggalIndonesia(tanggal: string) {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);

  const bulanIndonesia = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${hari} ${bulanIndonesia[bulan - 1]} ${tahun}`;
}

function formatBarisMonitoring(item: MonitoringKbmResult["data"][number]) {
  if (!item.guru) {
    return `⚪ ${item.kelas} — *TIDAK ADA JADWAL*`;
  }

  const guru = `${item.kelas} — ${item.guru.namaLengkap}`;

  switch (item.status) {
    case StatusAbsensi.HADIR:
    case StatusAbsensi.TERLAMBAT:
      return `✅ ${guru}`;

    case StatusAbsensi.IZIN:
      return `🟡 ${guru} — *IZIN*`;

    case StatusAbsensi.SAKIT:
      return `🟣 ${guru} — *SAKIT*`;

    case StatusAbsensi.ALPHA:
      return `🔴 ${guru} — *ALPHA*`;

    case "BELUM_MASUK":
      return `🔴 ${guru} — *BELUM MASUK*`;

    case "TIDAK_ADA_JADWAL":
      return `⚪ ${item.kelas} — *TIDAK ADA JADWAL*`;
  }
}

function buatPesan(result: Omit<MonitoringKbmResult, "pesan">) {
  const jamMulai = result.blok.jamMulai.replace(":", ".");
  const jamSelesai = result.blok.jamSelesai.replace(":", ".");

  const lines = [
    `📚 *MONITORING KBM — ${result.blok.label}*`,
    `🕗 ${jamMulai}–${jamSelesai} | ${formatHariIndonesia(result.hari)}, ${formatTanggalIndonesia(result.tanggal)}`,
    "",
    "*Kehadiran per Kelas*",
  ];

  for (const item of result.data) {
    lines.push(formatBarisMonitoring(item));
  }

  lines.push("");
  lines.push(
    "_Tetap semangat dalam mendampingi proses belajar para santri 🫡_",
  );
  lines.push("");
  lines.push("_EduPresence • Monitoring KBM Otomatis_");

  return lines.join("\n");
}

export async function getMonitoringKbm(
  tanggal: Date,
): Promise<MonitoringKbmResult[]> {
  const hari = getHari(tanggal);

  if (!hari) {
    return [];
  }

  const blocks = BLOK_PER_HARI[hari] ?? [];

  // Sabtu sementara belum memiliki monitoring KBM.
  if (blocks.length === 0) {
    return [];
  }

  const jadwalEfektif = await getJadwalEfektif({
    tanggal,
  });

  const kelasAktif = await prisma.kelas.findMany({
    where: {
      aktif: true,
    },
    select: {
      id: true,
      nama: true,
    },
  });

  const kelas = kelasAktif
    .filter((item) => isKelasSmp(item.nama))
    .sort(
      (a, b) =>
        classOrder(a.nama) - classOrder(b.nama) ||
        a.nama.localeCompare(b.nama, "id-ID", {
          numeric: true,
        }),
    );

  const jadwalMonitoring = jadwalEfektif.filter((jadwal) =>
    blocks.some(
      (block) =>
        block.jamMulai === jadwal.jamMulai &&
        block.jamSelesai === jadwal.jamSelesai,
    ),
  );

  const jadwalIds = [
    ...new Set(jadwalMonitoring.map((jadwal) => jadwal.jadwalId)),
  ];

  const userIds = [
    ...new Set(jadwalMonitoring.map((jadwal) => jadwal.guru.userId)),
  ];

  const absensiMengajar =
    jadwalIds.length > 0
      ? await prisma.absensi.findMany({
          where: {
            tanggal,
            tipe: TipeAbsensi.JAM_MENGAJAR,
            jadwalId: {
              in: jadwalIds,
            },
            userId: {
              in: userIds,
            },
          },
          select: {
            userId: true,
            jadwalId: true,
            status: true,
            waktuScan: true,
          },
          orderBy: {
            waktuScan: "desc",
          },
        })
      : [];

  const izinHariIni =
    userIds.length > 0
      ? await prisma.izin.findMany({
          where: {
            userId: {
              in: userIds,
            },
            status: StatusIzin.APPROVED,
            tanggalMulai: {
              lte: tanggal,
            },
            tanggalAkhir: {
              gte: tanggal,
            },
          },
          select: {
            id: true,
            userId: true,
            jenisIzin: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];

  const absensiBerangkat =
    userIds.length > 0
      ? await prisma.absensi.findMany({
          where: {
            tanggal,
            tipe: TipeAbsensi.BERANGKAT,
            userId: {
              in: userIds,
            },
            status: {
              in: [
                StatusAbsensi.IZIN,
                StatusAbsensi.SAKIT,
                StatusAbsensi.ALPHA,
              ],
            },
          },
          select: {
            userId: true,
            status: true,
            waktuScan: true,
          },
          orderBy: {
            waktuScan: "desc",
          },
        })
      : [];

  const mengajarMap = new Map<string, (typeof absensiMengajar)[number]>();

  for (const absensi of absensiMengajar) {
    if (!absensi.jadwalId) continue;

    const key = `${absensi.userId}:${absensi.jadwalId}`;

    if (!mengajarMap.has(key)) {
      mengajarMap.set(key, absensi);
    }
  }

  const izinMap = new Map<string, (typeof izinHariIni)[number]>();

  for (const izin of izinHariIni) {
    if (!izinMap.has(izin.userId)) {
      izinMap.set(izin.userId, izin);
    }
  }

  const berangkatMap = new Map<string, (typeof absensiBerangkat)[number]>();

  for (const absensi of absensiBerangkat) {
    if (!berangkatMap.has(absensi.userId)) {
      berangkatMap.set(absensi.userId, absensi);
    }
  }

  const results: MonitoringKbmResult[] = [];

  for (const block of blocks) {
    const jadwalBlock = jadwalMonitoring.filter(
      (jadwal) =>
        jadwal.jamMulai === block.jamMulai &&
        jadwal.jamSelesai === block.jamSelesai,
    );

    const jadwalPerKelas = new Map<string, (typeof jadwalBlock)[number]>();

    const anomali: string[] = [];

    if (kelas.length !== 10) {
      anomali.push(
        `Jumlah kelas SMP aktif seharusnya 10, ditemukan ${kelas.length}`,
      );
    }

    for (const jadwal of jadwalBlock) {
      if (jadwalPerKelas.has(jadwal.kelas.id)) {
        anomali.push(
          `Kelas ${jadwal.kelas.nama} memiliki lebih dari satu jadwal efektif pada ${block.label}`,
        );

        continue;
      }

      jadwalPerKelas.set(jadwal.kelas.id, jadwal);
    }

    const data: MonitoringKbmItem[] = kelas.map((kelasItem) => {
      const jadwal = jadwalPerKelas.get(kelasItem.id);

      if (!jadwal) {
        anomali.push(
          `Kelas ${kelasItem.nama} tidak memiliki jadwal pada ${block.label}`,
        );

        return {
          kelasId: kelasItem.id,
          kelas: kelasItem.nama,

          jadwalId: null,

          guru: null,
          mapel: null,
          ruangan: null,

          status: "TIDAK_ADA_JADWAL",
          sumberStatus: null,
          waktuScan: null,
        };
      }

      const absensi = mengajarMap.get(
        `${jadwal.guru.userId}:${jadwal.jadwalId}`,
      );

      if (absensi) {
        return {
          kelasId: kelasItem.id,
          kelas: kelasItem.nama,

          jadwalId: jadwal.jadwalId,

          guru: {
            userId: jadwal.guru.userId,
            nama: jadwal.guru.nama,
            sapaan: jadwal.guru.sapaan,
            namaLengkap: namaDenganSapaan(jadwal.guru.sapaan, jadwal.guru.nama),
          },

          mapel: jadwal.mataPelajaran.nama,
          ruangan: jadwal.ruangan.nama,

          status: absensi.status,
          sumberStatus: "JAM_MENGAJAR",
          waktuScan: absensi.waktuScan,
        };
      }

      const izin = izinMap.get(jadwal.guru.userId);

      if (izin) {
        return {
          kelasId: kelasItem.id,
          kelas: kelasItem.nama,

          jadwalId: jadwal.jadwalId,

          guru: {
            userId: jadwal.guru.userId,
            nama: jadwal.guru.nama,
            sapaan: jadwal.guru.sapaan,
            namaLengkap: namaDenganSapaan(jadwal.guru.sapaan, jadwal.guru.nama),
          },

          mapel: jadwal.mataPelajaran.nama,
          ruangan: jadwal.ruangan.nama,

          status:
            izin.jenisIzin === JenisIzin.SAKIT
              ? StatusAbsensi.SAKIT
              : StatusAbsensi.IZIN,

          sumberStatus: "IZIN",
          waktuScan: null,
        };
      }

      const berangkat = berangkatMap.get(jadwal.guru.userId);

      if (berangkat) {
        return {
          kelasId: kelasItem.id,
          kelas: kelasItem.nama,

          jadwalId: jadwal.jadwalId,

          guru: {
            userId: jadwal.guru.userId,
            nama: jadwal.guru.nama,
            sapaan: jadwal.guru.sapaan,
            namaLengkap: namaDenganSapaan(jadwal.guru.sapaan, jadwal.guru.nama),
          },

          mapel: jadwal.mataPelajaran.nama,
          ruangan: jadwal.ruangan.nama,

          status: berangkat.status,
          sumberStatus: "BERANGKAT",
          waktuScan: berangkat.waktuScan,
        };
      }

      return {
        kelasId: kelasItem.id,
        kelas: kelasItem.nama,

        jadwalId: jadwal.jadwalId,

        guru: {
          userId: jadwal.guru.userId,
          nama: jadwal.guru.nama,
          sapaan: jadwal.guru.sapaan,
          namaLengkap: namaDenganSapaan(jadwal.guru.sapaan, jadwal.guru.nama),
        },

        mapel: jadwal.mataPelajaran.nama,
        ruangan: jadwal.ruangan.nama,

        status: "BELUM_MASUK",
        sumberStatus: null,
        waktuScan: null,
      };
    });

    const ringkasan = {
      hadir: data.filter((item) => item.status === StatusAbsensi.HADIR).length,

      terlambat: data.filter((item) => item.status === StatusAbsensi.TERLAMBAT)
        .length,

      izin: data.filter((item) => item.status === StatusAbsensi.IZIN).length,

      sakit: data.filter((item) => item.status === StatusAbsensi.SAKIT).length,

      alpha: data.filter((item) => item.status === StatusAbsensi.ALPHA).length,

      belumMasuk: data.filter((item) => item.status === "BELUM_MASUK").length,

      tidakAdaJadwal: data.filter((item) => item.status === "TIDAK_ADA_JADWAL")
        .length,
    };

    const resultTanpaPesan = {
      tanggal: formatTanggalKey(tanggal),
      hari,
      blok: block,
      totalKelas: data.length,
      ringkasan,
      data,
      anomali,
    };

    results.push({
      ...resultTanpaPesan,
      pesan: buatPesan(resultTanpaPesan),
    });
  }

  return results;
}
