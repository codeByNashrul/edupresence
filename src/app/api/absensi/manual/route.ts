import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { todayJakarta, nowJakarta, dayJakarta } from "@/lib/time";
import { HariMinggu, Role, StatusAbsensi, SumberAbsensi } from "@prisma/client";

const STATUS_MANUAL: StatusAbsensi[] = [
  StatusAbsensi.HADIR,
  StatusAbsensi.TERLAMBAT,
  StatusAbsensi.IZIN,
  StatusAbsensi.SAKIT,
  StatusAbsensi.ALPHA,
];

const ROLE_INPUT_MANUAL = new Set<Role>([Role.ADMIN, Role.PIKET]);

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = new Set<Role>([
      session.user.role as Role,
      ...(Array.isArray(session.user.roles)
        ? (session.user.roles as Role[])
        : []),
    ]);

    const bolehInputManual = Array.from(sessionRoles).some((role) =>
      ROLE_INPUT_MANUAL.has(role),
    );

    if (!bolehInputManual) {
      return NextResponse.json(
        {
          error:
            "Hanya admin dan petugas piket yang dapat menginput absensi manual",
        },
        { status: 403 },
      );
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const { jadwalId: rawJadwalId, status: rawStatus } = body as {
      jadwalId?: unknown;
      status?: unknown;
    };

    const jadwalId = typeof rawJadwalId === "string" ? rawJadwalId.trim() : "";

    const statusString =
      typeof rawStatus === "string" ? rawStatus.trim().toUpperCase() : "";

    if (!jadwalId) {
      return NextResponse.json(
        { error: "Jadwal wajib dipilih" },
        { status: 400 },
      );
    }

    const status = statusString as StatusAbsensi;

    if (!STATUS_MANUAL.includes(status)) {
      return NextResponse.json(
        {
          error: "Status hanya boleh HADIR, TERLAMBAT, IZIN, SAKIT, atau ALPHA",
        },
        { status: 400 },
      );
    }

    const jadwal = await prisma.jadwal.findFirst({
      where: {
        id: jadwalId,
        aktif: true,
        guru: {
          user: {
            aktif: true,
          },
        },
      },
      include: {
        guru: {
          include: {
            user: true,
          },
        },
        ruangan: true,
        kelas: true,
        mataPelajaran: true,
      },
    });

    if (!jadwal) {
      return NextResponse.json(
        { error: "Jadwal aktif tidak ditemukan" },
        { status: 404 },
      );
    }

    /**
     * Mencegah admin mencatat jadwal hari lain
     * sebagai absensi hari ini.
     */
    const hariSekarang = dayJakarta();

    const hariIni: HariMinggu | null =
      hariSekarang === "MINGGU" ? null : (hariSekarang as HariMinggu);

    if (!hariIni || jadwal.hari !== hariIni) {
      return NextResponse.json(
        {
          error: `Jadwal ini berlaku hari ${jadwal.hari}, bukan hari ${hariSekarang}`,
        },
        { status: 400 },
      );
    }

    const tanggal = todayJakarta();

    const absensiLama = await prisma.absensi.findFirst({
      where: {
        userId: jadwal.guru.userId,
        jadwalId: jadwal.id,
        tipe: "JAM_MENGAJAR",
        tanggal,
      },
    });

    if (absensiLama) {
      return NextResponse.json(
        {
          error: `Jadwal ini sudah memiliki absensi dengan status ${absensiLama.status}`,
        },
        { status: 409 },
      );
    }

    const absensi = await prisma.absensi.create({
      data: {
        userId: jadwal.guru.userId,
        jadwalId: jadwal.id,
        ruanganId: jadwal.ruanganId,
        tipe: "JAM_MENGAJAR",
        status,
        tanggal,
        waktuScan: nowJakarta(),

        sumber: SumberAbsensi.MANUAL,
        dicatatOlehId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Status ${status} berhasil disimpan`,
      absensi: {
        id: absensi.id,
        status: absensi.status,
        guru: jadwal.guru.user.nama,
        kelas: jadwal.kelas.nama,
        mataPelajaran: jadwal.mataPelajaran.nama,
        ruangan: jadwal.ruangan.nama,
        jam: `${jadwal.jamMulai}–${jadwal.jamSelesai}`,
      },
    });
  } catch (error) {
    console.error("ABSENSI_MANUAL_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
