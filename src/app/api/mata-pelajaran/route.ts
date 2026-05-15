import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mapel = await prisma.mataPelajaran.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(mapel);
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

    const { nama, kode } = await req.json();

    const existing = await prisma.mataPelajaran.findUnique({ where: { kode } });
    if (existing) {
      return NextResponse.json(
        { error: "Kode mapel sudah ada" },
        { status: 400 },
      );
    }

    const mapel = await prisma.mataPelajaran.create({
      data: { nama, kode },
    });

    return NextResponse.json(mapel, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
