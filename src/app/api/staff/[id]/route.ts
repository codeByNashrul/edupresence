import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

// PUT — edit guru
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const body = await req.json();
    const { nama, nip, noWa, password } = body;

    const data: any = {
      nama,
      nip,
      noWa,
    };

    if (password && password.trim() !== "") {
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT USER ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE — soft delete guru
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await prisma.user.update({
      where: { id },
      data: {
        aktif: false,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
