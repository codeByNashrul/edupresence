// app/api/kalender-akademik/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── GET — semua event (bisa filter per tahun) ───────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tahun = searchParams.get("tahun");

    const tahunNumber = tahun ? Number(tahun) : null;

    if (
      tahun &&
      (!Number.isInteger(tahunNumber) ||
        tahunNumber! < 2000 ||
        tahunNumber! > 2100)
    ) {
      return NextResponse.json({ error: "Tahun tidak valid" }, { status: 400 });
    }

    const where = tahunNumber
      ? {
          tanggalMulai: {
            gte: new Date(`${tahunNumber}-01-01T00:00:00.000Z`),
            lt: new Date(`${tahunNumber + 1}-01-01T00:00:00.000Z`),
          },
        }
      : {};

    const data = await prisma.kalenderAkademik.findMany({
      where,
      orderBy: { tanggalMulai: "asc" },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("KALENDER_GET:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST — buat event baru (admin only) ─────────────────────────────────────
export async function POST(req: Request) {
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

    const data = await prisma.kalenderAkademik.create({
      data: {
        judul,
        deskripsi: deskripsi || null,
        tipe,
        tanggalMulai: new Date(tanggalMulai),
        tanggalSelesai: new Date(tanggalSelesai),
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("KALENDER_POST:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
