import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pengumuman = await prisma.pengumuman.findMany({
      where: {
        aktif: true,
      },
      include: {
        pembuat: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return NextResponse.json(pengumuman);
  } catch (error) {
    console.error("PENGUMUMAN_GET_ERROR:", error);

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

    const { judul, isi } = body;

    if (!judul || !isi) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    const pengumuman = await prisma.pengumuman.create({
      data: {
        judul,
        isi,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(pengumuman);
  } catch (error) {
    console.error("PENGUMUMAN_POST_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
