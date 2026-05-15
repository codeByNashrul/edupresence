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

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { nama, nis, jenisKelamin, kelasId } = body;

    const siswa = await prisma.siswa.update({
      where: { id },
      data: {
        nama,
        nis,
        jenisKelamin,
        kelasId,
      },
      include: {
        kelas: true,
      },
    });

    return NextResponse.json(siswa);
  } catch (error) {
    console.error("SISWA_PUT_ERROR:", error);

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

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.siswa.update({
      where: { id },
      data: {
        aktif: false,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("SISWA_DELETE_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
