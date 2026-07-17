// app/api/kalender-akademik/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── PUT — edit event ─────────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { judul, deskripsi, tipe, tanggalMulai, tanggalSelesai } = body;

    if (!judul || !tipe || !tanggalMulai || !tanggalSelesai) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    if (new Date(tanggalMulai) > new Date(tanggalSelesai)) {
      return NextResponse.json(
        { error: "Tanggal mulai tidak boleh setelah tanggal selesai" },
        { status: 400 },
      );
    }

    const data = await prisma.kalenderAkademik.update({
      where: { id },
      data: {
        judul,
        deskripsi: deskripsi || null,
        tipe,
        tanggalMulai: new Date(tanggalMulai),
        tanggalSelesai: new Date(tanggalSelesai),
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("KALENDER_PUT:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE — hapus event ─────────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.kalenderAkademik.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KALENDER_DELETE:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
