import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta, timeJakarta, dayJakarta } from "@/lib/time";
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tanggal = todayJakarta();

    const kegiatan = await prisma.kegiatanStaff.findMany({
      where: {
        userId: session.user.id,
        tanggal,
      },
      orderBy: {
        jamMulai: "asc",
      },
    });

    return NextResponse.json(kegiatan);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jamMulai, jamSelesai, catatan } = await req.json();

    if (!jamMulai || !catatan) {
      return NextResponse.json(
        { error: "Jam mulai dan catatan wajib diisi" },
        { status: 400 },
      );
    }

    const tanggal = todayJakarta();

    const kegiatan = await prisma.kegiatanStaff.create({
      data: {
        userId: session.user.id,
        tanggal,
        jamMulai,
        jamSelesai: jamSelesai || null,
        catatan,
      },
    });

    return NextResponse.json(kegiatan, { status: 201 });
  } catch (error) {
    console.error("KEGIATAN_STAFF_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
