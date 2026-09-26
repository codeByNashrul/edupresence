import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { sendKirimYoText } from "@/lib/kirimyo";

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUserWithRoles;

    const roles = new Set([
      user.role,
      ...(Array.isArray(user.roles) ? user.roles : []),
    ]);

    if (!roles.has(Role.ADMIN)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const idempotencyKey = `edupresence-kirimyo-test-${Date.now()}`;

    const result = await sendKirimYoText({
      message:
        "✅ Tes integrasi EduPresence → KirimYo berhasil.\n\nPesan ini dikirim melalui API KirimYo.",
      idempotencyKey,
    });

    return NextResponse.json({
      ok: true,
      accepted: true,
      kirimyo: result,
    });
  } catch (error) {
    console.error("KIRIMYO_TEST_ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal menguji KirimYo",
      },
      { status: 500 },
    );
  }
}
