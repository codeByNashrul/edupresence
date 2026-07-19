import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json(
    {
      error: "Hanya admin yang dapat mengubah data staff",
    },
    { status: 403 },
  );
}

// PUT — edit staff
export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user) {
      return unauthorized();
    }

    if (session.user.role !== "ADMIN") {
      return forbidden();
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID staff tidak valid" },
        { status: 400 },
      );
    }

    const staffLama = await prisma.user.findFirst({
      where: {
        id,
        role: "STAFF",
      },
      select: {
        id: true,
      },
    });

    if (!staffLama) {
      return NextResponse.json(
        { error: "Data staff tidak ditemukan" },
        { status: 404 },
      );
    }

    const body = await req.json();

    const nama = typeof body.nama === "string" ? body.nama.trim() : "";

    const nip = typeof body.nip === "string" ? body.nip.trim() : "";

    const noWa =
      typeof body.noWa === "string" && body.noWa.trim()
        ? body.noWa.trim()
        : null;

    const password = typeof body.password === "string" ? body.password : "";

    if (!nama) {
      return NextResponse.json(
        { error: "Nama staff wajib diisi" },
        { status: 400 },
      );
    }

    if (!nip) {
      return NextResponse.json({ error: "NIP wajib diisi" }, { status: 400 });
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        {
          error: "Password minimal 6 karakter",
        },
        { status: 400 },
      );
    }

    const nipTerpakai = await prisma.user.findFirst({
      where: {
        nip,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    });

    if (nipTerpakai) {
      return NextResponse.json(
        { error: "NIP sudah digunakan" },
        { status: 409 },
      );
    }

    const data: Prisma.UserUpdateInput = {
      nama,
      nip,
      noWa,
    };

    if (password) {
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: {
        id,
      },
      data,
      select: {
        id: true,
        nama: true,
        nip: true,
        noWa: true,
        aktif: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT_STAFF_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal memperbarui data staff" },
      { status: 500 },
    );
  }
}

// DELETE — soft delete staff
export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user) {
      return unauthorized();
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Hanya admin yang dapat menonaktifkan staff",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID staff tidak valid" },
        { status: 400 },
      );
    }

    const staff = await prisma.user.findFirst({
      where: {
        id,
        role: "STAFF",
      },
      select: {
        id: true,
        aktif: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Data staff tidak ditemukan" },
        { status: 404 },
      );
    }

    if (!staff.aktif) {
      return NextResponse.json(
        {
          error: "Staff sudah dalam status nonaktif",
        },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: {
        id,
      },
      data: {
        aktif: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Staff berhasil dinonaktifkan",
    });
  } catch (error) {
    console.error("DELETE_STAFF_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal menonaktifkan staff" },
      { status: 500 },
    );
  }
}
