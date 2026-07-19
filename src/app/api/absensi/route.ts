import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta, timeJakarta, dayJakarta } from "@/lib/time";
import type { HariMinggu } from "@prisma/client";

function toMinutes(time: string) {
  const match = time.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error(`Format waktu tidak valid: ${time}`);
  }

  const jam = Number(match[1]);
  const menit = Number(match[2]);

  if (
    !Number.isInteger(jam) ||
    !Number.isInteger(menit) ||
    jam < 0 ||
    jam > 23 ||
    menit < 0 ||
    menit > 59
  ) {
    throw new Error(`Nilai waktu tidak valid: ${time}`);
  }

  return jam * 60 + menit;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kodeQr } = await req.json();

    if (!kodeQr || typeof kodeQr !== "string") {
      return NextResponse.json(
        { error: "Kode QR wajib diisi" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const role = session.user.role;
    const now = nowJakarta();
    const tanggal = todayJakarta();
    const jamSekarang = timeJakarta();

    const pengaturan = await prisma.pengaturan.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
    });
    const jamBerangkatMulai = pengaturan?.jamBerangkatMulai ?? "07:00";

    const jamBerangkatHadirSelesai =
      pengaturan?.jamBerangkatHadirSelesai ?? "10:00";

    const jamBerangkatSelesai = pengaturan?.jamBerangkatSelesai ?? "12:00";

    const toleransiMengajarMenit = pengaturan?.toleransiMengajarMenit ?? 30;

    const jamPulangMulai = pengaturan?.jamPulangMulai ?? "12:00";
    const jamPulangSelesai = pengaturan?.jamPulangSelesai ?? "16:00";

    let tipe: "BERANGKAT" | "JAM_MENGAJAR" | "PULANG";
    let ruanganId: string | null = null;
    let ruanganNama = "";

    if (kodeQr === "ABSEN_BERANGKAT") {
      tipe = "BERANGKAT";
      ruanganNama = "QR Absen Berangkat";
    } else if (kodeQr === "ABSEN_PULANG") {
      tipe = "PULANG";
      ruanganNama = "QR Absen Pulang";
    } else {
      tipe = "JAM_MENGAJAR";

      const ruangan = await prisma.ruangan.findFirst({
        where: {
          kodeQr,
          aktif: true,
        },
      });

      if (!ruangan) {
        return NextResponse.json(
          { error: "QR Code tidak valid" },
          { status: 400 },
        );
      }

      ruanganId = ruangan.id;
      ruanganNama = ruangan.nama;
    }

    if (tipe !== "JAM_MENGAJAR") {
      const sudahScan = await prisma.absensi.findFirst({
        where: {
          userId,
          tipe,
          tanggal,
        },
      });

      if (sudahScan) {
        return NextResponse.json(
          {
            error: `Anda sudah melakukan absensi ${tipe
              .toLowerCase()
              .replace("_", " ")} hari ini`,
          },
          { status: 400 },
        );
      }
    }

    let status: "HADIR" | "TERLAMBAT" = "HADIR";
    let jadwalId: string | null = null;

    if (tipe === "BERANGKAT") {
      const menitSekarang = toMinutes(jamSekarang);
      const menitMulai = toMinutes(jamBerangkatMulai);
      const menitBatasHadir = toMinutes(jamBerangkatHadirSelesai);
      const menitSelesai = toMinutes(jamBerangkatSelesai);

      if (menitSekarang < menitMulai) {
        return NextResponse.json(
          {
            error: `Absensi berangkat dimulai pukul ${jamBerangkatMulai}`,
          },
          { status: 400 },
        );
      }

      if (menitSekarang > menitSelesai) {
        return NextResponse.json(
          {
            error: `Absensi berangkat sudah ditutup pukul ${jamBerangkatSelesai}`,
          },
          { status: 400 },
        );
      }

      status = menitSekarang > menitBatasHadir ? "TERLAMBAT" : "HADIR";
    }

    if (tipe === "PULANG") {
      const menitSekarang = toMinutes(jamSekarang);
      const menitMulaiPulang = toMinutes(jamPulangMulai);
      const menitSelesaiPulang = toMinutes(jamPulangSelesai);

      if (menitSekarang < menitMulaiPulang) {
        return NextResponse.json(
          {
            error: `Belum waktunya absen pulang. Mulai pukul ${jamPulangMulai}`,
          },
          { status: 400 },
        );
      }

      if (menitSekarang > menitSelesaiPulang) {
        return NextResponse.json(
          {
            error: `Absensi pulang sudah ditutup pukul ${jamPulangSelesai}`,
          },
          { status: 400 },
        );
      }

      status = "HADIR";
    }

    if (tipe === "JAM_MENGAJAR") {
      if (role !== "GURU") {
        return NextResponse.json(
          {
            error: "Hanya guru yang dapat absen jam mengajar",
          },
          { status: 400 },
        );
      }

      const hariSekarang = dayJakarta();

      if (hariSekarang === "MINGGU") {
        return NextResponse.json(
          {
            error: "Tidak ada jadwal mengajar pada hari Minggu",
          },
          { status: 400 },
        );
      }

      const hariIni = hariSekarang as HariMinggu;

      const guruData = await prisma.guru.findUnique({
        where: {
          userId,
        },
      });

      if (!guruData) {
        return NextResponse.json(
          { error: "Data guru tidak ditemukan" },
          { status: 400 },
        );
      }

      const jadwal = await prisma.jadwal.findFirst({
        where: {
          guruId: guruData.id,
          hari: hariIni,
          aktif: true,
          ruanganId: ruanganId ?? undefined,
          jamMulai: {
            lte: jamSekarang,
          },
          jamSelesai: {
            gte: jamSekarang,
          },
        },
      });

      if (!jadwal) {
        return NextResponse.json(
          {
            error: "Tidak ada jadwal mengajar aktif di ruangan ini",
          },
          { status: 400 },
        );
      }

      jadwalId = jadwal.id;

      const sudahScanJadwal = await prisma.absensi.findFirst({
        where: {
          userId,
          tipe: "JAM_MENGAJAR",
          jadwalId,
          tanggal,
        },
      });

      if (sudahScanJadwal) {
        return NextResponse.json(
          {
            error: "Anda sudah scan untuk jadwal mengajar ini",
          },
          { status: 400 },
        );
      }

      const selisihMenit = toMinutes(jamSekarang) - toMinutes(jadwal.jamMulai);

      status = selisihMenit > toleransiMengajarMenit ? "TERLAMBAT" : "HADIR";
    }

    const absensi = await prisma.absensi.create({
      data: {
        userId,
        ruanganId,
        jadwalId,
        tipe,
        status,
        waktuScan: now,
        tanggal,
      },
    });

    return NextResponse.json({
      success: true,
      id: absensi.id,
      tipe,
      status,
      waktu: jamSekarang,
      ruangan: ruanganNama,
    });
  } catch (error) {
    console.error("ABSENSI_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
