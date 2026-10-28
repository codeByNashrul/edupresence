import { MonitoringKbmDispatchStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { sendMonitoringKbmWhatsApp } from "@/lib/whatsapp";

export type ProcessMonitoringDispatchResult =
  | {
      action: "QUEUED";
      dispatchId: string;
      provider: "fonnte";
      providerMessageId: string | null;
      requestId: number | string | null;
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
    error instanceof Error ? error.message : "Pengiriman WhatsApp gagal";

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
   * Penting untuk Fonnte:
   *
   * Kalau provider belum menerima pesan dan terjadi error,
   * dispatch boleh menjadi FAILED agar dapat dicoba ulang.
   *
   * Tetapi kalau Fonnte SUDAH menerima pesan lalu pencatatan DB gagal,
   * jangan ubah kembali menjadi FAILED. Membiarkan PROCESSING lebih aman
   * daripada melakukan retry otomatis yang berisiko mengirim pesan ganda.
   */
  let acceptedByProvider = false;

  try {
    const whatsapp = await sendMonitoringKbmWhatsApp(dispatch.pesan);

    acceptedByProvider = true;

    const firstMessageId = whatsapp.messageIds[0];

    const providerMessageId =
      firstMessageId === undefined ? null : String(firstMessageId);

    await prisma.monitoringKbmDispatch.update({
      where: {
        id: dispatch.id,
      },
      data: {
        /*
         * QUEUED berarti Fonnte sudah menerima request dan memasukkan
         * pesan ke antrean pengiriman. Ini belum berarti delivery
         * WhatsApp sudah terkonfirmasi.
         */
        status: MonitoringKbmDispatchStatus.QUEUED,
        providerMessageId,
        error: null,
      },
    });

    return {
      action: "QUEUED",
      dispatchId: dispatch.id,
      provider: whatsapp.provider,
      providerMessageId,
      requestId: whatsapp.requestId,
      attempts: dispatch.attempts,
    };
  } catch (error) {
    if (!acceptedByProvider) {
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
    } else {
      /*
       * Provider sudah menerima pesan.
       *
       * Jangan menandai FAILED karena retry otomatis berpotensi
       * mengirim pesan yang sama dua kali.
       */
      console.error("MONITORING_KBM_PROVIDER_ACCEPTED_PERSIST_FAILED", {
        dispatchId: dispatch.id,
        error: errorMessage(error),
      });
    }

    throw error;
  }
}
