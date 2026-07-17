import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta, timeJakarta } from "@/lib/time";

function toMinutes(time: string) {
  const [jam, menit] = time.split(":").map(Number);
  return jam * 60 + menit;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (
      !session?.user ||
      !["ADMIN", "PIMPINAN", "GURU", "STAFF"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const { kodeQr: rawKodeQr } = body as {
      kodeQr?: unknown;
    };

    const kodeQr = typeof rawKodeQr === "string" ? rawKodeQr.trim() : "";

    if (!kodeQr) {
      return NextResponse.json({ error: "QR tidak valid" }, { status: 400 });
    }

    const siswa = await prisma.siswa.findUnique({
      where: {
        kodeQr,
      },
      include: {
        kelas: true,
      },
    });

    if (!siswa || !siswa.aktif) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    const tanggal = todayJakarta();
    const now = nowJakarta();
    const jamSekarang = timeJakarta();

    const sudahAbsen = await prisma.absensiSiswa.findFirst({
      where: {
        siswaId: siswa.id,
        tanggal,
      },
    });

    if (sudahAbsen) {
      return NextResponse.json(
        {
          error: `${siswa.nama} sudah absen hari ini`,
        },
        { status: 409 },
      );
    }

    const pengaturan = await prisma.pengaturan.findFirst();

    const jamBerangkatMulai = pengaturan?.jamBerangkatMulai ?? "07:00";

    const jamBerangkatHadirSelesai =
      pengaturan?.jamBerangkatHadirSelesai ?? "10:00";

    const jamBerangkatSelesai = pengaturan?.jamBerangkatSelesai ?? "12:00";

    const menitSekarang = toMinutes(jamSekarang);
    const menitMulai = toMinutes(jamBerangkatMulai);
    const menitBatasHadir = toMinutes(jamBerangkatHadirSelesai);
    const menitSelesai = toMinutes(jamBerangkatSelesai);

    if (menitSekarang < menitMulai) {
      return NextResponse.json(
        {
          error: `Absensi siswa dimulai pukul ${jamBerangkatMulai}`,
        },
        { status: 400 },
      );
    }

    if (menitSekarang > menitSelesai) {
      return NextResponse.json(
        {
          error: `Absensi siswa sudah ditutup pukul ${jamBerangkatSelesai}`,
        },
        { status: 400 },
      );
    }

    const status = menitSekarang > menitBatasHadir ? "TERLAMBAT" : "HADIR";

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
          include: {
            kelas: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      status,
      waktu: jamSekarang,
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
