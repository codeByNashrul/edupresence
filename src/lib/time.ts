export function nowJakarta() {
  return new Date();
}

export function todayJakarta() {
  const now = new Date();

  const tanggal = new Date(
    now.toLocaleDateString("sv-SE", {
      timeZone: "Asia/Jakarta",
    }),
  );

  tanggal.setHours(0, 0, 0, 0);
  return tanggal;
}

export function timeJakarta() {
  const now = new Date();

  return now.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function dayJakarta() {
  const now = new Date();

  const day = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
    })
      .formatToParts(now)
      .find((part) => part.type === "weekday")?.value,
  );

  const hariMap: Record<string, string> = {
    Mon: "SENIN",
    Tue: "SELASA",
    Wed: "RABU",
    Thu: "KAMIS",
    Fri: "JUMAT",
    Sat: "SABTU",
  };

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(now);

  return hariMap[weekday];
}
