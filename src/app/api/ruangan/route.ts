import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ruangan = await prisma.ruangan.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(ruangan);
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

    const existing = await prisma.ruangan.findUnique({ where: { nama } });
    if (existing) {
      return NextResponse.json({ error: "Ruangan sudah ada" }, { status: 400 });
    }

    // Generate kodeQr otomatis
    const kodeQr = `ROOM-${randomUUID().toUpperCase()}`;

    const ruangan = await prisma.ruangan.create({
      data: { nama, kodeQr },
    });

    return NextResponse.json(ruangan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
