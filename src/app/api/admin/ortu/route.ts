import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// GET — list semua akun ortu
export async function GET() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await prisma.userOrtu.findMany({
    include: { siswa: { include: { kelas: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

// POST — buat akun ortu baru
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nama, siswaId, password } = await req.json();
  if (!nama || !siswaId || !password) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  // Ambil NIS dari siswa
  const siswa = await prisma.siswa.findUnique({ where: { id: siswaId } });
  if (!siswa)
    return NextResponse.json(
      { error: "Siswa tidak ditemukan" },
      { status: 404 },
    );

  const hashed = await bcrypt.hash(password, 10);

  const ortu = await prisma.userOrtu.create({
    data: {
      nama,
      nis: siswa.nis, // NIS siswa = username login ortu
      password: hashed,
      siswaId,
    },
  });

  return NextResponse.json(ortu, { status: 201 });
}
