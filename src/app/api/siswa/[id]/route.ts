import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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
      error: "Hanya admin yang dapat mengelola data siswa",
    },
    { status: 403 },
  );
}

// PUT — edit siswa, hanya ADMIN
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
        { error: "ID siswa tidak valid" },
        { status: 400 },
      );
    }

    const siswaLama = await prisma.siswa.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        aktif: true,
      },
    });

    if (!siswaLama) {
      return NextResponse.json(
        { error: "Data siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    if (!siswaLama.aktif) {
      return NextResponse.json(
        { error: "Siswa sudah tidak aktif" },
        { status: 400 },
      );
    }

    const body = await req.json();

    const nama = typeof body.nama === "string" ? body.nama.trim() : "";

    const nis = typeof body.nis === "string" ? body.nis.trim() : "";

    const jenisKelamin =
      typeof body.jenisKelamin === "string"
        ? body.jenisKelamin.trim().toUpperCase()
        : "";

    const kelasId = typeof body.kelasId === "string" ? body.kelasId.trim() : "";

    if (!nama) {
      return NextResponse.json(
        { error: "Nama siswa wajib diisi" },
        { status: 400 },
      );
    }

    if (!nis) {
      return NextResponse.json({ error: "NIS wajib diisi" }, { status: 400 });
    }

    if (!["L", "P"].includes(jenisKelamin)) {
      return NextResponse.json(
        {
          error: "Jenis kelamin harus L atau P",
        },
        { status: 400 },
      );
    }

    if (!kelasId) {
      return NextResponse.json(
        { error: "Kelas wajib dipilih" },
        { status: 400 },
      );
    }

    const kelas = await prisma.kelas.findFirst({
      where: {
        id: kelasId,
        aktif: true,
      },
      select: {
        id: true,
      },
    });

    if (!kelas) {
      return NextResponse.json(
        {
          error: "Kelas tidak ditemukan atau sudah tidak aktif",
        },
        { status: 404 },
      );
    }

    const nisTerpakai = await prisma.siswa.findFirst({
      where: {
        nis,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    });

    if (nisTerpakai) {
      return NextResponse.json(
        { error: "NIS sudah digunakan siswa lain" },
        { status: 409 },
      );
    }

    const siswa = await prisma.siswa.update({
      where: {
        id,
      },
      data: {
        nama,
        nis,
        jenisKelamin,
        kelasId,
      },
      select: {
        id: true,
        nama: true,
        nis: true,
        jenisKelamin: true,
        kodeQr: true,
        aktif: true,
        kelas: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return NextResponse.json(siswa);
  } catch (error) {
    console.error("SISWA_PUT_ERROR:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "NIS sudah digunakan" },
          { status: 409 },
        );
      }

      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Data siswa tidak ditemukan" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      { error: "Gagal memperbarui data siswa" },
      { status: 500 },
    );
  }
}

// DELETE — soft delete siswa, hanya ADMIN
export async function DELETE(_req: Request, context: RouteContext) {
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
        { error: "ID siswa tidak valid" },
        { status: 400 },
      );
    }

    const siswa = await prisma.siswa.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        nama: true,
        aktif: true,
      },
    });

    if (!siswa) {
      return NextResponse.json(
        { error: "Data siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    if (!siswa.aktif) {
      return NextResponse.json(
        { error: "Siswa sudah dalam status nonaktif" },
        { status: 400 },
      );
    }

    await prisma.siswa.update({
      where: {
        id,
      },
      data: {
        aktif: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${siswa.nama} berhasil dinonaktifkan`,
    });
  } catch (error) {
    console.error("SISWA_DELETE_ERROR:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Data siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Gagal menonaktifkan siswa" },
      { status: 500 },
    );
  }
}
