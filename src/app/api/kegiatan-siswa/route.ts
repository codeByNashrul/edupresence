import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { todayJakarta } from "@/lib/time";

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kegiatan = await prisma.kegiatanSiswa.findMany({
      where: { aktif: true },
      orderBy: { tanggal: "desc" },
    });

    return NextResponse.json(kegiatan);
  } catch (error) {
    console.error("KEGIATAN_SISWA_GET_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nama, tanggal } = await req.json();

    if (!nama) {
      return NextResponse.json(
        { error: "Nama kegiatan wajib diisi" },
        { status: 400 },
      );
    }

    const tanggalKegiatan = tanggal ? new Date(tanggal) : todayJakarta();

    const kegiatan = await prisma.kegiatanSiswa.create({
      data: {
        nama,
        tanggal: tanggalKegiatan,
      },
    });

    return NextResponse.json(kegiatan, { status: 201 });
  } catch (error) {
    console.error("KEGIATAN_SISWA_POST_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
