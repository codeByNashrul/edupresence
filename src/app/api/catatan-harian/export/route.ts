import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReadinessStatus =
  "LENGKAP" | "PERLU_DILENGKAPI" | "BELUM_LENGKAP" | "BELUM_ADA_HARI_KERJA";

interface ExportStaff {
  id: string;
  nama: string;
  nip: string;
  expectedReports: number;
  submittedReports: number;
  missingReports: number;
  readiness: number | null;
  status: ReadinessStatus;
  withIssues: number;
  missingDates: string[];
}

interface ExportRecord {
  id: string;
  tanggal: string;
  kegiatan: string;
  hasil: string;
  kendala: string | null;

  user: {
    id: string;
    nama: string;
    nip: string;
  };
}

interface ExportData {
  period: {
    from: string;
    to: string;
    effectiveTo: string | null;
    today: string;
    workingDayCount: number;
  };

  summary: {
    totalStaff: number;
    expectedReports: number;
    submittedReports: number;
    missingReports: number;
    readiness: number | null;
    staffComplete: number;
    staffIncomplete: number;
    withIssues: number;
  };

  staff: ExportStaff[];
  records: ExportRecord[];
}

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

const COLORS = {
  indigo: "FF4F46E5",
  indigoDark: "FF3730A3",
  indigoSoft: "FFEEF2FF",

  emerald: "FF047857",
  emeraldSoft: "FFD1FAE5",

  amber: "FFB45309",
  amberSoft: "FFFEF3C7",

  red: "FFB91C1C",
  redSoft: "FFFEE2E2",

  orange: "FFC2410C",
  orangeSoft: "FFFFF7ED",

  gray900: "FF111827",
  gray700: "FF374151",
  gray600: "FF4B5563",
  gray500: "FF6B7280",
  gray400: "FF9CA3AF",
  gray300: "FFD1D5DB",
  gray200: "FFE5E7EB",
  gray100: "FFF3F4F6",
  gray50: "FFF9FAFB",

  white: "FFFFFFFF",
};

function formatTanggal(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatTanggalPendek(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function hasIssue(value: string | null) {
  const normalized = (value ?? "").trim();

  return normalized.length > 0 && normalized !== "-";
}

function statusLabel(status: ReadinessStatus) {
  switch (status) {
    case "LENGKAP":
      return "Lengkap";

    case "PERLU_DILENGKAPI":
      return "Perlu Dilengkapi";

    case "BELUM_LENGKAP":
      return "Belum Lengkap";

    default:
      return "Belum Ada Hari Kerja";
  }
}

function summaryStatus(readiness: number | null) {
  if (readiness === null) {
    return {
      label: "Belum Ada Hari Kerja",
      fill: COLORS.gray100,
      color: COLORS.gray600,
    };
  }

  if (readiness >= 90) {
    return {
      label: "Lengkap",
      fill: COLORS.emeraldSoft,
      color: COLORS.emerald,
    };
  }

  if (readiness >= 70) {
    return {
      label: "Perlu Dilengkapi",
      fill: COLORS.amberSoft,
      color: COLORS.amber,
    };
  }

  return {
    label: "Belum Lengkap",
    fill: COLORS.redSoft,
    color: COLORS.red,
  };
}

function monthName(month: number) {
  return [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ][month - 1];
}

function buildFilename(
  mode: string,
  from: string,
  to: string,
  selectedStaffName?: string | null,
) {
  const staffSuffix = selectedStaffName
    ? `_${selectedStaffName
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")}`
    : "";

  if (mode === "daily" && from === to) {
    return `Catatan_Harian_Staff_${from}${staffSuffix}.xlsx`;
  }

  if (mode === "monthly" && from.slice(0, 7) === to.slice(0, 7)) {
    const [year, month] = from.split("-").map(Number);

    return `Catatan_Staff_${monthName(month)}_${year}${staffSuffix}.xlsx`;
  }

  return `Catatan_Staff_${from}_sampai_${to}${staffSuffix}.xlsx`;
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: {
      style: "thin",
      color: { argb: COLORS.gray200 },
    },
    left: {
      style: "thin",
      color: { argb: COLORS.gray200 },
    },
    bottom: {
      style: "thin",
      color: { argb: COLORS.gray200 },
    },
    right: {
      style: "thin",
      color: { argb: COLORS.gray200 },
    },
  };
}

function applyHeaderStyle(row: ExcelJS.Row, endColumn: number) {
  row.height = 27;

  for (let column = 1; column <= endColumn; column += 1) {
    const cell = row.getCell(column);

    cell.font = {
      bold: true,
      color: { argb: COLORS.white },
      size: 10,
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.indigo },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = thinBorder();
  }
}

function applyBodyStyle(row: ExcelJS.Row, endColumn: number, zebra = false) {
  for (let column = 1; column <= endColumn; column += 1) {
    const cell = row.getCell(column);

    cell.font = {
      size: 10.5,
      color: { argb: COLORS.gray900 },
    };

    cell.alignment = {
      vertical: "top",
      wrapText: true,
    };

    cell.border = thinBorder();

    if (zebra) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.gray50 },
      };
    }
  }
}

