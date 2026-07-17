// src/app/api/profile/password/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { passwordLama, passwordBaru, konfirmasi } = body;

  if (!passwordLama || !passwordBaru || !konfirmasi) {
    return NextResponse.json(
      { error: "Semua field wajib diisi" },
      { status: 400 },
    );
  }

  if (passwordBaru.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter" },
      { status: 400 },
    );
  }

  if (passwordBaru !== konfirmasi) {
    return NextResponse.json(
      { error: "Konfirmasi password tidak cocok" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User tidak ditemukan" },
      { status: 404 },
    );
  }

  const valid = await bcrypt.compare(passwordLama, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Password lama tidak sesuai" },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(passwordBaru, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ message: "Password berhasil diubah" });
}
