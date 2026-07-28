import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_PEMBACA_STAFF = ["ADMIN", "PIMPINAN", "GURU", "STAFF"] as const;

function getSessionRoles(user: { role?: string; roles?: string[] }) {
  return Array.from(
    new Set(
      [user.role, ...(Array.isArray(user.roles) ? user.roles : [])].filter(
        (role): role is string => typeof role === "string" && role.length > 0,
      ),
    ),
  );
}

function memilikiSalahSatuRole(
  userRoles: string[],
  allowedRoles: readonly string[],
) {
  return allowedRoles.some((role) => userRoles.includes(role));
}

// GET — ambil semua staff aktif
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = getSessionRoles(session.user);

    if (!memilikiSalahSatuRole(userRoles, ROLE_PEMBACA_STAFF)) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses ke data staff",
        },
        { status: 403 },
      );
    }

    const staff = await prisma.user.findMany({
      where: {
        aktif: true,
        OR: [
          {
            role: Role.STAFF,
          },
          {
            rolesTambahan: {
              has: Role.STAFF,
            },
          },
        ],
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        noWa: true,
        aktif: true,
        role: true,
        rolesTambahan: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    return NextResponse.json(staff, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET_STAFF_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data staff" },
      { status: 500 },
    );
  }
}

// POST — tambah staff baru, hanya ADMIN
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = getSessionRoles(session.user);

    if (!userRoles.includes(Role.ADMIN)) {
      return NextResponse.json(
        {
          error: "Hanya admin yang dapat menambah staff",
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
        { error: "Nama staff wajib diisi" },
        { status: 400 },
      );
    }

    if (!nip) {
      return NextResponse.json({ error: "NIP wajib diisi" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
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
        role: Role.STAFF,
        rolesTambahan: [],
        aktif: true,
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        noWa: true,
        aktif: true,
        role: true,
        rolesTambahan: true,
      },
    });

    return NextResponse.json(user, {
      status: 201,
    });
  } catch (error) {
    console.error("POST_STAFF_ERROR:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "NIP sudah terdaftar" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Gagal menambahkan staff" },
      { status: 500 },
    );
  }
}
