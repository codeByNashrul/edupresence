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
    include: { kelas: true },
  });

  return NextResponse.json(siswa);
}
