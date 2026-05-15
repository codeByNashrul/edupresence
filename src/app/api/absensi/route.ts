import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta, timeJakarta } from "@/lib/time";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kodeQr } = await req.json();
    const userId = session.user.id;
    const role = session.user.role;
    const now = nowJakarta();
    const pengaturan = await prisma.pengaturan.findFirst();
    const toleransi = pengaturan?.toleransiMenit ?? 15;

    const tanggal = todayJakarta();

    const jamSekarang = timeJakarta();

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

      const ruangan = await prisma.ruangan.findUnique({
        where: { kodeQr, aktif: true },
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

    const sudahScan = await prisma.absensi.findFirst({
      where: {
        userId,
        tipe,
        tanggal,
        ...(tipe === "JAM_MENGAJAR" ? {} : {}),
      },
    });

    if (sudahScan && tipe !== "JAM_MENGAJAR") {
      return NextResponse.json(
        {
          error: `Anda sudah melakukan absensi ${tipe
            .toLowerCase()
            .replace("_", " ")} hari ini`,
        },
        { status: 400 },
      );
    }

    let status: "HADIR" | "TERLAMBAT" | "TIDAK_HADIR" = "HADIR";
    let jadwalId: string | null = null;

    if (tipe === "BERANGKAT") {
      const [jamB, menitB] = (pengaturan?.jamBerangkatMulai ?? "06:00")
        .split(":")
        .map(Number);

      const jadwalBerangkat = new Date(now);
      jadwalBerangkat.setHours(jamB, menitB, 0, 0);

      const selisih = (now.getTime() - jadwalBerangkat.getTime()) / 60000;

      if (selisih > toleransi) {
        status = "TERLAMBAT";
      }
    }

    if (tipe === "PULANG") {
      const jamPulangMulai = pengaturan?.jamPulangMulai ?? "13:00";

      if (jamSekarang < jamPulangMulai) {
        return NextResponse.json(
          {
            error: `Belum waktunya absen pulang. Mulai pukul ${jamPulangMulai}`,
          },
          { status: 400 },
        );
      }
    }

    if (tipe === "JAM_MENGAJAR") {
      if (role !== "GURU") {
        return NextResponse.json(
          { error: "Hanya guru yang dapat absen jam mengajar" },
          { status: 400 },
        );
      }

      const hariMap: Record<number, string> = {
        1: "SENIN",
        2: "SELASA",
        3: "RABU",
        4: "KAMIS",
        5: "JUMAT",
        6: "SABTU",
      };

      const hariIni = hariMap[now.getDay()];

      if (!hariIni) {
        return NextResponse.json(
          { error: "Tidak ada jadwal mengajar hari ini" },
          { status: 400 },
        );
      }

      const guruData = await prisma.guru.findFirst({
        where: { userId },
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
          hari: hariIni as any,
          aktif: true,
          ruanganId: ruanganId ?? undefined,
          jamMulai: { lte: jamSekarang },
          jamSelesai: { gte: jamSekarang },
        },
      });

      if (!jadwal) {
        return NextResponse.json(
          { error: "Tidak ada jadwal mengajar aktif di ruangan ini" },
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
          { error: "Anda sudah scan untuk jadwal mengajar ini" },
          { status: 400 },
        );
      }

      const [jamJ, menitJ] = jadwal.jamMulai.split(":").map(Number);

      const jadwalDate = new Date(now);
      jadwalDate.setHours(jamJ, menitJ, 0, 0);

      const selisih = (now.getTime() - jadwalDate.getTime()) / 60000;

      if (selisih > toleransi) {
        status = "TERLAMBAT";
      }
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
      waktu: now.toLocaleTimeString("id-ID"),
      ruangan: ruanganNama,
    });
  } catch (error) {
    console.error("ABSENSI_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
