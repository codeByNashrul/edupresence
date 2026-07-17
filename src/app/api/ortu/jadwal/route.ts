import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ORTU") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siswa = await prisma.siswa.findUnique({
    where: { id: session.user.siswaId! },
    select: { kelasId: true },
  });
  if (!siswa)
    return NextResponse.json(
      { error: "Siswa tidak ditemukan" },
      { status: 404 },
    );

  const jadwal = await prisma.jadwal.findMany({
    where: { kelasId: siswa.kelasId, aktif: true },
    include: {
      guru: { include: { user: { select: { nama: true } } } },
      mataPelajaran: true,
      ruangan: true,
    },
    orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
  });

  return NextResponse.json(jadwal);
}
