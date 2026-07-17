import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ORTU") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pengumuman = await prisma.pengumuman.findMany({
      where: {
        aktif: true,
      },
      include: {
        pembuat: {
          select: {
            nama: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json(pengumuman);
  } catch (error) {
    console.error("ORTU_PENGUMUMAN_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