function applyStatusStyle(cell: ExcelJS.Cell, status: ReadinessStatus) {
  if (status === "LENGKAP") {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.emeraldSoft },
    };

    cell.font = {
      bold: true,
      size: 10,
      color: { argb: COLORS.emerald },
    };

    return;
  }

  if (status === "PERLU_DILENGKAPI") {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.amberSoft },
    };

    cell.font = {
      bold: true,
      size: 10,
      color: { argb: COLORS.amber },
    };

    return;
  }

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.redSoft },
  };

  cell.font = {
    bold: true,
    size: 10,
    color: { argb: COLORS.red },
  };
}

function setupTitle(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  endColumn: string,
) {
  sheet.mergeCells(`A1:${endColumn}1`);
  sheet.mergeCells(`A2:${endColumn}2`);

  const titleCell = sheet.getCell("A1");

  titleCell.value = title;

  titleCell.font = {
    bold: true,
    size: 17,
    color: { argb: COLORS.white },
  };

  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.indigo },
  };

  titleCell.alignment = {
    horizontal: "left",
    vertical: "middle",
  };

  sheet.getRow(1).height = 32;

  const subtitleCell = sheet.getCell("A2");

  subtitleCell.value = subtitle;

  subtitleCell.font = {
    italic: true,
    size: 10,
    color: { argb: COLORS.gray600 },
  };

  subtitleCell.alignment = {
    vertical: "middle",
  };

  sheet.getRow(2).height = 22;
}

function setupPrint(sheet: ExcelJS.Worksheet, printTitlesRow?: string) {
  sheet.pageSetup.orientation = "landscape";
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  sheet.pageSetup.horizontalCentered = true;

  sheet.pageSetup.margins = {
    left: 0.35,
    right: 0.35,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.25,
  };

  if (printTitlesRow) {
    sheet.pageSetup.printTitlesRow = printTitlesRow;
  }

  sheet.headerFooter.oddFooter =
    "&LEduPresence — SMP POMOSDA&C&F&RHalaman &P dari &N";
}

function makeMetricCard(
  sheet: ExcelJS.Worksheet,
  labelRange: string,
  valueRange: string,
  label: string,
  value: string | number,
  fill: string,
  accent: string,
) {
  sheet.mergeCells(labelRange);
  sheet.mergeCells(valueRange);

  const labelCell = sheet.getCell(labelRange.split(":")[0]);

  const valueCell = sheet.getCell(valueRange.split(":")[0]);

  labelCell.value = label;

  labelCell.font = {
    bold: true,
    size: 9,
    color: { argb: accent },
  };

  labelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };

  labelCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  valueCell.value = value;

  valueCell.font = {
    bold: true,
    size: 22,
    color: { argb: accent },
  };

  valueCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };

  valueCell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
}

