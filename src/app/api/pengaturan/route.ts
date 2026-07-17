import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let pengaturan = await prisma.pengaturan.findFirst();

    /**
     * Buat pengaturan default jika tabel masih kosong.
     */
    if (!pengaturan) {
      pengaturan = await prisma.pengaturan.create({
        data: {
          jamBerangkatMulai: "07:00",
          jamBerangkatHadirSelesai: "10:00",
          jamBerangkatSelesai: "12:00",
          toleransiMengajarMenit: 30,
          jamPulangMulai: "13:00",
          jamPulangSelesai: "16:00",
        },
      });
    }

    return NextResponse.json(pengaturan);
  } catch (error) {
    console.error("GET_PENGATURAN_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Data pengaturan tidak valid" },
        { status: 400 },
      );
    }

    const {
      jamBerangkatMulai,
      jamBerangkatHadirSelesai,
      jamBerangkatSelesai,
      toleransiMengajarMenit,
      jamPulangMulai,
      jamPulangSelesai,
      templatePesanWa,
    } = body as {
      jamBerangkatMulai?: unknown;
      jamBerangkatHadirSelesai?: unknown;
      jamBerangkatSelesai?: unknown;
      toleransiMengajarMenit?: unknown;
      jamPulangMulai?: unknown;
      jamPulangSelesai?: unknown;
      templatePesanWa?: unknown;
    };

    if (
      !isValidTime(jamBerangkatMulai) ||
      !isValidTime(jamBerangkatHadirSelesai) ||
      !isValidTime(jamBerangkatSelesai) ||
      !isValidTime(jamPulangMulai) ||
      !isValidTime(jamPulangSelesai)
    ) {
      return NextResponse.json(
        {
          error:
            "Format waktu tidak valid. Gunakan format HH:mm, misalnya 07:00",
        },
        { status: 400 },
      );
    }

    const mulaiBerangkat = toMinutes(jamBerangkatMulai);
    const batasHadir = toMinutes(jamBerangkatHadirSelesai);
    const selesaiBerangkat = toMinutes(jamBerangkatSelesai);

    if (mulaiBerangkat >= batasHadir || batasHadir >= selesaiBerangkat) {
      return NextResponse.json(
        {
          error:
            "Urutan waktu kehadiran harus: waktu mulai < batas hadir < waktu selesai",
        },
        { status: 400 },
      );
    }

    const mulaiPulang = toMinutes(jamPulangMulai);
    const selesaiPulang = toMinutes(jamPulangSelesai);

    if (mulaiPulang >= selesaiPulang) {
      return NextResponse.json(
        {
          error:
            "Waktu mulai pulang harus lebih awal dari waktu selesai pulang",
        },
        { status: 400 },
      );
    }

    const toleransi = Number(toleransiMengajarMenit);

    if (!Number.isInteger(toleransi) || toleransi < 0 || toleransi > 180) {
      return NextResponse.json(
        {
          error: "Toleransi mengajar harus berupa angka 0 sampai 180 menit",
        },
        { status: 400 },
      );
    }

    if (
      typeof templatePesanWa !== "string" ||
      templatePesanWa.trim().length < 1
    ) {
      return NextResponse.json(
        {
          error: "Template pesan WhatsApp wajib diisi",
        },
        { status: 400 },
      );
    }

    const data = {
      jamBerangkatMulai,
      jamBerangkatHadirSelesai,
      jamBerangkatSelesai,
      toleransiMengajarMenit: toleransi,
      jamPulangMulai,
      jamPulangSelesai,
      templatePesanWa: templatePesanWa.trim(),
    };

    const pengaturan = await prisma.pengaturan.findFirst({
      select: {
        id: true,
      },
    });

    const updated = pengaturan
      ? await prisma.pengaturan.update({
          where: {
            id: pengaturan.id,
          },
          data,
        })
      : await prisma.pengaturan.create({
          data,
        });

    return NextResponse.json({
      success: true,
      message: "Pengaturan berhasil disimpan",
      pengaturan: updated,
    });
  } catch (error) {
    console.error("UPDATE_PENGATURAN_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
