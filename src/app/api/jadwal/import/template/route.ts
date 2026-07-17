import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HARI_LIST = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [guru, mapel, kelas, ruangan] = await Promise.all([
      prisma.guru.findMany({
        where: {
          user: {
            aktif: true,
          },
        },
        select: {
          id: true,
          user: {
            select: {
              nama: true,
              nip: true,
            },
          },
        },
        orderBy: {
          user: {
            nama: "asc",
          },
        },
      }),

      prisma.mataPelajaran.findMany({
        where: {
          aktif: true,
        },
        select: {
          nama: true,
          kode: true,
        },
        orderBy: {
          nama: "asc",
        },
      }),

      prisma.kelas.findMany({
        where: {
          aktif: true,
        },
        select: {
          nama: true,
        },
        orderBy: {
          nama: "asc",
        },
      }),

      prisma.ruangan.findMany({
        where: {
          aktif: true,
        },
        select: {
          nama: true,
        },
        orderBy: {
          nama: "asc",
        },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "EduPresence";
    workbook.created = new Date();

    /**
     * Sheet utama
     */
    const sheet = workbook.addWorksheet("Jadwal", {
      views: [
        {
          state: "frozen",
          ySplit: 1,
        },
      ],
    });

    sheet.columns = [
      {
        header: "Hari",
        key: "hari",
        width: 15,
      },
      {
        header: "Jam Mulai",
        key: "jamMulai",
        width: 16,
      },
      {
        header: "Jam Selesai",
        key: "jamSelesai",
        width: 16,
      },
      {
        header: "NIP Guru",
        key: "nipGuru",
        width: 22,
      },
      {
        header: "Kode Mapel",
        key: "kodeMapel",
        width: 18,
      },
      {
        header: "Kelas",
        key: "kelas",
        width: 18,
      },
      {
        header: "Ruangan",
        key: "ruangan",
        width: 22,
      },
    ];

    const headerRow = sheet.getRow(1);

    headerRow.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF4F46E5",
      },
    };

    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    headerRow.height = 24;

    sheet.autoFilter = {
      from: "A1",
      to: "G1",
    };

    /**
     * Siapkan 300 baris kosong dan dropdown hari.
     */
    for (let row = 2; row <= 301; row++) {
      sheet.getCell(`A${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${HARI_LIST.join(",")}"`],
      };

      /**
       * Paksa jam dan NIP sebagai teks agar:
       * - 07:00 tidak berubah format
       * - NIP dengan angka 0 di depan tidak hilang
       */
      sheet.getCell(`B${row}`).numFmt = "@";
      sheet.getCell(`C${row}`).numFmt = "@";
      sheet.getCell(`D${row}`).numFmt = "@";
    }

    /**
     * Sheet referensi
     */
    const referensi = workbook.addWorksheet("Referensi");

    referensi.columns = [
      { header: "NIP Guru", key: "nip", width: 22 },
      { header: "Nama Guru", key: "guru", width: 30 },
      { header: "Kode Mapel", key: "kodeMapel", width: 18 },
      { header: "Nama Mapel", key: "namaMapel", width: 30 },
      { header: "Kelas", key: "kelas", width: 18 },
      { header: "Ruangan", key: "ruangan", width: 25 },
    ];

    const referensiHeader = referensi.getRow(1);

    referensiHeader.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    referensiHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF0F766E",
      },
    };

    const jumlahBaris = Math.max(
      guru.length,
      mapel.length,
      kelas.length,
      ruangan.length,
    );

    for (let index = 0; index < jumlahBaris; index++) {
      const row = index + 2;

      referensi.getCell(row, 1).value = guru[index]?.user.nip ?? "";

      referensi.getCell(row, 2).value = guru[index]?.user.nama ?? "";

      referensi.getCell(row, 3).value = mapel[index]?.kode ?? "";

      referensi.getCell(row, 4).value = mapel[index]?.nama ?? "";

      referensi.getCell(row, 5).value = kelas[index]?.nama ?? "";

      referensi.getCell(row, 6).value = ruangan[index]?.nama ?? "";

      referensi.getCell(row, 1).numFmt = "@";
    }

    /**
     * Sheet petunjuk
     */
    const petunjuk = workbook.addWorksheet("Petunjuk");

    petunjuk.getColumn(1).width = 110;

    const petunjukData = [
      "PETUNJUK IMPORT JADWAL EDUPRESENCE",
      "",
      "1. Isi jadwal pada sheet Jadwal.",
      "2. Jangan mengubah nama atau urutan kolom.",
      "3. Hari hanya boleh SENIN, SELASA, RABU, KAMIS, JUMAT, atau SABTU.",
      "4. Jam harus menggunakan format HH:mm, misalnya 07:00.",
      "5. NIP Guru harus sesuai dengan sheet Referensi.",
      "6. Kode Mapel, Kelas, dan Ruangan harus sesuai dengan sheet Referensi.",
      "7. Jadwal yang identik akan dilewati.",
      "8. Jadwal guru, kelas, atau ruangan yang bentrok akan ditolak.",
      "9. Simpan tetap dalam format .xlsx.",
    ];

    petunjukData.forEach((text, index) => {
      petunjuk.getCell(index + 1, 1).value = text;
    });

    petunjuk.getCell("A1").font = {
      bold: true,
      size: 14,
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Template_Import_Jadwal_EduPresence.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("DOWNLOAD_TEMPLATE_JADWAL_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal membuat template jadwal" },
      { status: 500 },
    );
  }
}
