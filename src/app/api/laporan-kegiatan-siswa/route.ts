import { Role } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

const ALLOWED_ROLES = new Set<Role>([
  Role.ADMIN,
  Role.PIMPINAN,
  Role.GURU,
  Role.STAFF,
]);

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = getSessionRoles(session.user);

    const canView = Array.from(sessionRoles).some((role) =>
      ALLOWED_ROLES.has(role),
    );

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kegiatanId = searchParams.get("kegiatanId");

    const kegiatan = await prisma.kegiatanSiswa.findMany({
      where: {
        aktif: true,
      },
      select: {
        id: true,
        nama: true,
        tanggal: true,
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    if (!kegiatanId) {
      return NextResponse.json({
        kegiatan,
        laporan: [],
      });
    }

    const kegiatanAktif = kegiatan.find((item) => item.id === kegiatanId);

    if (!kegiatanAktif) {
      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan atau sudah tidak aktif" },
        { status: 404 },
      );
    }

    const laporan = await prisma.absensiKegiatanSiswa.findMany({
      where: {
        kegiatanId,
      },
      include: {
        siswa: {
          include: {
            kelas: true,
          },
        },
        kegiatan: true,
      },
      orderBy: {
        waktuScan: "asc",
      },
    });

    return NextResponse.json({
      kegiatan,
      laporan: laporan.map((item) => ({
        id: item.id,
        nama: item.siswa.nama,
        nis: item.siswa.nis,
        jenisKelamin: item.siswa.jenisKelamin,
        kelas: item.siswa.kelas.nama,
        status: item.status,
        waktuScan: item.waktuScan,
        kegiatan: item.kegiatan.nama,
      })),
    });
  } catch (error) {
    console.error("LAPORAN_KEGIATAN_SISWA_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
