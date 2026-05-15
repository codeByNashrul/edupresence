import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";

function splitCsvLine(line: string) {
  return line.split(";").map((item) => item.replace(/^"|"$/g, "").trim());
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { csv } = body;

    if (!csv) {
      return NextResponse.json({ error: "File CSV kosong" }, { status: 400 });
    }

    const lines = csv
      .replace(/\r/g, "")
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean);

    const rows = lines.slice(1);

    let berhasil = 0;
    let gagal = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      const [nama, nis, jenisKelamin, kelasNama] = splitCsvLine(row);

      if (!nama || !nis || !jenisKelamin || !kelasNama) {
        gagal++;
        errors.push(`Baris ${index + 2}: data tidak lengkap`);
        continue;
      }

      const kelas = await prisma.kelas.findFirst({
        where: {
          nama: kelasNama,
          aktif: true,
        },
      });

      if (!kelas) {
        gagal++;
        errors.push(`Baris ${index + 2}: kelas "${kelasNama}" tidak ditemukan`);
        continue;
      }

      const existing = await prisma.siswa.findUnique({
        where: { nis },
      });

      if (existing) {
        gagal++;
        errors.push(`Baris ${index + 2}: NIS "${nis}" sudah ada`);
        continue;
      }

      await prisma.siswa.create({
        data: {
          nama,
          nis,
          jenisKelamin,
          kelasId: kelas.id,
          kodeQr: crypto.randomUUID(),
        },
      });

      berhasil++;
    }

    return NextResponse.json({
      success: true,
      berhasil,
      gagal,
      errors,
    });
  } catch (error) {
    console.error("SISWA_IMPORT_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
