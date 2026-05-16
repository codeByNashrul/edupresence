import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — ambil catatan harian
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tanggalStr = searchParams.get("tanggal");
    const userId = searchParams.get("userId"); // untuk pimpinan lihat staff tertentu

    // Staff hanya bisa lihat miliknya sendiri
    const targetUserId =
      session.user.role === "STAFF" ? session.user.id : (userId ?? undefined);

    const tanggal = tanggalStr ? new Date(tanggalStr) : undefined;

    const catatan = await prisma.catatanHarian.findMany({
      where: {
        ...(targetUserId && { userId: targetUserId }),
        ...(tanggal && {
          tanggal: {
            gte: new Date(tanggal.setHours(0, 0, 0, 0)),
            lte: new Date(tanggal.setHours(23, 59, 59, 999)),
          },
        }),
      },
      include: {
        user: {
          select: { id: true, nama: true, nip: true },
        },
      },
      orderBy: { tanggal: "desc" },
    });

    return NextResponse.json(catatan);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — buat catatan harian baru
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kegiatan, hasil, kendala, foto } = await req.json();

    const tanggal = new Date();
    tanggal.setHours(0, 0, 0, 0);

    // Cek apakah sudah ada catatan hari ini
    const existing = await prisma.catatanHarian.findFirst({
      where: {
        userId: session.user.id,
        tanggal,
      },
    });

    if (existing) {
      // Update jika sudah ada
      const updated = await prisma.catatanHarian.update({
        where: { id: existing.id },
        data: { kegiatan, hasil, kendala, foto: foto ?? [] },
      });
      return NextResponse.json(updated);
    }

    // Buat baru jika belum ada
    const catatan = await prisma.catatanHarian.create({
      data: {
        userId: session.user.id,
        tanggal,
        kegiatan,
        hasil,
        kendala,
        foto: foto ?? [],
      },
    });

    return NextResponse.json(catatan, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
