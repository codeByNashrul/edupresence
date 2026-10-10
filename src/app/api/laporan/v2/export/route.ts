import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { Role } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import {
  getLaporanV2,
  type LaporanV2Params,
  type PeriodeLaporan,
  type ScopePegawai,
} from "@/lib/laporan-v2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionUserWithRoles = {
  role?: string | null;
  roles?: string[] | null;
  rolesTambahan?: string[] | null;
};

const PERIODS: PeriodeLaporan[] = ["harian", "mingguan", "bulanan", "custom"];

const SCOPES: ScopePegawai[] = ["semua", "guru", "staff"];

const STATUS_LABEL: Record<string, string> = {
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPHA: "Alpha",
  BELUM_ABSEN: "Belum Absen",
  BELUM_WAKTUNYA: "Belum Waktunya",
};

const COLORS = {
  primary: "FF4F46E5",
  primarySoft: "FFEEF2FF",
  dark: "FF111827",
  muted: "FF6B7280",
  border: "FFE5E7EB",
  white: "FFFFFFFF",
  green: "FF059669",
  greenSoft: "FFD1FAE5",
  amber: "FFD97706",
  amberSoft: "FFFEF3C7",
  red: "FFDC2626",
  redSoft: "FFFEE2E2",
  blueSoft: "FFDBEAFE",
};

function hasManagementAccess(user: SessionUserWithRoles) {
  const roles = new Set<string>();

  if (user.role) {
    roles.add(user.role);
  }

  for (const role of user.roles ?? []) {
    roles.add(role);
  }

  for (const role of user.rolesTambahan ?? []) {
    roles.add(role);
  }

  return roles.has(Role.ADMIN) || roles.has(Role.PIMPINAN);
}

function parseParams(req: Request): LaporanV2Params {
  const { searchParams } = new URL(req.url);

  const periodeRaw = searchParams.get("periode") ?? "bulanan";

  const scopeRaw = searchParams.get("scope") ?? "semua";

  if (!PERIODS.includes(periodeRaw as PeriodeLaporan)) {
    throw new Error("INVALID_PERIODE");
  }

  if (!SCOPES.includes(scopeRaw as ScopePegawai)) {
    throw new Error("INVALID_SCOPE");
  }

  return {
    periode: periodeRaw as PeriodeLaporan,
    scope: scopeRaw as ScopePegawai,
    tanggal: searchParams.get("tanggal"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    userId: searchParams.get("userId"),
  };
}

function roleLabel(roles: { guru: boolean; staff: boolean }) {
  const values: string[] = [];

  if (roles.guru) values.push("Guru");
  if (roles.staff) values.push("Staff");

  return values.join(" + ") || "-";
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return value / 100;
}

function safeFilenamePart(value: string) {
  return value
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function styleTitle(
  sheet: ExcelJS.Worksheet,
  lastColumn: number,
  title: string,
  subtitle: string,
) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.getCell(1, 1).value = title;

  sheet.getCell(1, 1).font = {
    bold: true,
    size: 18,
    color: {
      argb: COLORS.white,
    },
  };

  sheet.getCell(1, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: COLORS.primary,
    },
  };

  sheet.getCell(1, 1).alignment = {
    vertical: "middle",
  };

  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastColumn);
  sheet.getCell(2, 1).value = subtitle;

  sheet.getCell(2, 1).font = {
    size: 10,
    color: {
      argb: COLORS.muted,
    },
  };

  sheet.getCell(2, 1).alignment = {
    vertical: "middle",
  };

  sheet.getRow(2).height = 20;
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: {
        argb: COLORS.white,
      },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: COLORS.dark,
      },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = {
      bottom: {
        style: "thin",
        color: {
          argb: COLORS.border,
        },
      },
    };
  });

  row.height = 24;
}

function styleBody(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  lastColumn: number,
) {
  if (endRow < startRow) return;

  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);

    row.eachCell(
      {
        includeEmpty: true,
      },
      (cell, columnNumber) => {
        if (columnNumber > lastColumn) return;

        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };

        cell.border = {
          bottom: {
            style: "hair",
            color: {
              argb: COLORS.border,
            },
          },
        };
      },
    );
  }
}

