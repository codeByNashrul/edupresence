import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { todayJakarta, dayJakarta } from "@/lib/time";
import type { HariMinggu } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tanggal = todayJakarta();
    const hariSekarang = dayJakarta();

    const hariIni: HariMinggu | null =
      hariSekarang === "MINGGU" ? null : (hariSekarang as HariMinggu);

    const userId = session.user.id;
    const role = session.user.role;

    const [absensiHariIni, izinHariIni] = await Promise.all([
      prisma.absensi.findMany({
        where: {
          userId,
          tanggal,
        },
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
      }),

      prisma.izin.findFirst({
        where: {
          userId,
          status: "APPROVED",
          tanggalMulai: {
            lte: tanggal,
          },
          tanggalAkhir: {
            gte: tanggal,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const statusIzin =
      izinHariIni?.jenisIzin === "SAKIT"
        ? "SAKIT"
        : izinHariIni
          ? "IZIN"
          : null;

    const targets: any[] = [];

    const berangkat = absensiHariIni.find((a) => a.tipe === "BERANGKAT");

    targets.push({
      tipe: "BERANGKAT",
      label: "Absen Berangkat",
      detail: izinHariIni
        ? `Tercatat ${izinHariIni.jenisIzin.toLowerCase().replaceAll("_", " ")}`
        : "Scan QR saat datang ke sekolah",
      status: berangkat?.status ?? statusIzin ?? "BELUM",
      waktuScan: berangkat?.waktuScan ?? null,
      ruangan: berangkat?.ruangan?.nama ?? null,
      sumberStatus: berangkat ? "ABSENSI" : izinHariIni ? "IZIN" : null,
      izinId: !berangkat ? (izinHariIni?.id ?? null) : null,
      jenisIzin: !berangkat ? (izinHariIni?.jenisIzin ?? null) : null,
    });

    if (role === "GURU" && hariIni) {
      const guru = await prisma.guru.findUnique({
        where: {
          userId,
        },
      });

      if (guru) {
        const jadwalHariIni = await prisma.jadwal.findMany({
          where: {
            guruId: guru.id,
            hari: hariIni,
            aktif: true,
          },
          include: {
            kelas: true,
            mataPelajaran: true,
            ruangan: true,
          },
          orderBy: {
            jamMulai: "asc",
          },
        });

        for (const j of jadwalHariIni) {
          const absensiJadwal = absensiHariIni.find((a) => a.jadwalId === j.id);

          targets.push({
            jadwalId: j.id,
            tipe: "JAM_MENGAJAR",
            label: "Absen Jam Mengajar",
            detail: `${j.jamMulai} - ${j.jamSelesai} | ${j.mataPelajaran.nama} | ${j.kelas.nama} | ${j.ruangan.nama}`,
            status: absensiJadwal?.status ?? statusIzin ?? "BELUM",
            waktuScan: absensiJadwal?.waktuScan ?? null,
            ruangan: j.ruangan.nama,
            sumberStatus: absensiJadwal
              ? "ABSENSI"
              : izinHariIni
                ? "IZIN"
                : null,
            izinId: !absensiJadwal ? (izinHariIni?.id ?? null) : null,
            jenisIzin: !absensiJadwal ? (izinHariIni?.jenisIzin ?? null) : null,
          });
        }
      }
    }

    const pulang = absensiHariIni.find((a) => a.tipe === "PULANG");

    targets.push({
      tipe: "PULANG",
      label: "Absen Pulang",
      detail: izinHariIni
        ? `Tercatat ${izinHariIni.jenisIzin.toLowerCase().replaceAll("_", " ")}`
        : "Scan QR saat pulang",
      status: pulang?.status ?? statusIzin ?? "BELUM",
      waktuScan: pulang?.waktuScan ?? null,
      ruangan: pulang?.ruangan?.nama ?? null,
      sumberStatus: pulang ? "ABSENSI" : izinHariIni ? "IZIN" : null,
      izinId: !pulang ? (izinHariIni?.id ?? null) : null,
      jenisIzin: !pulang ? (izinHariIni?.jenisIzin ?? null) : null,
    });

    return NextResponse.json(targets, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("TARGET_ABSENSI_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
