type KirimYoSendResponse = {
  success?: boolean;
  message?: string;
  duplicate?: boolean;
  data?: {
    id?: string;
    status?: string;
    jobId?: string;
  };
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} belum dikonfigurasi`);
  }

  return value;
}

export async function sendKirimYoText(params: {
  message: string;
  idempotencyKey: string;
  recipient?: string;
}) {
  const baseUrl = requiredEnv("KIRIMYO_API_BASE_URL").replace(/\/+$/, "");
  const apiKey = requiredEnv("KIRIMYO_API_KEY");
  const deviceId = requiredEnv("KIRIMYO_DEVICE_ID");
  const recipient =
    params.recipient?.replace(/\D/g, "") ||
    requiredEnv("KBM_MONITORING_RECIPIENT").replace(/\D/g, "");

  if (!/^\d{8,20}$/.test(recipient)) {
    throw new Error("KBM_MONITORING_RECIPIENT tidak valid");
  }

  if (!params.message.trim()) {
    throw new Error("Pesan KirimYo tidak boleh kosong");
  }

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      deviceId,
      recipient,
      type: "text",
      text: {
        body: params.message,
      },
    }),
    cache: "no-store",
  });

  let body: KirimYoSendResponse | null = null;

  try {
    body = (await response.json()) as KirimYoSendResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      body?.message || `KirimYo gagal menerima pesan (${response.status})`,
    );
  }

  const messageId = body?.data?.id;

  if (!messageId) {
    throw new Error(
      "KirimYo menerima request tetapi tidak mengembalikan message ID",
    );
  }

  return {
    messageId,
    status: body?.data?.status ?? null,
    duplicate: body?.duplicate === true,
    jobId: body?.data?.jobId ?? null,
  };
}
