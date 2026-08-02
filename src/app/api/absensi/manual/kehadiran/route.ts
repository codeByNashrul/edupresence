import {
  Role,
  SumberAbsensi,
  StatusAbsensi,
  TipeAbsensi,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nowJakarta, timeJakarta, todayJakarta } from "@/lib/time";

const ROLE_INPUT_MANUAL = new Set<Role>([Role.ADMIN, Role.PIKET]);

const STATUS_MANUAL = new Set<StatusAbsensi>([
  StatusAbsensi.HADIR,
  StatusAbsensi.TERLAMBAT,
  StatusAbsensi.IZIN,
  StatusAbsensi.SAKIT,
  StatusAbsensi.ALPHA,
]);

const TIPE_KEHADIRAN = new Set<TipeAbsensi>([
  TipeAbsensi.BERANGKAT,
  TipeAbsensi.PULANG,
]);

const ROLE_LIHAT_KEHADIRAN = new Set<Role>([
  Role.ADMIN,
  Role.PIKET,
  Role.PIMPINAN,
]);

export async function GET() {
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

    const bolehMelihat = Array.from(sessionRoles).some((role) =>
      ROLE_LIHAT_KEHADIRAN.has(role),
    );

    if (!bolehMelihat) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses" },
        { status: 403 },
      );
    }

    const tanggal = todayJakarta();

    const users = await prisma.user.findMany({
      where: {
        aktif: true,
        OR: [
          {
            role: {
              in: [Role.GURU, Role.STAFF],
            },
          },
          {
            rolesTambahan: {
              hasSome: [Role.GURU, Role.STAFF],
            },
          },
        ],
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        role: true,
        rolesTambahan: true,
        absensi: {
          where: {
            tanggal,
            tipe: {
              in: [TipeAbsensi.BERANGKAT, TipeAbsensi.PULANG],
            },
          },
          select: {
            id: true,
            tipe: true,
            status: true,
            sumber: true,
            waktuScan: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        nama: "asc",
      },
    });

    const data = users.map((user) => {
      const berangkat =
        user.absensi.find((item) => item.tipe === TipeAbsensi.BERANGKAT) ??
        null;

      const pulang =
        user.absensi.find((item) => item.tipe === TipeAbsensi.PULANG) ?? null;

      return {
        id: user.id,
        nama: user.nama,
        nip: user.nip,
        roles: Array.from(new Set([user.role, ...user.rolesTambahan])),
        berangkat,
        pulang,
      };
    });

    return NextResponse.json({
      total: data.length,
      sudahBerangkat: data.filter((item) => item.berangkat).length,
      sudahPulang: data.filter((item) => item.pulang).length,
      data,
    });
  } catch (error) {
    console.error("GET_KEHADIRAN_PEGAWAI_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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

    const body: unknown = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const {
      userId: rawUserId,
      tipe: rawTipe,
      status: rawStatus,
    } = body as {
      userId?: unknown;
      tipe?: unknown;
      status?: unknown;
    };

    const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";

    const tipeString =
      typeof rawTipe === "string" ? rawTipe.trim().toUpperCase() : "";

    const statusString =
      typeof rawStatus === "string" ? rawStatus.trim().toUpperCase() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "Pegawai wajib dipilih" },
        { status: 400 },
      );
    }

    const tipe = tipeString as TipeAbsensi;

    if (!TIPE_KEHADIRAN.has(tipe)) {
      return NextResponse.json(
        {
          error: "Jenis absensi hanya boleh BERANGKAT atau PULANG",
        },
        { status: 400 },
      );
    }

    const status = statusString as StatusAbsensi;

    if (!STATUS_MANUAL.has(status)) {
      return NextResponse.json(
        {
          error: "Status hanya boleh HADIR, TERLAMBAT, IZIN, SAKIT, atau ALPHA",
        },
        { status: 400 },
      );
    }

    const pegawai = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        nama: true,
        aktif: true,
        role: true,
        rolesTambahan: true,
      },
    });

    if (!pegawai || !pegawai.aktif) {
      return NextResponse.json(
        {
          error: "Pegawai tidak ditemukan atau sudah tidak aktif",
        },
        { status: 404 },
      );
    }

    const semuaRolePegawai = new Set<Role>([
      pegawai.role,
      ...pegawai.rolesTambahan,
    ]);

    const merupakanPegawai =
      semuaRolePegawai.has(Role.GURU) || semuaRolePegawai.has(Role.STAFF);

    if (!merupakanPegawai) {
      return NextResponse.json(
        {
          error: "Absensi hanya dapat diberikan kepada guru atau staff",
        },
        { status: 400 },
      );
    }

    const tanggal = todayJakarta();

    const absensiLama = await prisma.absensi.findFirst({
      where: {
        userId: pegawai.id,
        tipe,
        tanggal,
      },
      select: {
        id: true,
        status: true,
        sumber: true,
        waktuScan: true,
      },
    });

    if (absensiLama) {
      return NextResponse.json(
        {
          error: `${pegawai.nama} sudah memiliki absensi ${tipe.toLowerCase()} dengan status ${absensiLama.status}`,
          existing: absensiLama,
        },
        { status: 409 },
      );
    }

    const absensi = await prisma.absensi.create({
      data: {
        userId: pegawai.id,
        tipe,
        status,
        tanggal,
        waktuScan: nowJakarta(),

        sumber: SumberAbsensi.MANUAL,
        dicatatOlehId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Absensi ${tipe.toLowerCase()} ${pegawai.nama} berhasil disimpan`,
      pegawai: {
        id: pegawai.id,
        nama: pegawai.nama,
      },
      absensi: {
        id: absensi.id,
        tipe: absensi.tipe,
        status: absensi.status,
        sumber: absensi.sumber,
        waktuScan: absensi.waktuScan,
      },
      waktu: timeJakarta(),
    });
  } catch (error) {
    console.error("ABSENSI_MANUAL_KEHADIRAN_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
