import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_PEMBACA_GURU = ["ADMIN", "PIMPINAN", "GURU", "STAFF"] as const;

// GET — ambil semua guru
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !ROLE_PEMBACA_GURU.includes(
        session.user.role as (typeof ROLE_PEMBACA_GURU)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke data guru" },
        { status: 403 },
      );
    }

    const guru = await prisma.user.findMany({
      where: {
        role: "GURU",
        aktif: true,
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        noWa: true,
        aktif: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    return NextResponse.json(guru, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET_GURU_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data guru" },
      { status: 500 },
    );
  }
}

// POST — tambah guru baru, hanya ADMIN
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Hanya admin yang dapat menambah guru",
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    const nama = typeof body.nama === "string" ? body.nama.trim() : "";

    const nip = typeof body.nip === "string" ? body.nip.trim() : "";

    const noWa =
      typeof body.noWa === "string" && body.noWa.trim()
        ? body.noWa.trim()
        : null;

    const password = typeof body.password === "string" ? body.password : "";

    if (!nama) {
      return NextResponse.json(
        { error: "Nama guru wajib diisi" },
        { status: 400 },
      );
    }

    if (!nip) {
      return NextResponse.json({ error: "NIP wajib diisi" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Password minimal 6 karakter",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: {
        nip,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "NIP sudah terdaftar" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        nama,
        nip,
        noWa,
        password: hashedPassword,
        role: "GURU",
        aktif: true,
        guru: {
          create: {},
        },
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        noWa: true,
        aktif: true,
      },
    });

    return NextResponse.json(user, {
      status: 201,
    });
  } catch (error) {
    console.error("POST_GURU_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal menambahkan guru" },
      { status: 500 },
    );
  }
}
