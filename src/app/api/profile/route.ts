// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — ambil data profil user yang sedang login
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nama: true,
      nip: true,
      noWa: true,
      role: true,
      aktif: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(user);
}

// PUT — update nama dan/atau noWa
export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const { nama, noWa } = body as {
      nama?: unknown;
      noWa?: unknown;
    };

    if (typeof nama !== "string" || nama.trim().length < 2) {
      return NextResponse.json({ error: "Nama tidak valid" }, { status: 400 });
    }

    if (noWa !== undefined && noWa !== null && typeof noWa !== "string") {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid" },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        nama: nama.trim(),
        noWa: typeof noWa === "string" && noWa.trim() ? noWa.trim() : null,
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        noWa: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("UPDATE_PROFILE_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal memperbarui profil" },
      { status: 500 },
    );
  }
}
