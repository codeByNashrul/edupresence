import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      guruId,
      kelasId,
      mataPelajaranId,
      ruanganId,
      hari,
      jamMulai,
      jamSelesai,
    } = await req.json();

    const jadwal = await prisma.jadwal.update({
      where: { id },
      data: {
        guruId,
        kelasId,
        mataPelajaranId,
        ruanganId,
        hari,
        jamMulai,
        jamSelesai,
      },
      include: {
        guru: { include: { user: true } },
        kelas: true,
        mataPelajaran: true,
        ruangan: true,
      },
    });

    return NextResponse.json(jadwal);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.jadwal.update({
      where: { id },
      data: { aktif: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
