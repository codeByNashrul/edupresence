import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getLaporanV2,
  type PeriodeLaporan,
  type ScopePegawai,
} from "@/lib/laporan-v2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

const PERIODE_VALID = new Set<PeriodeLaporan>([
  "harian",
  "mingguan",
  "bulanan",
  "custom",
]);

const SCOPE_VALID = new Set<ScopePegawai>(["semua", "guru", "staff"]);

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as SessionUserWithRoles;

    const roles = new Set(
      [
        sessionUser.role,
        ...(Array.isArray(sessionUser.roles) ? sessionUser.roles : []),
      ].filter(
        (role): role is string => typeof role === "string" && role.length > 0,
      ),
    );

    if (!roles.has("ADMIN") && !roles.has("PIMPINAN")) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses laporan",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);

    const periodeRaw = searchParams.get("periode") ?? "bulanan";

    if (!PERIODE_VALID.has(periodeRaw as PeriodeLaporan)) {
      return NextResponse.json(
        { error: "Periode tidak valid" },
        { status: 400 },
      );
    }

    const scopeRaw = searchParams.get("scope") ?? "semua";

    if (!SCOPE_VALID.has(scopeRaw as ScopePegawai)) {
      return NextResponse.json(
        { error: "Scope pegawai tidak valid" },
        { status: 400 },
      );
    }

    const data = await getLaporanV2({
      periode: periodeRaw as PeriodeLaporan,

      tanggal: searchParams.get("tanggal"),

      from: searchParams.get("from"),

      to: searchParams.get("to"),

      scope: scopeRaw as ScopePegawai,

      userId: searchParams.get("userId"),
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("LAPORAN_V2_ERROR:", error);

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "CUSTOM_DATE_REQUIRED") {
      return NextResponse.json(
        {
          error: "Tanggal mulai dan tanggal selesai wajib diisi",
        },
        { status: 400 },
      );
    }

    if (message === "INVALID_DATE") {
      return NextResponse.json(
        {
          error: "Tanggal tidak valid",
        },
        { status: 400 },
      );
    }

    if (message === "INVALID_DATE_RANGE") {
      return NextResponse.json(
        {
          error: "Tanggal mulai tidak boleh setelah tanggal selesai",
        },
        { status: 400 },
      );
    }

    if (message === "DATE_RANGE_TOO_LARGE") {
      return NextResponse.json(
        {
          error: "Rentang custom maksimal 93 hari",
        },
        { status: 400 },
      );
    }

    if (message === "PEGAWAI_NOT_FOUND") {
      return NextResponse.json(
        {
          error: "Pegawai tidak ditemukan atau tidak aktif",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Gagal membuat laporan absensi",
      },
      { status: 500 },
    );
  }
}
