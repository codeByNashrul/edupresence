-- BERANGKAT / PULANG hanya boleh satu record per user, tanggal, dan tipe.
CREATE UNIQUE INDEX "absensi_unique_kehadiran_per_hari"
ON "absensi" ("userId", "tanggal", "tipe")
WHERE "tipe" IN (
  'BERANGKAT'::"TipeAbsensi",
  'PULANG'::"TipeAbsensi"
);

-- JAM_MENGAJAR hanya boleh satu record untuk jadwal yang sama pada tanggal yang sama.
-- Guru tetap dapat memiliki banyak jam mengajar dalam satu hari selama jadwalId berbeda.
CREATE UNIQUE INDEX "absensi_unique_jam_mengajar_per_jadwal"
ON "absensi" ("userId", "tanggal", "jadwalId")
WHERE
  "tipe" = 'JAM_MENGAJAR'::"TipeAbsensi"
  AND "jadwalId" IS NOT NULL;
