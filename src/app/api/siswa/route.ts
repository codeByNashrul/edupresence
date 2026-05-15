import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siswa = await prisma.siswa.findMany({
      where: {
        aktif: true,
      },
      include: {
        kelas: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    return NextResponse.json(siswa);
  } catch (error) {
    console.error("SISWA_GET_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { nama, nis, jenisKelamin, kelasId } = body;

    if (!nama || !nis || !jenisKelamin || !kelasId) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    const existing = await prisma.siswa.findUnique({
      where: {
        nis,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "NIS sudah digunakan" },
        { status: 400 },
      );
    }

    const kodeQr = crypto.randomUUID();

    const siswa = await prisma.siswa.create({
      data: {
        nama,
        nis,
        jenisKelamin,
        kelasId,
        kodeQr,
      },
      include: {
        kelas: true,
      },
    });

    return NextResponse.json(siswa, { status: 201 });
  } catch (error) {
    console.error("SISWA_POST_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
