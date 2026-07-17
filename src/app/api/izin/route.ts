import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const bulan = searchParams.get("bulan"); // format: 2026-05

    const isManagement = ["ADMIN", "PIMPINAN"].includes(session.user.role);

    // Tentukan filter userId
    const targetUserId = isManagement ? (userId ?? undefined) : session.user.id;

    let tanggalFilter = {};
    if (bulan) {
      const [tahun, bln] = bulan.split("-").map(Number);
      tanggalFilter = {
        tanggalMulai: {
          gte: new Date(tahun, bln - 1, 1),
          lte: new Date(tahun, bln, 0, 23, 59, 59),
        },
      };
    }

    const izin = await prisma.izin.findMany({
      where: {
        ...(targetUserId && { userId: targetUserId }),
        ...tanggalFilter,
      },
      include: {
        user: {
          select: { id: true, nama: true, nip: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(izin);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !["GURU", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      jenisIzin,
      jenisCustom,
      tanggalMulai,
      tanggalAkhir,
      keterangan,
      suratUrl,
    } = body;

    // Validasi
    if (!jenisIzin || !tanggalMulai || !tanggalAkhir || !keterangan) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    const mulai = new Date(tanggalMulai);
    const akhir = new Date(tanggalAkhir);

    if (akhir < mulai) {
      return NextResponse.json(
        { error: "Tanggal akhir tidak boleh sebelum tanggal mulai" },
        { status: 400 },
      );
    }

    const izin = await prisma.izin.create({
      data: {
        userId: session.user.id,
        jenisIzin,
        jenisCustom: jenisIzin === "LAINNYA" ? jenisCustom : null,
        tanggalMulai: mulai,
        tanggalAkhir: akhir,
        keterangan,
        suratUrl: suratUrl ?? null,
        status: "APPROVED", // langsung approved
      },
      include: {
        user: {
          select: { id: true, nama: true, nip: true, role: true },
        },
      },
    });

    return NextResponse.json(izin, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