function estimateTextRowHeight(values: string[]) {
  let estimatedLines = 1;

  for (const value of values) {
    const lines = value
      .split(/\r?\n/)
      .reduce(
        (total, line) => total + Math.max(1, Math.ceil(line.length / 48)),
        0,
      );

    estimatedLines = Math.max(estimatedLines, lines);
  }

  return Math.min(120, Math.max(24, estimatedLines * 15));
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUserWithRoles;

    const roles = new Set(
      [user.role, ...(Array.isArray(user.roles) ? user.roles : [])].filter(
        (role): role is string => typeof role === "string" && role.length > 0,
      ),
    );

    if (!roles.has("ADMIN") && !roles.has("PIMPINAN")) {
      return NextResponse.json(
        {
          error: "Anda tidak memiliki akses export laporan staff",
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    const mode = typeof body?.mode === "string" ? body.mode : "custom";

    const selectedStaffName =
      typeof body?.selectedStaffName === "string" &&
      body.selectedStaffName.trim()
        ? body.selectedStaffName.trim()
        : null;

    const data = body?.data as ExportData | undefined;

    if (
      !data?.period ||
      !data?.summary ||
      !Array.isArray(data.staff) ||
      !Array.isArray(data.records)
    ) {
      return NextResponse.json(
        {
          error: "Data laporan tidak valid",
        },
        { status: 400 },
      );
    }

    if (data.staff.length > 1000 || data.records.length > 5000) {
      return NextResponse.json(
        {
          error: "Data laporan terlalu besar",
        },
        { status: 400 },
      );
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "EduPresence";
    workbook.company = "SMP POMOSDA";
    workbook.subject = "Laporan Catatan Harian Staff";
    workbook.title = "Laporan Catatan Harian Staff";
    workbook.created = new Date();

    const periodLabel =
      data.period.from === data.period.to
        ? formatTanggal(data.period.from)
        : `${formatTanggal(
            data.period.from,
          )} – ${formatTanggal(data.period.to)}`;

    const sortedStaff = [...data.staff].sort((a, b) => {
      const readinessA = a.readiness ?? 101;
      const readinessB = b.readiness ?? 101;

      if (readinessA !== readinessB) {
        return readinessA - readinessB;
      }

      return a.nama.localeCompare(b.nama, "id");
    });

    const sortedRecords = [...data.records].sort((a, b) => {
      const dateCompare = b.tanggal.localeCompare(a.tanggal);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.user.nama.localeCompare(b.user.nama, "id");
    });

    const globalStatus = summaryStatus(data.summary.readiness);

    // ======================================================
    // SHEET 1 — RINGKASAN PIMPINAN
    // ======================================================

    const summarySheet = workbook.addWorksheet("Ringkasan");

    summarySheet.properties.defaultRowHeight = 20;

    summarySheet.getColumn("A").width = 6;
    summarySheet.getColumn("B").width = 38;
    summarySheet.getColumn("C").width = 18;
    summarySheet.getColumn("D").width = 18;
    summarySheet.getColumn("E").width = 16;
    summarySheet.getColumn("F").width = 24;
    summarySheet.getColumn("G").width = 14;
    summarySheet.getColumn("H").width = 14;

    setupTitle(
      summarySheet,
      "LAPORAN CATATAN HARIAN STAFF",
      `SMP POMOSDA • Periode ${periodLabel}${
        selectedStaffName ? ` • Staff: ${selectedStaffName}` : ""
      }`,
      "H",
    );

    summarySheet.mergeCells("A3:H3");

    const executiveCell = summarySheet.getCell("A3");

    executiveCell.value =
      `Dari ${data.summary.totalStaff} staff, ` +
      `${data.summary.staffComplete} sudah lengkap dan ` +
      `${data.summary.staffIncomplete} masih perlu melengkapi laporan. ` +
      `${data.summary.withIssues} kendala tercatat.`;

    executiveCell.font = {
      bold: true,
      size: 11,
      color: { argb: COLORS.gray700 },
    };

    executiveCell.alignment = {
      vertical: "middle",
      wrapText: true,
    };

    summarySheet.getRow(3).height = 27;

    makeMetricCard(
      summarySheet,
      "A5:B5",
      "A6:B7",
      "TOTAL STAFF",
      data.summary.totalStaff,
      COLORS.indigoSoft,
      COLORS.indigoDark,
    );

    makeMetricCard(
      summarySheet,
      "C5:D5",
      "C6:D7",
      "SUDAH LENGKAP",
      data.summary.staffComplete,
      COLORS.emeraldSoft,
      COLORS.emerald,
    );

    makeMetricCard(
      summarySheet,
      "E5:F5",
      "E6:F7",
      "PERLU DILENGKAPI",
      data.summary.staffIncomplete,
      COLORS.amberSoft,
      COLORS.amber,
    );

    makeMetricCard(
      summarySheet,
      "G5:H5",
      "G6:H7",
      "ADA KENDALA",
      data.summary.withIssues,
      COLORS.redSoft,
      COLORS.red,
    );

    summarySheet.mergeCells("A9:B11");

    const readinessCell = summarySheet.getCell("A9");

    if (data.summary.readiness === null) {
      readinessCell.value = "—";
    } else {
      readinessCell.value = data.summary.readiness / 100;

      readinessCell.numFmt = "0.00%";
    }

    readinessCell.font = {
      bold: true,
      size: 24,
      color: { argb: COLORS.indigoDark },
    };

    readinessCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.indigoSoft },
    };

    readinessCell.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    summarySheet.mergeCells("C9:H9");
    summarySheet.mergeCells("C10:H10");
    summarySheet.mergeCells("C11:H11");

    const completenessTitle = summarySheet.getCell("C9");

    completenessTitle.value = "KELENGKAPAN LAPORAN";

    completenessTitle.font = {
      bold: true,
      size: 10,
      color: { argb: COLORS.gray600 },
    };

    const completenessDetail = summarySheet.getCell("C10");

    completenessDetail.value =
      `${data.summary.submittedReports} dari ` +
      `${data.summary.expectedReports} laporan telah masuk • ` +
      `${data.summary.missingReports} laporan belum diisi • ` +
      `${data.period.workingDayCount} hari kerja efektif`;

    completenessDetail.font = {
      size: 11,
      color: { argb: COLORS.gray700 },
    };

    const completenessStatus = summarySheet.getCell("C11");

    completenessStatus.value = globalStatus.label;

    completenessStatus.font = {
      bold: true,
      size: 11,
      color: { argb: globalStatus.color },
    };

    completenessStatus.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: globalStatus.fill },
    };

    completenessStatus.alignment = {
      vertical: "middle",
      horizontal: "left",
    };

    summarySheet.getRow(9).height = 22;
    summarySheet.getRow(10).height = 25;
    summarySheet.getRow(11).height = 23;

    const summaryHeaderRow = 14;

    summarySheet.getRow(summaryHeaderRow).values = [
      "No",
      "Nama Staff",
      "Laporan",
      "Kelengkapan",
      "Kendala",
      "Status",
    ];

    applyHeaderStyle(summarySheet.getRow(summaryHeaderRow), 6);

    sortedStaff.forEach((staff, index) => {
      const row = summarySheet.addRow([
        index + 1,
        staff.nama,
        `${staff.submittedReports} / ${staff.expectedReports}`,
        staff.readiness === null ? "-" : staff.readiness / 100,
        staff.withIssues || "-",
        statusLabel(staff.status),
      ]);

      row.height = 24;

      applyBodyStyle(row, 6, index % 2 === 1);

      row.getCell(1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      row.getCell(3).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      row.getCell(4).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      row.getCell(5).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      if (staff.readiness !== null) {
        row.getCell(4).numFmt = "0.00%";
      }

      applyStatusStyle(row.getCell(6), staff.status);
    });

    summarySheet.autoFilter = `A${summaryHeaderRow}:F${summaryHeaderRow}`;

    summarySheet.views = [
      {
        state: "frozen",
        ySplit: summaryHeaderRow,
        showGridLines: false,
        zoomScale: 90,
      },
    ];

    setupPrint(summarySheet, `${summaryHeaderRow}:${summaryHeaderRow}`);

    summarySheet.pageSetup.printArea = `A1:F${summarySheet.rowCount}`;

    // ======================================================
    // SHEET 2 — DETAIL CATATAN
    // ======================================================

    const detailSheet = workbook.addWorksheet("Detail Catatan");

    detailSheet.properties.defaultRowHeight = 20;

    detailSheet.getColumn("A").width = 7;
    detailSheet.getColumn("B").width = 20;
    detailSheet.getColumn("C").width = 32;
    detailSheet.getColumn("D").width = 50;
    detailSheet.getColumn("E").width = 43;
    detailSheet.getColumn("F").width = 46;

    setupTitle(
      detailSheet,
      "DETAIL CATATAN HARIAN STAFF",
      `SMP POMOSDA • Periode ${periodLabel}`,
      "F",
    );

    detailSheet.mergeCells("A3:F3");

    detailSheet.getCell("A3").value =
      `${sortedRecords.length} catatan pada periode yang dipilih`;

    detailSheet.getCell("A3").font = {
      size: 10,
      color: { argb: COLORS.gray500 },
    };

    const detailHeaderRow = 5;

    detailSheet.getRow(detailHeaderRow).values = [
      "No",
      "Tanggal",
      "Nama Staff",
      "Kegiatan",
      "Hasil",
      "Kendala",
    ];

    applyHeaderStyle(detailSheet.getRow(detailHeaderRow), 6);

    sortedRecords.forEach((record, index) => {
      const kendala = hasIssue(record.kendala)
        ? (record.kendala ?? "")
        : "Tidak ada kendala";

      const row = detailSheet.addRow([
        index + 1,
        formatTanggalPendek(record.tanggal),
        record.user.nama,
        record.kegiatan,
        record.hasil,
        kendala,
      ]);

      applyBodyStyle(row, 6, index % 2 === 1);

      row.height = estimateTextRowHeight([
        record.kegiatan,
        record.hasil,
        kendala,
      ]);

      row.getCell(1).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      if (hasIssue(record.kendala)) {
        row.getCell(6).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: COLORS.orangeSoft,
          },
        };

        row.getCell(6).font = {
          size: 10.5,
          color: {
            argb: COLORS.orange,
          },
        };
      } else {
        row.getCell(6).font = {
          size: 10,
          italic: true,
          color: {
            argb: COLORS.gray500,
          },
        };
      }
    });

    detailSheet.autoFilter = `A${detailHeaderRow}:F${detailHeaderRow}`;

    detailSheet.views = [
      {
        state: "frozen",
        ySplit: detailHeaderRow,
        showGridLines: false,
        zoomScale: 85,
      },
    ];

    setupPrint(detailSheet, `${detailHeaderRow}:${detailHeaderRow}`);

    detailSheet.pageSetup.printArea = `A1:F${detailSheet.rowCount}`;

    // ======================================================
    // SHEET 3 — PERLU PERHATIAN
    // ======================================================

    const attentionSheet = workbook.addWorksheet("Perlu Perhatian");

    attentionSheet.properties.defaultRowHeight = 20;

    attentionSheet.getColumn("A").width = 7;
    attentionSheet.getColumn("B").width = 30;
    attentionSheet.getColumn("C").width = 16;
    attentionSheet.getColumn("D").width = 18;
    attentionSheet.getColumn("E").width = 43;
    attentionSheet.getColumn("F").width = 26;

    setupTitle(
      attentionSheet,
      "PERLU PERHATIAN PIMPINAN",
      `SMP POMOSDA • Periode ${periodLabel}`,
      "F",
    );

    const incompleteStaff = sortedStaff.filter(
      (staff) =>
        staff.status === "PERLU_DILENGKAPI" || staff.status === "BELUM_LENGKAP",
    );

    const issueRecords = sortedRecords.filter((record) =>
      hasIssue(record.kendala),
    );

    attentionSheet.mergeCells("A3:F3");

    attentionSheet.getCell("A3").value =
      `${incompleteStaff.length} staff perlu melengkapi laporan • ` +
      `${issueRecords.length} kendala perlu ditinjau`;

    attentionSheet.getCell("A3").font = {
      bold: true,
      size: 10.5,
      color: { argb: COLORS.gray700 },
    };

    attentionSheet.mergeCells("A5:F5");

    const missingTitle = attentionSheet.getCell("A5");

    missingTitle.value = "STAFF YANG PERLU MELENGKAPI LAPORAN";

    missingTitle.font = {
      bold: true,
      size: 11,
      color: { argb: COLORS.red },
    };

    missingTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.redSoft },
    };

    attentionSheet.getRow(6).values = [
      "No",
      "Nama Staff",
      "Laporan",
      "Kelengkapan",
      "Tanggal Belum Diisi",
      "Status",
    ];

    applyHeaderStyle(attentionSheet.getRow(6), 6);

    incompleteStaff.forEach((staff, index) => {
      const row = attentionSheet.addRow([
        index + 1,
        staff.nama,
        `${staff.submittedReports} / ${staff.expectedReports}`,
        staff.readiness === null ? "-" : staff.readiness / 100,
        staff.missingDates.map(formatTanggalPendek).join(", "),
        statusLabel(staff.status),
      ]);

      applyBodyStyle(row, 6, index % 2 === 1);

      row.height = Math.max(
        24,
        estimateTextRowHeight([
          staff.missingDates.map(formatTanggalPendek).join(", "),
        ]),
      );

      row.getCell(1).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      row.getCell(3).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      row.getCell(4).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      if (staff.readiness !== null) {
        row.getCell(4).numFmt = "0.00%";
      }

      applyStatusStyle(row.getCell(6), staff.status);
    });

    const issueTitleRow = attentionSheet.rowCount + 3;

    attentionSheet.mergeCells(`A${issueTitleRow}:F${issueTitleRow}`);

    const issueTitle = attentionSheet.getCell(`A${issueTitleRow}`);

    issueTitle.value = "KENDALA YANG PERLU DITINJAU";

    issueTitle.font = {
      bold: true,
      size: 11,
      color: { argb: COLORS.amber },
    };

    issueTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.amberSoft },
    };

    const issueHeaderRow = issueTitleRow + 1;

    const issueHeader = attentionSheet.getRow(issueHeaderRow);

    issueHeader.getCell(1).value = "No";

    issueHeader.getCell(2).value = "Tanggal";

    issueHeader.getCell(3).value = "Nama Staff";

    issueHeader.getCell(4).value = "Kendala";

    issueHeader.getCell(6).value = "Tindak Lanjut";

    attentionSheet.mergeCells(`D${issueHeaderRow}:E${issueHeaderRow}`);

    applyHeaderStyle(issueHeader, 6);

    issueRecords.forEach((record, index) => {
      const row = attentionSheet.addRow([
        index + 1,
        formatTanggalPendek(record.tanggal),
        record.user.nama,
        record.kendala ?? "",
        "",
        "",
      ]);

      attentionSheet.mergeCells(`D${row.number}:E${row.number}`);

      applyBodyStyle(row, 6, index % 2 === 1);

      row.height = estimateTextRowHeight([record.kendala ?? ""]);

      row.getCell(1).alignment = {
        horizontal: "center",
        vertical: "top",
      };

      row.getCell(4).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: COLORS.orangeSoft,
        },
      };

      row.getCell(4).font = {
        size: 10.5,
        color: {
          argb: COLORS.orange,
        },
      };

      row.getCell(6).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFFFFBEB",
        },
      };

      row.getCell(6).alignment = {
        vertical: "top",
        wrapText: true,
      };
    });

    attentionSheet.views = [
      {
        state: "frozen",
        ySplit: 6,
        showGridLines: false,
        zoomScale: 85,
      },
    ];

    setupPrint(attentionSheet, "6:6");

    attentionSheet.pageSetup.printArea = `A1:F${attentionSheet.rowCount}`;

    // ======================================================
    // RESPONSE
    // ======================================================

    const filename = buildFilename(
      mode,
      data.period.from,
      data.period.to,
      selectedStaffName,
    );

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
    console.error("CATATAN_HARIAN_EXPORT_ERROR:", error);

    return NextResponse.json(
      {
        error: "Gagal membuat file Excel catatan harian",
      },
      { status: 500 },
    );
  }
}
