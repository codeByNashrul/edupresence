import { SapaanGuru } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function parseSapaan(value: unknown): SapaanGuru | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  if (normalized === SapaanGuru.USTADZ) {
    return SapaanGuru.USTADZ;
  }

  if (normalized === SapaanGuru.USTADZAH) {
    return SapaanGuru.USTADZAH;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await req.json();

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Data import tidak valid" },
        { status: 400 },
      );
    }

    let berhasil = 0;
    let gagal = 0;

    for (const row of rows) {
      try {
        const nama = typeof row.nama === "string" ? row.nama.trim() : "";

        const nip = typeof row.nip === "string" ? row.nip.trim() : "";

        const sapaan = parseSapaan(row.sapaan);

        if (!nama || !nip || !sapaan) {
          gagal++;
          continue;
        }

        const existing = await prisma.user.findUnique({
          where: { nip },
          select: { id: true },
        });

        if (existing) {
          gagal++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(row.password || "guru123", 12);

        await prisma.user.create({
          data: {
            nama,
            nip,
            noWa: row.nowa || row.noWa || null,
            password: hashedPassword,
            role: "GURU",
            aktif: true,
            guru: {
              create: {
                sapaan,
              },
            },
          },
        });

        berhasil++;
      } catch {
        gagal++;
      }
    }

    return NextResponse.json({ berhasil, gagal });
  } catch (error) {
    console.error("IMPORT_GURU_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
