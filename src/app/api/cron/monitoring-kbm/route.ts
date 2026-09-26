import { MonitoringKbmDispatchStatus, Prisma, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getBlokMonitoring,
  getMonitoringKbm,
  parseTanggalMonitoring,
} from "@/lib/monitoring-kbm";
import { prisma } from "@/lib/prisma";
import { timeJakarta, todayJakarta } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  return new Set(
    [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
      .filter((role): role is string => typeof role === "string")
      .filter((role) => Object.values(Role).includes(role as Role))
      .map((role) => role as Role),
  );
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hour, minute] = value.split(":").map(Number);

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function formatTanggal(tanggal: Date) {
  return tanggal.toISOString().slice(0, 10);
}

function plainJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(req: Request) {
  try {
    const authorization = req.headers.get("authorization") ?? "";

    const cronSecret = process.env.CRON_SECRET?.trim();

    const isCronRequest =
      Boolean(cronSecret) && authorization === `Bearer ${cronSecret}`;

    /*
     * Selain request resmi dari cron, endpoint hanya boleh
     * dipakai ADMIN untuk pengujian manual.
     */
    if (!isCronRequest) {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const roles = getSessionRoles(session.user as SessionUserWithRoles);

      if (!roles.has(Role.ADMIN)) {
        return NextResponse.json(
          {
            error: "Hanya admin yang dapat menjalankan simulasi scheduler",
          },
          { status: 403 },
        );
      }
    }

    const { searchParams } = new URL(req.url);

    const tanggalParam = searchParams.get("tanggal");
    const waktuParam = searchParams.get("waktu");

    /*
     * Request cron resmi tidak boleh memalsukan tanggal/waktu.
     * Override hanya untuk pengujian manual oleh ADMIN.
     */
    if (isCronRequest && (tanggalParam !== null || waktuParam !== null)) {
      return NextResponse.json(
        {
          error: "Request cron tidak menerima override tanggal atau waktu",
        },
        { status: 400 },
      );
    }

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

    const waktu = waktuParam?.trim() || timeJakarta();

    if (!isValidTime(waktu)) {
      return NextResponse.json(
        {
          error: "Format waktu tidak valid. Gunakan HH:mm.",
        },
        { status: 400 },
      );
    }

    const blocks = getBlokMonitoring(tanggal);

    /*
     * Minggu dan Sabtu saat ini tidak mempunyai scheduler KBM.
     */
    if (blocks.length === 0) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        action: "NO_SCHEDULE",
        tanggal: formatTanggal(tanggal),
        waktu,
        message: "Tidak ada jadwal monitoring KBM pada tanggal ini.",
      });
    }

    const block = blocks.find((item) => item.midpoint === waktu);

    if (!block) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        action: "NO_MATCH",
        tanggal: formatTanggal(tanggal),
        waktu,
        expectedMidpoints: blocks.map((item) => ({
          label: item.label,
          midpoint: item.midpoint,
        })),
      });
    }

    /*
     * Generate snapshot tepat untuk tanggal tersebut.
     * Belum ada pengiriman WhatsApp.
     */
    const monitoring = await getMonitoringKbm(tanggal);

    const result = monitoring.find(
      (item) =>
        item.blok.jamMulai === block.jamMulai &&
        item.blok.jamSelesai === block.jamSelesai,
    );

    if (!result) {
      return NextResponse.json(
        {
          error: "Data monitoring untuk blok ini tidak ditemukan",
        },
        { status: 409 },
      );
    }

    /*
     * Fail closed:
     * jangan membuat dispatch bila struktur monitoring
     * belum sempurna.
     */
    if (result.totalKelas !== 10 || result.anomali.length > 0) {
      return NextResponse.json(
        {
          error: "Monitoring KBM memiliki anomali dan tidak siap diproses",
          totalKelas: result.totalKelas,
          anomali: result.anomali,
        },
        { status: 409 },
      );
    }

    try {
      const dispatch = await prisma.monitoringKbmDispatch.create({
        data: {
          tanggal,
          hari: result.hari,
          label: result.blok.label,
          jamMulai: result.blok.jamMulai,
          jamSelesai: result.blok.jamSelesai,
          midpoint: result.blok.midpoint,

          status: MonitoringKbmDispatchStatus.READY,

          pesan: result.pesan,
          payload: plainJson(result),

          attempts: 0,
        },
        select: {
          id: true,
          tanggal: true,
          hari: true,
          label: true,
          jamMulai: true,
          jamSelesai: true,
          midpoint: true,
          status: true,
          attempts: true,
          createdAt: true,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          dryRun: true,
          action: "CREATED",
          message:
            "Dispatch monitoring dibuat. Belum ada WhatsApp yang dikirim.",
          dispatch,
          previewPesan: result.pesan,
        },
        { status: 201 },
      );
    } catch (error) {
      /*
       * Unique constraint adalah pagar idempotency.
       * Kalau scheduler dipanggil lagi untuk blok yang sama,
       * jangan membuat dispatch kedua.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.monitoringKbmDispatch.findUnique({
          where: {
            tanggal_jamMulai_jamSelesai: {
              tanggal,
              jamMulai: block.jamMulai,
              jamSelesai: block.jamSelesai,
            },
          },
          select: {
            id: true,
            tanggal: true,
            hari: true,
            label: true,
            jamMulai: true,
            jamSelesai: true,
            midpoint: true,
            status: true,
            attempts: true,
            createdAt: true,
            sentAt: true,
          },
        });

        return NextResponse.json({
          ok: true,
          dryRun: true,
          action: "SKIPPED_ALREADY_EXISTS",
          message: "Dispatch blok ini sudah pernah dibuat.",
          dispatch: existing,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("CRON_MONITORING_KBM_ERROR:", error);

    return NextResponse.json(
      {
        error: "Gagal menjalankan scheduler monitoring KBM",
      },
      { status: 500 },
    );
  }
}
