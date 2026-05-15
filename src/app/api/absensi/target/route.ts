import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta, timeJakarta, dayJakarta } from "@/lib/time";

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tanggal = todayJakarta();

    const hariMap: Record<number, string> = {
      1: "SENIN",
      2: "SELASA",
      3: "RABU",
      4: "KAMIS",
      5: "JUMAT",
      6: "SABTU",
    };

    const hariIni = dayJakarta();
    const userId = session.user.id;
    const role = session.user.role;

    const absensiHariIni = await prisma.absensi.findMany({
      where: { userId, tanggal },
      include: {
        ruangan: true,
        jadwal: {
          include: {
            kelas: true,
            mataPelajaran: true,
            ruangan: true,
          },
        },
      },
    });

    const targets: any[] = [];

    const berangkat = absensiHariIni.find((a) => a.tipe === "BERANGKAT");

    targets.push({
      tipe: "BERANGKAT",
      label: "Absen Berangkat",
      detail: "Scan QR saat datang ke sekolah",
      status: berangkat?.status ?? "BELUM",
      waktuScan: berangkat?.waktuScan ?? null,
      ruangan: berangkat?.ruangan?.nama ?? null,
    });

    if (role === "GURU" && hariIni) {
      const guru = await prisma.guru.findUnique({
        where: { userId },
      });

      if (guru) {
        const jadwalHariIni = await prisma.jadwal.findMany({
          where: {
            guruId: guru.id,
            hari: hariIni as any,
            aktif: true,
          },
          include: {
            kelas: true,
            mataPelajaran: true,
            ruangan: true,
          },
          orderBy: { jamMulai: "asc" },
        });

        for (const j of jadwalHariIni) {
          const absensiJadwal = absensiHariIni.find((a) => a.jadwalId === j.id);

          targets.push({
            tipe: "JAM_MENGAJAR",
            label: "Absen Jam Mengajar",
            detail: `${j.jamMulai} - ${j.jamSelesai} | ${j.mataPelajaran.nama} | ${j.kelas.nama} | ${j.ruangan.nama}`,
            status: absensiJadwal?.status ?? "BELUM",
            waktuScan: absensiJadwal?.waktuScan ?? null,
            ruangan: absensiJadwal?.ruangan?.nama ?? null,
          });
        }
      }
    }

    const pulang = absensiHariIni.find((a) => a.tipe === "PULANG");

    targets.push({
      tipe: "PULANG",
      label: "Absen Pulang",
      detail: "Scan QR saat pulang",
      status: pulang?.status ?? "BELUM",
      waktuScan: pulang?.waktuScan ?? null,
      ruangan: pulang?.ruangan?.nama ?? null,
    });

    return NextResponse.json(targets);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
