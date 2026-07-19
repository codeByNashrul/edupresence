import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_PEMBACA_SISWA = ["ADMIN", "PIMPINAN", "GURU", "STAFF"] as const;

// GET — ambil siswa aktif
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canViewSiswa = ROLE_PEMBACA_SISWA.includes(
      session.user.role as (typeof ROLE_PEMBACA_SISWA)[number],
    );

    if (!canViewSiswa) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses ke data siswa",
        },
        { status: 403 },
      );
    }

    const isAdmin = session.user.role === "ADMIN";

    const siswa = await prisma.siswa.findMany({
      where: {
        aktif: true,
      },
      select: {
        id: true,
        nama: true,
        nis: true,
        jenisKelamin: true,
        kelas: {
          select: {
            id: true,
            nama: true,
          },
        },
        ...(isAdmin
          ? {
              kodeQr: true,
            }
          : {}),
      },
      orderBy: [
        {
          kelas: {
            nama: "asc",
          },
        },
        {
          nama: "asc",
        },
      ],
    });

    return NextResponse.json(siswa, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("SISWA_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data siswa" },
      { status: 500 },
    );
  }
}

// POST — tambah siswa, hanya ADMIN
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Hanya admin yang dapat menambah siswa",
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    const nama = typeof body.nama === "string" ? body.nama.trim() : "";

    const nis = typeof body.nis === "string" ? body.nis.trim() : "";

    const jenisKelamin =
      typeof body.jenisKelamin === "string"
        ? body.jenisKelamin.trim().toUpperCase()
        : "";

    const kelasId = typeof body.kelasId === "string" ? body.kelasId.trim() : "";

    if (!nama) {
      return NextResponse.json(
        { error: "Nama siswa wajib diisi" },
        { status: 400 },
      );
    }

    if (!nis) {
      return NextResponse.json({ error: "NIS wajib diisi" }, { status: 400 });
    }

    if (!["L", "P"].includes(jenisKelamin)) {
      return NextResponse.json(
        {
          error: "Jenis kelamin harus L atau P",
        },
        { status: 400 },
      );
    }

    if (!kelasId) {
      return NextResponse.json(
        { error: "Kelas wajib dipilih" },
        { status: 400 },
      );
    }

    const kelas = await prisma.kelas.findFirst({
      where: {
        id: kelasId,
        aktif: true,
      },
      select: {
        id: true,
      },
    });

    if (!kelas) {
      return NextResponse.json(
        {
          error: "Kelas tidak ditemukan atau sudah tidak aktif",
        },
        { status: 404 },
      );
    }

    const existing = await prisma.siswa.findUnique({
      where: {
        nis,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "NIS sudah digunakan" },
        { status: 409 },
      );
    }

    const kodeQr = crypto.randomUUID();

    const siswa = await prisma.siswa.create({
      data: {
        nama,
        nis,
        jenisKelamin,
        kelasId,
        kodeQr,
        aktif: true,
      },
      select: {
        id: true,
        nama: true,
        nis: true,
        jenisKelamin: true,
        kodeQr: true,
        kelas: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return NextResponse.json(siswa, {
      status: 201,
    });
  } catch (error) {
    console.error("SISWA_POST_ERROR:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "NIS sudah digunakan" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Gagal menambahkan siswa" },
      { status: 500 },
    );
  }
}
