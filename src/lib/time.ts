export function nowJakarta() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
}

export function todayJakarta() {
  const tanggal = nowJakarta();
  tanggal.setHours(0, 0, 0, 0);
  return tanggal;
}

export function timeJakarta() {
  const now = nowJakarta();

  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
}

export function dayJakarta() {
  const hariMap: Record<number, string> = {
    1: "SENIN",
    2: "SELASA",
    3: "RABU",
    4: "KAMIS",
    5: "JUMAT",
    6: "SABTU",
  };

  return hariMap[nowJakarta().getDay()];
}
