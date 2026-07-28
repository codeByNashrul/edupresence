import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import type { HariMinggu, Prisma, SemesterAkademik } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

const HARI_VALID = new Set([
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
]);

type ImportAction = "preview" | "commit";

type ImportMode = "CREATE" | "REPLACE";

type StatusBaris = "VALID" | "ERROR" | "DUPLIKAT";

type SlotJadwal = {
  hari: HariMinggu;
  jamMulai: string;
  jamSelesai: string;
  guruId: string;
  kelasId: string;
  mataPelajaranId: string;
  ruanganId: string;
};

type BarisImport = {
  rowNumber: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  nipGuru: string;
  namaGuru: string | null;
  kodeMapel: string;
  namaMapel: string | null;
  kelas: string;
  ruangan: string;
  status: StatusBaris;
  errors: string[];
};

type BarisValid = SlotJadwal & {
  rowNumber: number;
};

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

function getCellText(cell: ExcelJS.Cell) {
  return cell.text?.trim() ?? "";
}

function formatTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;

  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTime(cell: ExcelJS.Cell) {
  const value = cell.value;

  /**
   * Excel sering menyimpan jam sebagai pecahan hari.
   */
  if (typeof value === "number") {
    const fraction = value - Math.floor(value);
    const totalMinutes = Math.round(fraction * 1440);

    return formatTime(totalMinutes);
  }

  if (value instanceof Date) {
    return formatTime(value.getUTCHours() * 60 + value.getUTCMinutes());
  }

  const raw = getCellText(cell).replace(/\./g, ":").trim().toUpperCase();

  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);

  if (!match) {
    return "";
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

  if (minute < 0 || minute > 59) {
    return "";
  }

  if (period) {
    if (hour < 1 || hour > 12) {
      return "";
    }

    if (period === "AM" && hour === 12) {
      hour = 0;
    }

    if (period === "PM" && hour !== 12) {
      hour += 12;
    }
  }

  if (hour < 0 || hour > 23) {
    return "";
  }

  return formatTime(hour * 60 + minute);
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return (
    toMinutes(firstStart) < toMinutes(secondEnd) &&
    toMinutes(secondStart) < toMinutes(firstEnd)
  );
}

