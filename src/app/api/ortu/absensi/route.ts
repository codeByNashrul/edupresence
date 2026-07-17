import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ORTU") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bulan = parseInt(
    searchParams.get("bulan") ?? String(new Date().getMonth() + 1),
  );
  const tahun = parseInt(
    searchParams.get("tahun") ?? String(new Date().getFullYear()),
  );

  const dari = new Date(tahun, bulan - 1, 1);
  const sampai = new Date(tahun, bulan, 0, 23, 59, 59);

  const absensi = await prisma.absensiSiswa.findMany({
    where: {
      siswaId: session.user.siswaId!,
      tanggal: { gte: dari, lte: sampai },
    },
    orderBy: { tanggal: "desc" },
  });

  // Hitung ringkasan
  const hadir = absensi.filter((a) => a.status === "HADIR").length;

  const terlambat = absensi.filter((a) => a.status === "TERLAMBAT").length;

  const izin = absensi.filter((a) => a.status === "IZIN").length;

  const sakit = absensi.filter((a) => a.status === "SAKIT").length;

  const alpha = absensi.filter((a) => a.status === "ALPHA").length;

  const tidakHadir = absensi.filter(
    (a) => a.status === "IZIN" || a.status === "SAKIT" || a.status === "ALPHA",
  ).length;

  return NextResponse.json({
    absensi,
    ringkasan: {
      hadir,
      terlambat,
      izin,
      sakit,
      alpha,
      tidakHadir,
    },
  });
}
