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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await req.json();
    const isManagement = ["ADMIN", "PIMPINAN"].includes(session.user.role);

    // Cek izin exists
    const izin = await prisma.izin.findUnique({ where: { id } });
    if (!izin) {
      return NextResponse.json(
        { error: "Izin tidak ditemukan" },
        { status: 404 },
      );
    }

    // Guru/staff hanya bisa batalkan izin miliknya sendiri
    if (!isManagement && izin.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.izin.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, nama: true, nip: true, role: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const izin = await prisma.izin.findUnique({ where: { id } });
    if (!izin) {
      return NextResponse.json(
        { error: "Izin tidak ditemukan" },
        { status: 404 },
      );
    }

    // Hanya pemilik atau management yang bisa hapus
    const isManagement = ["ADMIN", "PIMPINAN"].includes(session.user.role);
    if (!isManagement && izin.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.izin.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
