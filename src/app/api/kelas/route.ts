import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kelas = await prisma.kelas.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(kelas);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nama } = await req.json();

    // Auto-detect tingkat dari nama kelas
    const tingkat = nama.split("-")[0].toUpperCase();

    const existing = await prisma.kelas.findUnique({ where: { nama } });
    if (existing) {
      return NextResponse.json({ error: "Kelas sudah ada" }, { status: 400 });
    }

    const kelas = await prisma.kelas.create({
      data: { nama, tingkat },
    });

    return NextResponse.json(kelas, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
