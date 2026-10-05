import { MonitoringKbmDispatchStatus } from "@/generated/prisma/client";

import { sendKirimYoAutomationWebhook } from "@/lib/kirimyo";
import { prisma } from "@/lib/prisma";

export type ProcessMonitoringDispatchResult =
  | {
      action: "QUEUED";
      dispatchId: string;
      kirimyoRunId: string;
      duplicate: boolean;
      attempts: number;
    }
  | {
      action: "ALREADY_PROCESSING" | "ALREADY_QUEUED" | "ALREADY_SENT";
      dispatchId: string;
      status: MonitoringKbmDispatchStatus;
      attempts: number;
    };

function errorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Pengiriman KirimYo gagal";

  return message.slice(0, 2000);
}

export async function processMonitoringKbmDispatch(
  dispatchId: string,
): Promise<ProcessMonitoringDispatchResult> {
  /*
   * Atomic claim.
   *
   * READY  -> PROCESSING
   * FAILED -> PROCESSING
   *
   * Dua request bersamaan tidak bisa sama-sama mendapatkan claim.
   */
  const claim = await prisma.monitoringKbmDispatch.updateMany({
    where: {
      id: dispatchId,
      status: {
        in: [
          MonitoringKbmDispatchStatus.READY,
          MonitoringKbmDispatchStatus.FAILED,
        ],
      },
    },
    data: {
      status: MonitoringKbmDispatchStatus.PROCESSING,
      attempts: {
        increment: 1,
      },
      error: null,
    },
  });

  if (claim.count === 0) {
    const existing = await prisma.monitoringKbmDispatch.findUnique({
      where: {
        id: dispatchId,
      },
      select: {
        id: true,
        status: true,
        attempts: true,
      },
    });

    if (!existing) {
      throw new Error("Dispatch monitoring tidak ditemukan");
    }

    if (existing.status === MonitoringKbmDispatchStatus.PROCESSING) {
      return {
        action: "ALREADY_PROCESSING",
        dispatchId: existing.id,
        status: existing.status,
        attempts: existing.attempts,
      };
    }

    if (existing.status === MonitoringKbmDispatchStatus.QUEUED) {
      return {
        action: "ALREADY_QUEUED",
        dispatchId: existing.id,
        status: existing.status,
        attempts: existing.attempts,
      };
    }

    if (existing.status === MonitoringKbmDispatchStatus.SENT) {
      return {
        action: "ALREADY_SENT",
        dispatchId: existing.id,
        status: existing.status,
        attempts: existing.attempts,
      };
    }

    throw new Error(
      `Dispatch tidak dapat diproses dari status ${existing.status}`,
    );
  }

  const dispatch = await prisma.monitoringKbmDispatch.findUnique({
    where: {
      id: dispatchId,
    },
    select: {
      id: true,
      tanggal: true,
      label: true,
      pesan: true,
      attempts: true,
    },
  });

  if (!dispatch) {
    throw new Error("Dispatch monitoring hilang setelah claim");
  }

  const tanggal = dispatch.tanggal.toISOString().slice(0, 10);

  const blockKey = dispatch.label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!blockKey) {
    throw new Error("Label blok Monitoring KBM tidak valid");
  }

  /*
   * Event identity bersifat deterministic untuk satu kejadian KBM.
   *
   * Contoh:
   * kbm:2026-09-29:jam-1-2
   *
   * Retry EduPresence memakai eventId / Idempotency-Key yang sama,
   * sehingga KirimYo mengembalikan AutomationRun yang sama.
   */
  const eventId = `kbm:${tanggal}:${blockKey}`;

  try {
    const kirimyo = await sendKirimYoAutomationWebhook({
      eventId,
      date: tanggal,
      block: dispatch.label,
      message: dispatch.pesan,
    });

    await prisma.monitoringKbmDispatch.update({
      where: {
        id: dispatch.id,
      },
      data: {
        /*
         * QUEUED di ledger EduPresence berarti event sudah diterima
         * secara durable oleh KirimYo. Delivery WhatsApp tetap menjadi
         * concern pipeline KirimYo.
         */
        status: MonitoringKbmDispatchStatus.QUEUED,
        kirimyoAutomationRunId: kirimyo.runId,
        error: null,
      },
    });

    return {
      action: "QUEUED",
      dispatchId: dispatch.id,
      kirimyoRunId: kirimyo.runId,
      duplicate: kirimyo.duplicate,
      attempts: dispatch.attempts,
    };
  } catch (error) {
    await prisma.monitoringKbmDispatch.updateMany({
      where: {
        id: dispatch.id,
        status: MonitoringKbmDispatchStatus.PROCESSING,
      },
      data: {
        status: MonitoringKbmDispatchStatus.FAILED,
        error: errorMessage(error),
      },
    });

    throw error;
  }
}
