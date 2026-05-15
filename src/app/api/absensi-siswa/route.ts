import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta } from "@/lib/time";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (
      !session ||
      !["ADMIN", "PIMPINAN", "GURU", "STAFF"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kodeQr } = await req.json();

    if (!kodeQr) {
      return NextResponse.json({ error: "QR tidak valid" }, { status: 400 });
    }

    const siswa = await prisma.siswa.findUnique({
      where: { kodeQr },
      include: { kelas: true },
    });

    if (!siswa || !siswa.aktif) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    const tanggal = todayJakarta();
    const now = nowJakarta();

    const sudahAbsen = await prisma.absensiSiswa.findFirst({
      where: {
        siswaId: siswa.id,
        tanggal,
      },
    });

    if (sudahAbsen) {
      return NextResponse.json(
        { error: `${siswa.nama} sudah absen hari ini` },
        { status: 400 },
      );
    }

    const pengaturan = await prisma.pengaturan.findFirst();
    const toleransi = pengaturan?.toleransiMenit ?? 15;

    const [jamB, menitB] = (pengaturan?.jamBerangkatMulai ?? "06:00")
      .split(":")
      .map(Number);

    const jadwalBerangkat = new Date(now);
    jadwalBerangkat.setHours(jamB, menitB, 0, 0);

    const selisih = (now.getTime() - jadwalBerangkat.getTime()) / 60000;

    const status = selisih > toleransi ? "TERLAMBAT" : "HADIR";

    const absensi = await prisma.absensiSiswa.create({
      data: {
        siswaId: siswa.id,
        kelasId: siswa.kelasId,
        tanggal,
        waktuScan: now,
        status,
      },
      include: {
        siswa: {
          include: { kelas: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      status,
      waktu: now.toLocaleTimeString("id-ID"),
      siswa: {
        nama: siswa.nama,
        nis: siswa.nis,
        jenisKelamin: siswa.jenisKelamin,
        kelas: siswa.kelas.nama,
      },
      absensi,
    });
  } catch (error) {
    console.error("ABSENSI_SISWA_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