function getExactKey(slot: SlotJadwal) {
  return [
    slot.hari,
    slot.jamMulai,
    slot.jamSelesai,
    slot.guruId,
    slot.kelasId,
    slot.mataPelajaranId,
    slot.ruanganId,
  ].join("|");
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const tahunAjaran = String(formData.get("tahunAjaran") ?? "").trim();

    const semesterValue = String(formData.get("semester") ?? "").toUpperCase();
    const tahunAjaranMatch = tahunAjaran.match(/^(\d{4})\/(\d{4})$/);

    if (!tahunAjaranMatch) {
      return NextResponse.json(
        {
          error:
            "Tahun ajaran harus menggunakan format YYYY/YYYY, misalnya 2026/2027",
        },
        { status: 400 },
      );
    }

    const tahunMulai = Number(tahunAjaranMatch[1]);
    const tahunSelesai = Number(tahunAjaranMatch[2]);

    if (tahunSelesai !== tahunMulai + 1) {
      return NextResponse.json(
        {
          error: "Tahun akhir harus satu tahun setelah tahun awal",
        },
        { status: 400 },
      );
    }

    if (semesterValue !== "GANJIL" && semesterValue !== "GENAP") {
      return NextResponse.json(
        {
          error: "Semester harus GANJIL atau GENAP",
        },
        { status: 400 },
      );
    }

    const semester = semesterValue as SemesterAkademik;

    const file = formData.get("file");

    const actionValue = formData.get("action");

    const modeValue = String(formData.get("mode") ?? "CREATE").toUpperCase();

    const action: ImportAction =
      actionValue === "commit" ? "commit" : "preview";

    if (modeValue !== "CREATE" && modeValue !== "REPLACE") {
      return NextResponse.json(
        {
          error: "Mode import harus CREATE atau REPLACE",
        },
        { status: 400 },
      );
    }

    const mode = modeValue as ImportMode;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File Excel wajib dipilih" },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        {
          error: "File harus menggunakan format .xlsx",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Ukuran file maksimal 5 MB",
        },
        { status: 400 },
      );
    }

    const workbook = new ExcelJS.Workbook();

    try {
      const arrayBuffer = await file.arrayBuffer();

      await workbook.xlsx.load(arrayBuffer);
    } catch {
      return NextResponse.json(
        {
          error: "File Excel tidak dapat dibaca atau formatnya rusak",
        },
        { status: 400 },
      );
    }

    const worksheet = workbook.getWorksheet("Jadwal") ?? workbook.worksheets[0];

    if (!worksheet) {
      return NextResponse.json(
        {
          error: "Sheet Jadwal tidak ditemukan",
        },
        { status: 400 },
      );
    }

    const expectedHeaders = [
      "HARI",
      "JAM MULAI",
      "JAM SELESAI",
      "NIP GURU",
      "KODE MAPEL",
      "KELAS",
      "RUANGAN",
    ];

    const actualHeaders = expectedHeaders.map((_, index) =>
      getCellText(worksheet.getRow(1).getCell(index + 1)).toUpperCase(),
    );

    const headerValid = expectedHeaders.every(
      (header, index) => actualHeaders[index] === header,
    );

    if (!headerValid) {
      return NextResponse.json(
        {
          error: "Format kolom tidak sesuai template EduPresence",
          expectedHeaders,
          actualHeaders,
        },
        { status: 400 },
      );
    }

    const rawRows: Array<{
      rowNumber: number;
      hari: string;
      jamMulai: string;
      jamSelesai: string;
      nipGuru: string;
      kodeMapel: string;
      kelas: string;
      ruangan: string;
    }> = [];

    worksheet.eachRow(
      {
        includeEmpty: false,
      },
      (row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }

        const cells = Array.from({ length: 7 }, (_, index) =>
          row.getCell(index + 1),
        );

        const isEmpty = cells.every((cell) => getCellText(cell) === "");

        if (isEmpty) {
          return;
        }

        rawRows.push({
          rowNumber,
          hari: getCellText(row.getCell(1)).toUpperCase(),
          jamMulai: normalizeTime(row.getCell(2)),
          jamSelesai: normalizeTime(row.getCell(3)),
          nipGuru: getCellText(row.getCell(4)),
          kodeMapel: getCellText(row.getCell(5)).toUpperCase(),
          kelas: getCellText(row.getCell(6)),
          ruangan: getCellText(row.getCell(7)),
        });
      },
    );

    if (rawRows.length === 0) {
      return NextResponse.json(
        {
          error: "File belum berisi data jadwal",
        },
        { status: 400 },
      );
    }

    if (rawRows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Maksimal ${MAX_ROWS} baris dalam satu kali import`,
        },
        { status: 400 },
      );
    }

    const [guruList, mapelList, kelasList, ruanganList, jadwalLama] =
      await Promise.all([
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
                nip: true,
                nama: true,
              },
            },
          },
        }),

        prisma.mataPelajaran.findMany({
          where: {
            aktif: true,
          },
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        }),

        prisma.kelas.findMany({
          where: {
            aktif: true,
          },
          select: {
            id: true,
            nama: true,
          },
        }),

        prisma.ruangan.findMany({
          where: {
            aktif: true,
          },
          select: {
            id: true,
            nama: true,
          },
        }),

        prisma.jadwal.findMany({
          where: {
            aktif: true,
            tahunAjaran,
            semester,
          },
          select: {
            id: true,
            hari: true,
            jamMulai: true,
            jamSelesai: true,
            guruId: true,
            kelasId: true,
            mataPelajaranId: true,
            ruanganId: true,
          },
        }),
      ]);

    const guruByNip = new Map(
      guruList.map((guru) => [normalizeKey(guru.user.nip), guru]),
    );

    const mapelByKode = new Map(
      mapelList.map((mapel) => [normalizeKey(mapel.kode), mapel]),
    );

    const kelasByNama = new Map(
      kelasList.map((kelas) => [normalizeKey(kelas.nama), kelas]),
    );

    const ruanganByNama = new Map(
      ruanganList.map((ruangan) => [normalizeKey(ruangan.nama), ruangan]),
    );

    const existingSlots: SlotJadwal[] = jadwalLama.map((jadwal) => ({
      hari: jadwal.hari,
      jamMulai: jadwal.jamMulai,
      jamSelesai: jadwal.jamSelesai,
      guruId: jadwal.guruId,
      kelasId: jadwal.kelasId,
      mataPelajaranId: jadwal.mataPelajaranId,
      ruanganId: jadwal.ruanganId,
    }));

    const exactExistingKeys = new Set(existingSlots.map(getExactKey));

    const importedExactKeys = new Set<string>();
    const validRows: BarisValid[] = [];
    const previewRows: BarisImport[] = [];

    for (const row of rawRows) {
      const errors: string[] = [];

      if (!HARI_VALID.has(row.hari)) {
        errors.push("Hari tidak valid");
      }

      if (!row.jamMulai) {
        errors.push("Format jam mulai tidak valid");
      }

      if (!row.jamSelesai) {
        errors.push("Format jam selesai tidak valid");
      }

      if (
        row.jamMulai &&
        row.jamSelesai &&
        toMinutes(row.jamMulai) >= toMinutes(row.jamSelesai)
      ) {
        errors.push("Jam mulai harus lebih awal dari jam selesai");
      }

      const dataGuru = guruByNip.get(normalizeKey(row.nipGuru));

      const dataMapel = mapelByKode.get(normalizeKey(row.kodeMapel));

      const dataKelas = kelasByNama.get(normalizeKey(row.kelas));

      const dataRuangan = ruanganByNama.get(normalizeKey(row.ruangan));

      if (!dataGuru) {
        errors.push("NIP guru tidak ditemukan");
      }

      if (!dataMapel) {
        errors.push("Kode mata pelajaran tidak ditemukan");
      }

      if (!dataKelas) {
        errors.push("Kelas tidak ditemukan");
      }

      if (!dataRuangan) {
        errors.push("Ruangan tidak ditemukan");
      }

      const previewBase = {
        rowNumber: row.rowNumber,
        hari: row.hari,
        jamMulai: row.jamMulai,
        jamSelesai: row.jamSelesai,
        nipGuru: row.nipGuru,
        namaGuru: dataGuru?.user.nama ?? null,
        kodeMapel: row.kodeMapel,
        namaMapel: dataMapel?.nama ?? null,
        kelas: row.kelas,
        ruangan: row.ruangan,
      };

      if (
        errors.length > 0 ||
        !dataGuru ||
        !dataMapel ||
        !dataKelas ||
        !dataRuangan ||
        !HARI_VALID.has(row.hari)
      ) {
        previewRows.push({
          ...previewBase,
          status: "ERROR",
          errors,
        });

        continue;
      }

      const slot: SlotJadwal = {
        hari: row.hari as HariMinggu,
        jamMulai: row.jamMulai,
        jamSelesai: row.jamSelesai,
        guruId: dataGuru.id,
        kelasId: dataKelas.id,
        mataPelajaranId: dataMapel.id,
        ruanganId: dataRuangan.id,
      };

      const exactKey = getExactKey(slot);

      const duplicateDiDatabase =
        mode === "CREATE" && exactExistingKeys.has(exactKey);

      const duplicateDiFile = importedExactKeys.has(exactKey);

      if (duplicateDiDatabase || duplicateDiFile) {
        previewRows.push({
          ...previewBase,
          status: "DUPLIKAT",
          errors: [
            duplicateDiFile
              ? "Jadwal identik muncul lebih dari sekali dalam file"
              : "Jadwal identik sudah tersedia",
          ],
        });

        continue;
      }

      const comparisonSlots =
        mode === "CREATE" ? [...existingSlots, ...validRows] : [...validRows];

      for (const existing of comparisonSlots) {
        if (existing.hari !== slot.hari) {
          continue;
        }

        if (
          !isOverlap(
            slot.jamMulai,
            slot.jamSelesai,
            existing.jamMulai,
            existing.jamSelesai,
          )
        ) {
          continue;
        }

        if (existing.guruId === slot.guruId) {
          errors.push(
            `Guru bentrok pada ${existing.jamMulai}–${existing.jamSelesai}`,
          );
        }

        if (existing.kelasId === slot.kelasId) {
          errors.push(
            `Kelas bentrok pada ${existing.jamMulai}–${existing.jamSelesai}`,
          );
        }

        if (existing.ruanganId === slot.ruanganId) {
          errors.push(
            `Ruangan bentrok pada ${existing.jamMulai}–${existing.jamSelesai}`,
          );
        }
      }

      const uniqueErrors = [...new Set(errors)];

      if (uniqueErrors.length > 0) {
        previewRows.push({
          ...previewBase,
          status: "ERROR",
          errors: uniqueErrors,
        });

        continue;
      }

      importedExactKeys.add(exactKey);

      validRows.push({
        ...slot,
        rowNumber: row.rowNumber,
      });

      previewRows.push({
        ...previewBase,
        status: "VALID",
        errors: [],
      });
    }

    const summary = {
      total: previewRows.length,
      valid: previewRows.filter((row) => row.status === "VALID").length,
      invalid: previewRows.filter((row) => row.status === "ERROR").length,
      duplicate: previewRows.filter((row) => row.status === "DUPLIKAT").length,
    };

    if (action === "preview") {
      return NextResponse.json({
        success: true,
        action,
        mode,

        message:
          mode === "REPLACE"
            ? "File valid untuk mengganti jadwal periode ini"
            : "File valid untuk menambahkan jadwal baru",

        periode: {
          tahunAjaran,
          semester,
        },

        summary,
        rows: previewRows,
      });
    }

    if (mode === "REPLACE" && (summary.invalid > 0 || summary.duplicate > 0)) {
      return NextResponse.json(
        {
          error:
            "Update jadwal dibatalkan. Semua baris harus valid dan tidak boleh ada duplikat.",
          mode,
          summary,
          rows: previewRows,
        },
        { status: 400 },
      );
    }

    const data: Prisma.JadwalCreateManyInput[] = validRows.map((row) => ({
      hari: row.hari,
      jamMulai: row.jamMulai,
      jamSelesai: row.jamSelesai,
      guruId: row.guruId,
      kelasId: row.kelasId,
      mataPelajaranId: row.mataPelajaranId,
      ruanganId: row.ruanganId,

      tahunAjaran,
      semester,

      aktif: true,
    }));

    const commitResult = await prisma.$transaction(async (tx) => {
      let replaced = 0;

      if (mode === "REPLACE") {
        const nonaktifkanJadwalLama = await tx.jadwal.updateMany({
          where: {
            aktif: true,
            tahunAjaran,
            semester,
          },
          data: {
            aktif: false,
          },
        });

        replaced = nonaktifkanJadwalLama.count;
      }

      const buatJadwalBaru = await tx.jadwal.createMany({
        data,
      });

      return {
        imported: buatJadwalBaru.count,
        replaced,
      };
    });

    const commitSummary = {
      ...summary,
      imported: commitResult.imported,
      replaced: commitResult.replaced,
    };

    return NextResponse.json({
      success: true,
      action,
      mode,

      message:
        mode === "REPLACE"
          ? `${commitResult.replaced} jadwal lama dinonaktifkan dan ${commitResult.imported} jadwal baru diterapkan`
          : `${commitResult.imported} jadwal berhasil ditambahkan`,

      periode: {
        tahunAjaran,
        semester,
      },

      summary: commitSummary,
      rows: previewRows,
    });
  } catch (error) {
    console.error("IMPORT_JADWAL_ERROR:", error);

    return NextResponse.json(
      {
        error: "Gagal memproses import jadwal",
      },
      { status: 500 },
    );
  }
}
