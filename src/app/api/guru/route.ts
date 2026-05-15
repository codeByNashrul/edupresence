import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

// GET — ambil semua guru
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guru = await prisma.user.findMany({
      where: { role: "GURU", aktif: true },
      include: { guru: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(guru);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — tambah guru baru
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { nama, nip, noWa, password } = body;

    // Cek NIP sudah ada atau belum
    const existing = await prisma.user.findUnique({ where: { nip } });
    if (existing) {
      return NextResponse.json(
        { error: "NIP sudah terdaftar" },
        { status: 400 },
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
      include: { guru: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
