import { MonitoringKbmDispatchStatus, Prisma, Role } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getBlokMonitoring,
  getMonitoringKbm,
  parseTanggalMonitoring,
} from "@/lib/monitoring-kbm";
import { processMonitoringKbmDispatch } from "@/lib/monitoring-kbm-dispatch";
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
     * Request biasa hanya boleh digunakan ADMIN.
     * Request cron production menggunakan CRON_SECRET.
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
     * Cron production tidak boleh mengubah waktu/tanggal.
     * Override hanya tersedia untuk test manual ADMIN.
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

    if (blocks.length === 0) {
      return NextResponse.json({
        ok: true,
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
     * Cek ledger terlebih dahulu.
     *
     * Jika dispatch sudah ada, jangan generate snapshot baru.
     * Snapshot pertama tetap authoritative.
     */
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
        status: true,
        attempts: true,
      },
    });

    if (existing) {
      const processing = await processMonitoringKbmDispatch(existing.id);

      return NextResponse.json({
        ok: true,
        action: processing.action,
        existingDispatch: true,
        dispatch: processing,
      });
    }

    /*
     * Belum ada dispatch:
     * buat snapshot monitoring dulu.
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
     * jangan kirim kalau struktur kelas bermasalah.
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

    let dispatchId: string;

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
        },
      });

      dispatchId = dispatch.id;
    } catch (error) {
      /*
       * Race condition:
       * request lain mungkin membuat row setelah
       * pengecekan existing di atas.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await prisma.monitoringKbmDispatch.findUnique({
          where: {
            tanggal_jamMulai_jamSelesai: {
              tanggal,
              jamMulai: block.jamMulai,
              jamSelesai: block.jamSelesai,
            },
          },
          select: {
            id: true,
          },
        });

        if (!raced) {
          throw error;
        }

        dispatchId = raced.id;
      } else {
        throw error;
      }
    }

    const processing = await processMonitoringKbmDispatch(dispatchId);

    return NextResponse.json(
      {
        ok: true,
        action: processing.action,
        existingDispatch: false,
        dispatch: processing,
        previewPesan: result.pesan,
      },
      {
        status: processing.action === "QUEUED" ? 202 : 200,
      },
    );
  } catch (error) {
    console.error("CRON_MONITORING_KBM_ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menjalankan scheduler monitoring KBM",
      },
      { status: 500 },
    );
  }
}
