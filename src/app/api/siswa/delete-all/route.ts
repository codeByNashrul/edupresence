import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE() {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.siswa.updateMany({
      where: { aktif: true },
      data: { aktif: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SISWA_DELETE_ALL_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
