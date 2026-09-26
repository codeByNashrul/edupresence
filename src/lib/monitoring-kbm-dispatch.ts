import { MonitoringKbmDispatchStatus } from "@prisma/client";

import { sendKirimYoText } from "@/lib/kirimyo";
import { prisma } from "@/lib/prisma";

export type ProcessMonitoringDispatchResult =
  | {
      action: "QUEUED";
      dispatchId: string;
      kirimyoMessageId: string;
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
      pesan: true,
      attempts: true,
    },
  });

  if (!dispatch) {
    throw new Error("Dispatch monitoring hilang setelah claim");
  }

  /*
   * Key ini STABIL untuk satu dispatch.
   *
   * Kalau EduPresence timeout setelah KirimYo sebenarnya menerima
   * pesan, retry berikutnya memakai key yang sama dan KirimYo akan
   * mengembalikan message lama sebagai duplicate.
   */
  const idempotencyKey = `edupresence-kbm-${dispatch.id}`;

  try {
    const kirimyo = await sendKirimYoText({
      message: dispatch.pesan,
      idempotencyKey,
    });

    await prisma.monitoringKbmDispatch.update({
      where: {
        id: dispatch.id,
      },
      data: {
        status: MonitoringKbmDispatchStatus.QUEUED,
        kirimyoMessageId: kirimyo.messageId,
        error: null,
      },
    });

    return {
      action: "QUEUED",
      dispatchId: dispatch.id,
      kirimyoMessageId: kirimyo.messageId,
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
