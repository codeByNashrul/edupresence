import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta } from "@/lib/time";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kodeQr, kegiatanId } = await req.json();

    if (!kodeQr || !kegiatanId) {
      return NextResponse.json(
        { error: "QR siswa dan kegiatan wajib diisi" },
        { status: 400 },
      );
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

    const kegiatan = await prisma.kegiatanSiswa.findFirst({
      where: {
        id: kegiatanId,
        aktif: true,
      },
    });

    if (!kegiatan) {
      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan" },
        { status: 404 },
      );
    }

    const now = nowJakarta();

    const tanggalHariIni = new Date(now);
    tanggalHariIni.setHours(0, 0, 0, 0);

    const tanggalKegiatan = new Date(kegiatan.tanggal);
    tanggalKegiatan.setHours(0, 0, 0, 0);

    if (tanggalKegiatan.getTime() !== tanggalHariIni.getTime()) {
      return NextResponse.json(
        { error: "Kegiatan ini tidak dijadwalkan untuk hari ini" },
        { status: 400 },
      );
    }

    const sudahAbsen = await prisma.absensiKegiatanSiswa.findFirst({
      where: {
        siswaId: siswa.id,
        kegiatanId,
      },
    });

    if (sudahAbsen) {
      return NextResponse.json(
        { error: `${siswa.nama} sudah absen di kegiatan ini` },
        { status: 400 },
      );
    }

    const absensi = await prisma.absensiKegiatanSiswa.create({
      data: {
        siswaId: siswa.id,
        kegiatanId,
        waktuScan: now,
        status: "HADIR",
      },
    });

    return NextResponse.json({
      success: true,
      status: absensi.status,
      waktu: now.toLocaleTimeString("id-ID"),
      kegiatan: kegiatan.nama,
      siswa: {
        nama: siswa.nama,
        nis: siswa.nis,
        jenisKelamin: siswa.jenisKelamin,
        kelas: siswa.kelas.nama,
      },
    });
  } catch (error) {
    console.error("ABSENSI_KEGIATAN_SISWA_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
