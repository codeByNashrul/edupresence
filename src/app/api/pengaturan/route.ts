import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pengaturan = await prisma.pengaturan.findFirst();
    return NextResponse.json(pengaturan);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      toleransiMenit,
      jamBerangkatMulai,
      jamBerangkatSelesai,
      jamPulangMulai,
      jamPulangSelesai,
      templatePesanWa,
    } = body;

    const pengaturan = await prisma.pengaturan.findFirst();

    const updated = await prisma.pengaturan.update({
      where: { id: pengaturan!.id },
      data: {
        toleransiMenit: Number(toleransiMenit),
        jamBerangkatMulai,
        jamBerangkatSelesai,
        jamPulangMulai,
        jamPulangSelesai,
        templatePesanWa,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
