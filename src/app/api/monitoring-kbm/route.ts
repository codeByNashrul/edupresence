import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getMonitoringKbm, parseTanggalMonitoring } from "@/lib/monitoring-kbm";
import { todayJakarta } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

function getRoles(user: SessionUserWithRoles | undefined) {
  return new Set([
    user?.role,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ]);
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = getRoles(session.user as SessionUserWithRoles);

    const allowed =
      roles.has(Role.ADMIN) ||
      roles.has(Role.PIKET) ||
      roles.has(Role.PIMPINAN);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses ke monitoring KBM",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);

    const tanggalParam = searchParams.get("tanggal");

    const tanggal = tanggalParam
      ? parseTanggalMonitoring(tanggalParam)
      : todayJakarta();

    if (!tanggal) {
      return NextResponse.json(
        {
          error: "Format tanggal tidak valid. Gunakan YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    const result = await getMonitoringKbm(tanggal);

    return NextResponse.json(
      {
        tanggal: tanggal.toISOString().slice(0, 10),
        jumlahBlok: result.length,
        blocks: result,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("MONITORING_KBM_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal memuat monitoring KBM" },
      { status: 500 },
    );
  }
}
