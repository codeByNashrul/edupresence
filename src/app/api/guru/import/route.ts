import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await req.json();

    let berhasil = 0;
    let gagal = 0;

    for (const row of rows) {
      try {
        const existing = await prisma.user.findUnique({
          where: { nip: row.nip },
        });
        if (existing) {
          gagal++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(row.password || "guru123", 12);

        await prisma.user.create({
          data: {
            nama: row.nama,
            nip: row.nip,
            noWa: row.nowa || row.noWa || null,
            password: hashedPassword,
            role: "GURU",
            aktif: true,
            guru: { create: {} },
          },
        });
        berhasil++;
      } catch {
        gagal++;
      }
    }

    return NextResponse.json({ berhasil, gagal });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
