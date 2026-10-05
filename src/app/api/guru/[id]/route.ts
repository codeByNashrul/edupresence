import { SapaanGuru } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function parseSapaan(value: unknown): SapaanGuru | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  if (normalized === SapaanGuru.USTADZ || normalized === SapaanGuru.USTADZAH) {
    return normalized as SapaanGuru;
  }

  return null;
}

// PUT — edit guru
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const nama = typeof body.nama === "string" ? body.nama.trim() : "";
    const nip = typeof body.nip === "string" ? body.nip.trim() : "";

    const noWa =
      typeof body.noWa === "string" && body.noWa.trim()
        ? body.noWa.trim()
        : null;

    const password = typeof body.password === "string" ? body.password : "";

    const sapaan = parseSapaan(body.sapaan);

    if (!nama || !nip) {
      return NextResponse.json(
        { error: "Nama dan NIP wajib diisi" },
        { status: 400 },
      );
    }

    if (!sapaan) {
      return NextResponse.json(
        { error: "Sapaan wajib dipilih: Ustadz atau Ustadzah" },
        { status: 400 },
      );
    }

    const data = {
      nama,
      nip,
      noWa,
      ...(password
        ? {
            password: await bcrypt.hash(password, 12),
          }
        : {}),
      guru: {
        upsert: {
          create: {
            sapaan,
          },
          update: {
            sapaan,
          },
        },
      },
    };

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        nama: true,
        nip: true,
        noWa: true,
        aktif: true,
        guru: {
          select: {
            sapaan: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: user.id,
      nama: user.nama,
      nip: user.nip,
      noWa: user.noWa,
      aktif: user.aktif,
      sapaan: user.guru?.sapaan ?? null,
    });
  } catch (error) {
    console.error("PUT_GURU_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — nonaktifkan guru (soft delete)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.user.update({
      where: { id },
      data: { aktif: false },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
