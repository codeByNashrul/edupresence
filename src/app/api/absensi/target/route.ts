import { NextResponse } from "next/server";
import { Role, StatusAbsensi } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { todayJakarta } from "@/lib/time";
import { getJadwalEfektif, type JadwalEfektifItem } from "@/lib/jadwal-efektif";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

type TargetAbsensiItem = {
  jadwalId?: string;
  tipe: "BERANGKAT" | "JAM_MENGAJAR" | "PULANG";
  label: string;
  detail: string;
  status: StatusAbsensi | "BELUM";
  waktuScan: Date | null;
  ruangan: string | null;

  sumberStatus: "ABSENSI" | "IZIN" | null;
  izinId: string | null;
  jenisIzin: string | null;

  sumberJadwal?: "INDUK" | "TUKAR";
  tukar?: JadwalEfektifItem["tukar"];
};

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    const isGuru = sessionRoles.has(Role.GURU);
    const isStaff = sessionRoles.has(Role.STAFF);

    if (!isGuru && !isStaff) {
      return NextResponse.json(
        {
          error: "Target absensi hanya tersedia untuk guru dan staff",
        },
        { status: 403 },
      );
    }

    const tanggal = todayJakarta();

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

        orderBy: {
          createdAt: "desc",
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

    const statusIzin: StatusAbsensi | null =
      izinHariIni?.jenisIzin === "SAKIT"
        ? StatusAbsensi.SAKIT
        : izinHariIni
          ? StatusAbsensi.IZIN
          : null;

    const targets: TargetAbsensiItem[] = [];

    const berangkat = absensiHariIni.find(
      (absensi) => absensi.tipe === "BERANGKAT",
    );

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

    /**
     * Jadwal guru harus menggunakan jadwal efektif.
     *
     * Jadwal induk yang ditukar akan hilang dari tanggal asal,
     * sedangkan jadwal hasil pertukaran akan muncul di slot barunya.
     */
    if (isGuru) {
      const jadwalHariIni = await getJadwalEfektif({
        tanggal,
        userId,
      });

      for (const jadwal of jadwalHariIni) {
        const absensiJadwal = absensiHariIni.find(
          (absensi) =>
            absensi.tipe === "JAM_MENGAJAR" &&
            absensi.jadwalId === jadwal.jadwalId,
        );

        const informasiTukar =
          jadwal.sumber === "TUKAR" && jadwal.tukar
            ? ` | Tukar jam dengan ${jadwal.tukar.ditukarDengan.nama}`
            : "";

        targets.push({
          jadwalId: jadwal.jadwalId,
          tipe: "JAM_MENGAJAR",

          label:
            jadwal.sumber === "TUKAR"
              ? "Absen Jam Mengajar · Tukar"
              : "Absen Jam Mengajar",

          detail:
            `${jadwal.jamMulai} - ${jadwal.jamSelesai}` +
            ` | ${jadwal.mataPelajaran.nama}` +
            ` | ${jadwal.kelas.nama}` +
            ` | ${jadwal.ruangan.nama}` +
            informasiTukar,

          status: absensiJadwal?.status ?? statusIzin ?? "BELUM",

          waktuScan: absensiJadwal?.waktuScan ?? null,

          ruangan: jadwal.ruangan.nama,

          sumberStatus: absensiJadwal ? "ABSENSI" : izinHariIni ? "IZIN" : null,

          izinId: !absensiJadwal ? (izinHariIni?.id ?? null) : null,

          jenisIzin: !absensiJadwal ? (izinHariIni?.jenisIzin ?? null) : null,

          sumberJadwal: jadwal.sumber,
          tukar: jadwal.tukar,
        });
      }
    }

    const pulang = absensiHariIni.find((absensi) => absensi.tipe === "PULANG");

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
