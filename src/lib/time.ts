const TIME_ZONE_JAKARTA = "Asia/Jakarta";

type HariJakarta =
  | "SENIN"
  | "SELASA"
  | "RABU"
  | "KAMIS"
  | "JUMAT"
  | "SABTU"
  | "MINGGU";

function getJakartaDateParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE_JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

/**
 * Date menyimpan waktu sebagai instant UTC.
 * Zona waktu diterapkan saat waktu diformat atau dibaca.
 */
export function nowJakarta() {
  return new Date();
}

/**
 * Menghasilkan tanggal hari ini di Jakarta yang dinormalisasi
 * ke pukul 00:00 UTC agar konsisten di local dan production.
 */
export function todayJakarta() {
  const { year, month, day } = getJakartaDateParts();

  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0),
  );
}

/**
 * Selalu menghasilkan format HH:mm, misalnya:
 * 07:05
 * 11:00
 * 23:59
 */
export function timeJakarta() {
  const { hour, minute } = getJakartaDateParts();

  return `${hour}:${minute}`;
}

export function dayJakarta(): HariJakarta {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE_JAKARTA,
    weekday: "short",
  }).format(new Date());

  const hariMap: Record<string, HariJakarta> = {
    Mon: "SENIN",
    Tue: "SELASA",
    Wed: "RABU",
    Thu: "KAMIS",
    Fri: "JUMAT",
    Sat: "SABTU",
    Sun: "MINGGU",
  };

  return hariMap[weekday] ?? "MINGGU";
}
