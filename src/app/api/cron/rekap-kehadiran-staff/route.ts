import { NextResponse } from "next/server";

import {
  buildStaffAttendanceRecap,
  STAFF_RECAP_DAILY_START_DATE,
  sendStaffAttendanceRecap,
} from "@/lib/rekap-kehadiran-staff";
import { todayJakarta } from "@/lib/time";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  return (
    Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`
  );
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tanggal = todayJakarta();
    const key = dateKey(tanggal);

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") === "1";

    if (dryRun) {
      const recap = await buildStaffAttendanceRecap(tanggal);

      return NextResponse.json({
        ok: true,
        action: "DRY_RUN",
        tanggal: key,
        totalStaff: recap.totalStaff,
        message: recap.message,
        staff: recap.staff,
      });
    }

    if (key < STAFF_RECAP_DAILY_START_DATE) {
      return NextResponse.json({
        ok: true,
        action: "NOT_STARTED",
        tanggal: key,
        mulai: STAFF_RECAP_DAILY_START_DATE,
      });
    }

    const result = await sendStaffAttendanceRecap(tanggal);

    return NextResponse.json(
      {
        ok: true,
        action: "QUEUED",
        tanggal: key,
        eventId: result.eventId,
        totalStaff: result.recap.totalStaff,
        kirimyo: result.kirimyo,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("CRON_STAFF_ATTENDANCE_RECAP_ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengirim kehadiran staff",
      },
      { status: 500 },
    );
  }
}
