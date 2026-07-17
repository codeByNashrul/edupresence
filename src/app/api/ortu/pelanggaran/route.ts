import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ORTU") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "8"); // 8 minggu terakhir

  const rekap = await prisma.rekapPelanggaran.findMany({
    where: { siswaId: session.user.siswaId! },
    orderBy: [{ tahunAjaran: "desc" }, { mingguKe: "desc" }],
    take: limit,
  });

  return NextResponse.json(rekap);
}
