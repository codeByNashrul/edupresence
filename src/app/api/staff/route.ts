import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

// GET — ambil semua staff
// GET — ambil semua staff
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.user.findMany({
      where: { role: "STAFF", aktif: true },
      // hapus include: { staff: true }
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — tambah staff baru
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { nama, nip, noWa, password } = body;

    // Cek NIP sudah ada atau belum
    const existing = await prisma.user.findUnique({ where: { nip } });
    if (existing) {
      return NextResponse.json(
        { error: "NIP sudah terdaftar" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        nama,
        nip,
        noWa,
        password: hashedPassword,
        role: "STAFF",
        aktif: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
