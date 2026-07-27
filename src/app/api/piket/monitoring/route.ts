import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { todayJakarta, dayJakarta, timeJakarta } from "@/lib/time";
import type { HariMinggu } from "@prisma/client";

function toMinutes(time: string) {
  const [jam, menit] = time.split(":").map(Number);

  return jam * 60 + menit;
}

export async function GET() {
  try {
    const session = await auth();

    if (
      !session?.user ||
      !["ADMIN", "PIMPINAN", "PIKET"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tanggal = todayJakarta();

    const hari = dayJakarta();

    const jamSekarang = timeJakarta();

    if (!hari) {
      return NextResponse.json([]);
    }

    const semuaJadwal = await prisma.jadwal.findMany({
      where: {
        hari: hari as HariMinggu,
        aktif: true,
      },
      include: {
        guru: {
          include: {
            user: true,
          },
        },
        mataPelajaran: true,
        kelas: true,
        ruangan: true,
      },
      orderBy: {
        jamMulai: "asc",
      },
    });

    const sekarangMenit = toMinutes(jamSekarang);

    // tampilkan:
    // mulai 15 menit sebelum
    // sampai selesai jam pelajaran

    const jadwal = semuaJadwal.filter((j) => {
      const mulai = toMinutes(j.jamMulai) - 15;

      const selesai = toMinutes(j.jamSelesai);

      return sekarangMenit >= mulai && sekarangMenit <= selesai;
    });

    const absensi = await prisma.absensi.findMany({
      where: {
        tanggal,
        tipe: "JAM_MENGAJAR",
      },
    });

    const data = jadwal.map((j) => {
      const hadir = absensi.find(
        (a) => a.userId === j.guru.userId && a.jadwalId === j.id,
      );

      return {
        jadwalId: j.id,

        guru: j.guru.user.nama,

        noWa: j.guru.user.noWa,

        mapel: j.mataPelajaran.nama,

        kelas: j.kelas.nama,

        jam: `${j.jamMulai} - ${j.jamSelesai}`,

        ruangan: j.ruangan.nama,

        status: hadir?.status ?? "BELUM",

        waktuScan: hadir?.waktuScan ?? null,
      };
    });

    return NextResponse.json({
      total: data.length,

      hadir: data.filter(
        (d) => d.status === "HADIR" || d.status === "TERLAMBAT",
      ).length,

      belum: data.filter((d) => d.status === "BELUM").length,

      data,
    });
  } catch (error) {
    console.error("PIKET_MONITORING_ERROR", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
