import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ORTU") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { passwordLama, passwordBaru, konfirmasiPassword } = body;

    if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 },
      );
    }

    if (passwordBaru !== konfirmasiPassword) {
      return NextResponse.json(
        { error: "Konfirmasi password tidak cocok" },
        { status: 400 },
      );
    }

    if (passwordBaru.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 },
      );
    }

    const ortu = await prisma.userOrtu.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!ortu) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan" },
        { status: 404 },
      );
    }

    const valid = await bcrypt.compare(passwordLama, ortu.password);

    if (!valid) {
      return NextResponse.json(
        { error: "Password lama salah" },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(passwordBaru, 10);

    await prisma.userOrtu.update({
      where: {
        id: ortu.id,
      },
      data: {
        password: hashed,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("GANTI_PASSWORD_ORTU_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
