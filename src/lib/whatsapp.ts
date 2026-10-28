const FONNTE_SEND_URL = "https://api.fonnte.com/send";

type FonnteSendResponse = {
  status?: boolean;
  detail?: string;
  id?: number | string | Array<number | string>;
  process?: string;
  requestid?: number | string;
  target?: string | string[];
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} belum dikonfigurasi`);
  }

  return value;
}

export async function sendWhatsAppMessage(params: {
  target: string;
  message: string;
}) {
  const token = requiredEnv("FONNTE_TOKEN");
  const target = params.target.trim();
  const message = params.message.trim();

  if (!target) {
    throw new Error("Target WhatsApp tidak boleh kosong");
  }

  if (!message) {
    throw new Error("Pesan WhatsApp tidak boleh kosong");
  }

  const form = new FormData();

  form.set("target", target);
  form.set("message", message);
  form.set("connectOnly", "true");

  const response = await fetch(FONNTE_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: form,
    cache: "no-store",
  });

  let body: FonnteSendResponse | null = null;

  try {
    body = (await response.json()) as FonnteSendResponse;
  } catch {
    body = null;
  }

  if (!response.ok || body?.status !== true) {
    throw new Error(
      body?.detail || `Fonnte gagal menerima pesan (${response.status})`,
    );
  }

  const messageIds =
    body.id === undefined ? [] : Array.isArray(body.id) ? body.id : [body.id];

  const targets =
    body.target === undefined
      ? [target]
      : Array.isArray(body.target)
        ? body.target
        : [body.target];

  return {
    provider: "fonnte" as const,
    accepted: true,
    detail: body.detail ?? null,
    process: body.process ?? null,
    requestId: body.requestid ?? null,
    messageIds,
    targets,
  };
}

export async function sendStaffAttendanceWhatsApp(message: string) {
  return sendWhatsAppMessage({
    target: requiredEnv("FONNTE_STAFF_GROUP_ID"),
    message,
  });
}

export async function sendMonitoringKbmWhatsApp(message: string) {
  return sendWhatsAppMessage({
    target: requiredEnv("FONNTE_KBM_GROUP_ID"),
    message,
  });
}