function colorStatusCell(cell: ExcelJS.Cell, status: string) {
  if (status === "HADIR") {
    cell.font = {
      color: { argb: COLORS.green },
      bold: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: COLORS.greenSoft,
      },
    };
    return;
  }

  if (status === "TERLAMBAT" || status === "BELUM_ABSEN") {
    cell.font = {
      color: { argb: COLORS.amber },
      bold: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: COLORS.amberSoft,
      },
    };
    return;
  }

  if (status === "ALPHA") {
    cell.font = {
      color: { argb: COLORS.red },
      bold: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: COLORS.redSoft,
      },
    };
  }
}

function setPercentColumn(
  sheet: ExcelJS.Worksheet,
  column: string,
  startRow: number,
  endRow: number,
) {
  if (endRow < startRow) return;

  sheet.getColumn(column).numFmt = "0.00%";

  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
    const cell = sheet.getCell(`${column}${rowNumber}`);

    if (typeof cell.value === "number") {
      if (cell.value >= 0.9) {
        cell.font = {
          color: {
            argb: COLORS.green,
          },
          bold: true,
        };
      } else if (cell.value >= 0.7) {
        cell.font = {
          color: {
            argb: COLORS.amber,
          },
          bold: true,
        };
      } else {
        cell.font = {
          color: {
            argb: COLORS.red,
          },
          bold: true,
        };
      }
    }
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    if (!hasManagementAccess(session.user as SessionUserWithRoles)) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses ke laporan",
        },
        {
          status: 403,
        },
      );
    }

    const params = parseParams(req);
    const data = await getLaporanV2(params);

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "EduPresence";
    workbook.company = "SMP POMOSDA";
    workbook.created = new Date();
    workbook.modified = new Date();

    const subtitle =
      `Periode ${data.period.from} s.d. ` +
      `${data.period.effectiveTo} · ` +
      `Dibuat ${data.period.today}` +
      (data.period.asOfTimeJakarta
        ? ` ${data.period.asOfTimeJakarta} WIB`
        : "");

    // =====================================================
    // SHEET 1 — RINGKASAN
    // =====================================================

    const summarySheet = workbook.addWorksheet("Ringkasan", {
      views: [
        {
          state: "frozen",
          ySplit: 2,
        },
      ],
    });

    summarySheet.columns = [
      { width: 20 },
      { width: 16 },
      { width: 20 },
      { width: 16 },
      { width: 20 },
      { width: 16 },
      { width: 20 },
      { width: 16 },
    ];

    styleTitle(summarySheet, 8, "Laporan Kehadiran & KBM", subtitle);

    function styleKpiBlock(
      fromColumn: number,
      toColumn: number,
      label: string,
      value: string | number,
      fillColor: string,
      valueColor: string,
    ) {
      summarySheet.mergeCells(4, fromColumn, 4, toColumn);

      summarySheet.mergeCells(5, fromColumn, 6, toColumn);

      const labelCell = summarySheet.getCell(4, fromColumn);

      const valueCell = summarySheet.getCell(5, fromColumn);

      labelCell.value = label;
      valueCell.value = value;

      labelCell.font = {
        bold: true,
        size: 10,
        color: {
          argb: COLORS.muted,
        },
      };

      labelCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      valueCell.font = {
        bold: true,
        size: 20,
        color: {
          argb: valueColor,
        },
      };

      valueCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      for (let row = 4; row <= 6; row++) {
        for (let column = fromColumn; column <= toColumn; column++) {
          const cell = summarySheet.getCell(row, column);

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: fillColor,
            },
          };

          cell.border = {
            top: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
            left: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
            bottom: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
            right: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
          };
        }
      }
    }

    styleKpiBlock(
      1,
      2,
      "KEHADIRAN FISIK",
      data.summary.pegawai.persentaseKehadiranFisik === null
        ? "-"
        : `${data.summary.pegawai.persentaseKehadiranFisik}%`,
      COLORS.greenSoft,
      COLORS.green,
    );

    styleKpiBlock(
      3,
      4,
      "STATUS TERCATAT",
      data.summary.pegawai.persentaseStatusTercatat === null
        ? "-"
        : `${data.summary.pegawai.persentaseStatusTercatat}%`,
      COLORS.blueSoft,
      COLORS.primary,
    );

    styleKpiBlock(
      5,
      6,
      "KETERLAKSANAAN KBM",
      data.summary.mengajar.persentaseKeterlaksanaanPertemuan === null
        ? "-"
        : `${data.summary.mengajar.persentaseKeterlaksanaanPertemuan}%`,
      COLORS.primarySoft,
      COLORS.primary,
    );

    styleKpiBlock(
      7,
      8,
      "PERLU PERHATIAN",
      data.perluPerhatian.length,
      COLORS.amberSoft,
      COLORS.amber,
    );

    summarySheet.getRow(4).height = 23;
    summarySheet.getRow(5).height = 22;
    summarySheet.getRow(6).height = 22;

    // =====================================================
    // KOMPOSISI PEGAWAI
    // =====================================================

    const employeeMetrics = [
      {
        from: 1,
        to: 2,
        label: "Total Pegawai",
        value: data.summary.pegawai.total,
      },
      {
        from: 3,
        to: 4,
        label: "Guru",
        value: data.summary.pegawai.guru,
      },
      {
        from: 5,
        to: 6,
        label: "Staff",
        value: data.summary.pegawai.staff,
      },
      {
        from: 7,
        to: 8,
        label: "JP Terlaksana",
        value:
          `${data.summary.mengajar.jpTerlaksana} / ` +
          `${data.summary.mengajar.jpSeharusnya}`,
      },
    ];

    for (const metric of employeeMetrics) {
      summarySheet.mergeCells(8, metric.from, 8, metric.to);

      summarySheet.mergeCells(9, metric.from, 10, metric.to);

      const labelCell = summarySheet.getCell(8, metric.from);

      const valueCell = summarySheet.getCell(9, metric.from);

      labelCell.value = metric.label;
      valueCell.value = metric.value;

      labelCell.font = {
        bold: true,
        size: 10,
        color: {
          argb: COLORS.muted,
        },
      };

      valueCell.font = {
        bold: true,
        size: 16,
        color: {
          argb: COLORS.dark,
        },
      };

      labelCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      valueCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      for (let row = 8; row <= 10; row++) {
        for (let column = metric.from; column <= metric.to; column++) {
          const cell = summarySheet.getCell(row, column);

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFF9FAFB",
            },
          };

          cell.border = {
            top: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
            left: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
            bottom: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
            right: {
              style: "thin",
              color: {
                argb: COLORS.border,
              },
            },
          };
        }
      }
    }

    // =====================================================
    // DETAIL STATUS — DUA BLOK BERDAMPINGAN
    // =====================================================

    summarySheet.mergeCells("A12:D12");
    summarySheet.getCell("A12").value = "Status Kehadiran Pegawai";

    summarySheet.mergeCells("E12:H12");
    summarySheet.getCell("E12").value = "Status Mengajar";

    for (const cellRef of ["A12", "E12"]) {
      const cell = summarySheet.getCell(cellRef);

      cell.font = {
        bold: true,
        size: 11,
        color: {
          argb: COLORS.white,
        },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: COLORS.dark,
        },
      };

      cell.alignment = {
        vertical: "middle",
      };
    }

    summarySheet.getRow(12).height = 24;

    summarySheet.getCell("A13").value = "Status";

    summarySheet.getCell("B13").value = "Jumlah";

    summarySheet.getCell("E13").value = "Status";

    summarySheet.getCell("F13").value = "Pertemuan";

    summarySheet.getCell("G13").value = "JP";

    for (const cellRef of ["A13", "B13", "E13", "F13", "G13"]) {
      const cell = summarySheet.getCell(cellRef);

      cell.font = {
        bold: true,
        color: {
          argb: COLORS.dark,
        },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFF3F4F6",
        },
      };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      cell.border = {
        bottom: {
          style: "thin",
          color: {
            argb: COLORS.border,
          },
        },
      };
    }

    const attendanceStatuses = [
      ["Hadir", data.summary.pegawai.HADIR],
      ["Terlambat", data.summary.pegawai.TERLAMBAT],
      ["Izin", data.summary.pegawai.IZIN],
      ["Sakit", data.summary.pegawai.SAKIT],
      ["Alpha", data.summary.pegawai.ALPHA],
      ["Belum Absen", data.summary.pegawai.BELUM_ABSEN],
    ];

    const teachingStatuses = [
      ["Hadir", data.summary.mengajar.HADIR, data.summary.mengajar.HADIR * 2],
      [
        "Terlambat",
        data.summary.mengajar.TERLAMBAT,
        data.summary.mengajar.TERLAMBAT * 2,
      ],
      ["Izin", data.summary.mengajar.IZIN, data.summary.mengajar.IZIN * 2],
      ["Sakit", data.summary.mengajar.SAKIT, data.summary.mengajar.SAKIT * 2],
      ["Alpha", data.summary.mengajar.ALPHA, data.summary.mengajar.ALPHA * 2],
      [
        "Belum Absen",
        data.summary.mengajar.BELUM_ABSEN,
        data.summary.mengajar.jpBelumAbsen,
      ],
    ];

    attendanceStatuses.forEach((status, index) => {
      const rowNumber = 14 + index;

      summarySheet.getCell(`A${rowNumber}`).value = status[0];

      summarySheet.getCell(`B${rowNumber}`).value = status[1];

      summarySheet.getCell(`A${rowNumber}`).alignment = {
        vertical: "middle",
      };

      summarySheet.getCell(`B${rowNumber}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    teachingStatuses.forEach((status, index) => {
      const rowNumber = 14 + index;

      summarySheet.getCell(`E${rowNumber}`).value = status[0];

      summarySheet.getCell(`F${rowNumber}`).value = status[1];

      summarySheet.getCell(`G${rowNumber}`).value = status[2];

      summarySheet.getCell(`E${rowNumber}`).alignment = {
        vertical: "middle",
      };

      summarySheet.getCell(`F${rowNumber}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      summarySheet.getCell(`G${rowNumber}`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    for (let rowNumber = 14; rowNumber <= 19; rowNumber++) {
      for (const column of ["A", "B", "E", "F", "G"]) {
        const cell = summarySheet.getCell(`${column}${rowNumber}`);

        cell.border = {
          bottom: {
            style: "hair",
            color: {
              argb: COLORS.border,
            },
          },
        };
      }
    }

    summarySheet.getCell("A19").font = {
      bold: true,
      color: {
        argb: COLORS.amber,
      },
    };

    summarySheet.getCell("B19").font = {
      bold: true,
      color: {
        argb: COLORS.amber,
      },
    };

    summarySheet.getCell("E19").font = {
      bold: true,
      color: {
        argb: COLORS.amber,
      },
    };

    summarySheet.getCell("F19").font = {
      bold: true,
      color: {
        argb: COLORS.amber,
      },
    };

    summarySheet.getCell("G19").font = {
      bold: true,
      color: {
        argb: COLORS.amber,
      },
    };

    summarySheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    };

    summarySheet.pageSetup.printArea = "A1:H19";

    // =====================================================
    // SHEET 2 — KEHADIRAN
    // =====================================================

    const attendanceSheet = workbook.addWorksheet("Kehadiran Pegawai", {
      views: [
        {
          state: "frozen",
          ySplit: 4,
        },
      ],
    });

    styleTitle(attendanceSheet, 13, "Kehadiran Pegawai", subtitle);

    attendanceSheet.columns = [
      { width: 6 },
      { width: 34 },
      { width: 20 },
      { width: 16 },
      { width: 12 },
      { width: 10 },
      { width: 12 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
    ];

    attendanceSheet.addRow([]);

    const attendanceHeader = attendanceSheet.addRow([
      "No.",
      "Nama",
      "NIP",
      "Role",
      "Hari Kerja",
      "Hadir",
      "Terlambat",
      "Izin",
      "Sakit",
      "Alpha",
      "Belum Absen",
      "Kehadiran Fisik",
      "Status Tercatat",
    ]);

    styleHeader(attendanceHeader);

    data.pegawai.forEach((pegawai, index) => {
      attendanceSheet.addRow([
        index + 1,
        pegawai.nama,
        pegawai.nip,
        roleLabel(pegawai.roles),
        pegawai.kehadiran.hariKerjaSeharusnya,
        pegawai.kehadiran.HADIR,
        pegawai.kehadiran.TERLAMBAT,
        pegawai.kehadiran.IZIN,
        pegawai.kehadiran.SAKIT,
        pegawai.kehadiran.ALPHA,
        pegawai.kehadiran.BELUM_ABSEN,
        pct(pegawai.kehadiran.persentaseKehadiranFisik),
        pct(pegawai.kehadiran.persentaseStatusTercatat),
      ]);
    });

    attendanceSheet.autoFilter = {
      from: "A4",
      to: "M4",
    };

    styleBody(attendanceSheet, 5, attendanceSheet.rowCount, 13);

    setPercentColumn(attendanceSheet, "L", 5, attendanceSheet.rowCount);

    setPercentColumn(attendanceSheet, "M", 5, attendanceSheet.rowCount);

    // =====================================================
    // SHEET 3 — KBM
    // =====================================================

    const teachingSheet = workbook.addWorksheet("Keterlaksanaan KBM", {
      views: [
        {
          state: "frozen",
          ySplit: 4,
        },
      ],
    });

    styleTitle(teachingSheet, 15, "Keterlaksanaan Mengajar", subtitle);

    teachingSheet.columns = [
      { width: 6 },
      { width: 34 },
      { width: 20 },
      { width: 18 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 14 },
      { width: 16 },
      { width: 14 },
    ];

    teachingSheet.addRow([]);

    const teachingHeader = teachingSheet.addRow([
      "No.",
      "Nama Guru",
      "NIP",
      "Role",
      "Pertemuan Terjadwal",
      "Pertemuan Seharusnya",
      "Pertemuan Terlaksana",
      "JP Seharusnya",
      "JP Terlaksana",
      "Izin",
      "Sakit",
      "Alpha",
      "Belum Absen",
      "JP Belum Absen",
      "Keterlaksanaan",
    ]);

    styleHeader(teachingHeader);

    const guru = data.pegawai.filter((pegawai) => pegawai.mengajar.berlaku);

    guru.forEach((pegawai, index) => {
      teachingSheet.addRow([
        index + 1,
        pegawai.nama,
        pegawai.nip,
        roleLabel(pegawai.roles),
        pegawai.mengajar.pertemuanTerjadwal,
        pegawai.mengajar.pertemuanSeharusnya,
        pegawai.mengajar.pertemuanTerlaksana,
        pegawai.mengajar.jpSeharusnya,
        pegawai.mengajar.jpTerlaksana,
        pegawai.mengajar.IZIN,
        pegawai.mengajar.SAKIT,
        pegawai.mengajar.ALPHA,
        pegawai.mengajar.BELUM_ABSEN,
        pegawai.mengajar.jpBelumAbsen,
        pct(pegawai.mengajar.persentaseKeterlaksanaanPertemuan),
      ]);
    });

    teachingSheet.autoFilter = {
      from: "A4",
      to: "O4",
    };

    styleBody(teachingSheet, 5, teachingSheet.rowCount, 15);

    setPercentColumn(teachingSheet, "O", 5, teachingSheet.rowCount);

    // =====================================================
    // SHEET 4 — PERLU PERHATIAN
    // =====================================================

    const attentionSheet = workbook.addWorksheet("Perlu Perhatian", {
      views: [
        {
          state: "frozen",
          ySplit: 4,
        },
      ],
    });

    styleTitle(attentionSheet, 10, "Pegawai Perlu Perhatian", subtitle);

    attentionSheet.columns = [
      { width: 6 },
      { width: 34 },
      { width: 20 },
      { width: 16 },
      { width: 16 },
      { width: 20 },
      { width: 16 },
      { width: 20 },
      { width: 16 },
      { width: 18 },
    ];

    attentionSheet.addRow([]);

    const attentionHeader = attentionSheet.addRow([
      "No.",
      "Nama",
      "NIP",
      "Role",
      "Alpha Kehadiran",
      "Belum Absen Kehadiran",
      "Alpha Mengajar",
      "Belum Absen Mengajar",
      "JP Belum Absen",
      "Total Masalah",
    ]);

    styleHeader(attentionHeader);

    data.perluPerhatian.forEach((item, index) => {
      const total =
        item.kehadiran.alpha +
        item.kehadiran.belumAbsen +
        item.mengajar.alpha +
        item.mengajar.belumAbsen;

      attentionSheet.addRow([
        index + 1,
        item.nama,
        item.nip,
        roleLabel(item.roles),
        item.kehadiran.alpha,
        item.kehadiran.belumAbsen,
        item.mengajar.alpha,
        item.mengajar.belumAbsen,
        item.mengajar.jpBelumAbsen,
        total,
      ]);
    });

    attentionSheet.autoFilter = {
      from: "A4",
      to: "J4",
    };

    styleBody(attentionSheet, 5, attentionSheet.rowCount, 10);

    // =====================================================
    // SHEET 5 — DETAIL KEHADIRAN
    // =====================================================

    const detailAttendanceSheet = workbook.addWorksheet("Detail Kehadiran", {
      views: [
        {
          state: "frozen",
          ySplit: 4,
        },
      ],
    });

    styleTitle(detailAttendanceSheet, 7, "Detail Kehadiran Pegawai", subtitle);

    detailAttendanceSheet.columns = [
      { width: 6 },
      { width: 34 },
      { width: 20 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
      { width: 16 },
    ];

    detailAttendanceSheet.addRow([]);

    const detailAttendanceHeader = detailAttendanceSheet.addRow([
      "No.",
      "Nama",
      "NIP",
      "Role",
      "Tanggal",
      "Status",
      "Jam Scan WIB",
    ]);

    styleHeader(detailAttendanceHeader);

    let attendanceDetailNo = 1;

    for (const pegawai of data.pegawai) {
      for (const detail of pegawai.kehadiran.detail) {
        const scanTime = detail.waktuScan
          ? new Intl.DateTimeFormat("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            }).format(new Date(detail.waktuScan))
          : "-";

        const row = detailAttendanceSheet.addRow([
          attendanceDetailNo++,
          pegawai.nama,
          pegawai.nip,
          roleLabel(pegawai.roles),
          detail.tanggal,
          STATUS_LABEL[detail.status] ?? detail.status,
          scanTime,
        ]);

        colorStatusCell(row.getCell(6), detail.status);
      }
    }

    detailAttendanceSheet.autoFilter = {
      from: "A4",
      to: "G4",
    };

    styleBody(detailAttendanceSheet, 5, detailAttendanceSheet.rowCount, 7);

    // =====================================================
    // SHEET 6 — DETAIL MENGAJAR
    // =====================================================

    const detailTeachingSheet = workbook.addWorksheet("Detail Mengajar", {
      views: [
        {
          state: "frozen",
          ySplit: 4,
        },
      ],
    });

    styleTitle(
      detailTeachingSheet,
      13,
      "Detail Keterlaksanaan Mengajar",
      subtitle,
    );

    detailTeachingSheet.columns = [
      { width: 6 },
      { width: 34 },
      { width: 20 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 30 },
      { width: 22 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 10 },
    ];

    detailTeachingSheet.addRow([]);

    const detailTeachingHeader = detailTeachingSheet.addRow([
      "No.",
      "Nama Guru",
      "NIP",
      "Tanggal",
      "Jam Mulai",
      "Jam Selesai",
      "Kelas",
      "Mata Pelajaran",
      "Ruangan",
      "Sumber Jadwal",
      "Status",
      "JP",
      "Jadwal ID",
    ]);

    styleHeader(detailTeachingHeader);

    let teachingDetailNo = 1;

    for (const pegawai of guru) {
      for (const detail of pegawai.mengajar.detail) {
        const row = detailTeachingSheet.addRow([
          teachingDetailNo++,
          pegawai.nama,
          pegawai.nip,
          detail.tanggal,
          detail.jamMulai,
          detail.jamSelesai,
          detail.kelas,
          detail.mataPelajaran,
          detail.ruangan,
          detail.sumber,
          STATUS_LABEL[detail.status] ?? detail.status,
          detail.jp,
          detail.jadwalId,
        ]);

        colorStatusCell(row.getCell(11), detail.status);
      }
    }

    detailTeachingSheet.autoFilter = {
      from: "A4",
      to: "M4",
    };

    styleBody(detailTeachingSheet, 5, detailTeachingSheet.rowCount, 13);

    const employeeName =
      data.pegawai.length === 1
        ? `-${safeFilenamePart(data.pegawai[0].nama)}`
        : "";

    const filename =
      `Laporan-EduPresence-` +
      `${data.period.from}-` +
      `${data.period.effectiveTo}` +
      `${employeeName}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("LAPORAN_V2_EXPORT_ERROR:", error);

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    const badRequestErrors = new Set([
      "INVALID_PERIODE",
      "INVALID_SCOPE",
      "CUSTOM_DATE_REQUIRED",
      "INVALID_DATE_RANGE",
      "DATE_RANGE_TOO_LARGE",
      "PEGAWAI_NOT_FOUND",
    ]);

    return NextResponse.json(
      {
        error: badRequestErrors.has(message)
          ? message
          : "Gagal membuat file Excel laporan",
      },
      {
        status: badRequestErrors.has(message) ? 400 : 500,
      },
    );
  }
}
