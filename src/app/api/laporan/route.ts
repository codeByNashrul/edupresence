import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function parseTanggalJakarta(tanggalStr: string) {
  const [year, month, day] = tanggalStr.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getTanggalKey(tanggal: Date) {
  return tanggal.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Jakarta",
  });
}

function getDaftarTanggal(mulai: Date, selesai: Date) {
  const hasil: Date[] = [];
  const current = new Date(mulai);

  current.setHours(0, 0, 0, 0);

  const batas = new Date(selesai);
  batas.setHours(0, 0, 0, 0);

  while (current <= batas) {
    hasil.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return hasil;
}

function getHariEnum(tanggal: Date) {
  const hariMap: Record<number, string | null> = {
    0: null,
    1: "SENIN",
    2: "SELASA",
    3: "RABU",
    4: "KAMIS",
    5: "JUMAT",
    6: "SABTU",
  };

  return hariMap[tanggal.getDay()];
}

function getStatusDariIzin(jenisIzin: string) {
  return jenisIzin === "SAKIT" ? "SAKIT" : "IZIN";
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "PIMPINAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const tipe = searchParams.get("tipe") ?? "kehadiran";
    const periode = searchParams.get("periode") ?? "bulanan";

    const tipeValid = ["kehadiran", "mengajar", "kepulangan"];
    const periodeValid = ["harian", "mingguan", "bulanan"];

    if (!tipeValid.includes(tipe)) {
      return NextResponse.json(
        { error: "Jenis laporan tidak valid" },
        { status: 400 },
      );
    }

    if (!periodeValid.includes(periode)) {
      return NextResponse.json(
        { error: "Periode laporan tidak valid" },
        { status: 400 },
      );
    }

    const tanggalStr =
      searchParams.get("tanggal") ??
      new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Jakarta",
      });

    const tanggal = parseTanggalJakarta(tanggalStr);

    let tanggalMulai: Date;
    let tanggalSelesai: Date;

    if (periode === "harian") {
      tanggalMulai = new Date(tanggal);
      tanggalMulai.setHours(0, 0, 0, 0);

      tanggalSelesai = new Date(tanggal);
      tanggalSelesai.setHours(23, 59, 59, 999);
    } else if (periode === "mingguan") {
      const day = tanggal.getDay();
      const diff = tanggal.getDate() - day + (day === 0 ? -6 : 1);

      tanggalMulai = new Date(tanggal);
      tanggalMulai.setDate(diff);
      tanggalMulai.setHours(0, 0, 0, 0);

      tanggalSelesai = new Date(tanggalMulai);

      // Senin sampai Sabtu
      tanggalSelesai.setDate(tanggalMulai.getDate() + 5);
      tanggalSelesai.setHours(23, 59, 59, 999);
    } else {
      tanggalMulai = new Date(tanggal.getFullYear(), tanggal.getMonth(), 1);

      tanggalMulai.setHours(0, 0, 0, 0);

      tanggalSelesai = new Date(
        tanggal.getFullYear(),
        tanggal.getMonth() + 1,
        0,
      );

      tanggalSelesai.setHours(23, 59, 59, 999);
    }

    /**
     * LAPORAN KEHADIRAN
     */
    if (tipe === "kehadiran") {
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: ["GURU", "STAFF"],
          },
          aktif: true,
        },
        select: {
          id: true,
          nama: true,
          nip: true,
          role: true,
        },
        orderBy: {
          nama: "asc",
        },
      });

      const [semuaAbsensi, semuaIzin] = await Promise.all([
        prisma.absensi.findMany({
          where: {
            tipe: "BERANGKAT",
            tanggal: {
              gte: tanggalMulai,
              lte: tanggalSelesai,
            },
            user: {
              role: {
                in: ["GURU", "STAFF"],
              },
              aktif: true,
            },
          },
          select: {
            userId: true,
            status: true,
            tanggal: true,
          },
        }),

        prisma.izin.findMany({
          where: {
            status: "APPROVED",
            tanggalMulai: {
              lte: tanggalSelesai,
            },
            tanggalAkhir: {
              gte: tanggalMulai,
            },
            user: {
              role: {
                in: ["GURU", "STAFF"],
              },
              aktif: true,
            },
          },
          select: {
            userId: true,
            jenisIzin: true,
            tanggalMulai: true,
            tanggalAkhir: true,
          },
        }),
      ]);

      const rekapAbsensi = new Map<
        string,
        {
          hadir: number;
          terlambat: number;
          izin: number;
          sakit: number;
          alpha: number;
          total: number;
        }
      >();

      const absensiAktualKeys = new Set(
        semuaAbsensi.map(
          (absensi) => `${absensi.userId}-${getTanggalKey(absensi.tanggal)}`,
        ),
      );

      for (const absensi of semuaAbsensi) {
        const rekap = rekapAbsensi.get(absensi.userId) ?? {
          hadir: 0,
          terlambat: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total: 0,
        };

        if (absensi.status === "HADIR") {
          rekap.hadir++;
        }

        if (absensi.status === "TERLAMBAT") {
          rekap.terlambat++;
        }

        if (absensi.status === "IZIN") {
          rekap.izin++;
        }

        if (absensi.status === "SAKIT") {
          rekap.sakit++;
        }

        if (absensi.status === "ALPHA") {
          rekap.alpha++;
        }

        rekap.total++;

        rekapAbsensi.set(absensi.userId, rekap);
      }

      for (const izin of semuaIzin) {
        const mulai =
          izin.tanggalMulai > tanggalMulai ? izin.tanggalMulai : tanggalMulai;

        const selesai =
          izin.tanggalAkhir < tanggalSelesai
            ? izin.tanggalAkhir
            : tanggalSelesai;

        for (const tanggalIzin of getDaftarTanggal(mulai, selesai)) {
          // Minggu tidak dihitung sebagai hari kehadiran
          if (tanggalIzin.getDay() === 0) {
            continue;
          }

          const key = `${izin.userId}-${getTanggalKey(tanggalIzin)}`;

          // Absensi aktual lebih diprioritaskan
          if (absensiAktualKeys.has(key)) {
            continue;
          }

          const rekap = rekapAbsensi.get(izin.userId) ?? {
            hadir: 0,
            terlambat: 0,
            izin: 0,
            sakit: 0,
            alpha: 0,
            total: 0,
          };

          const statusIzin = getStatusDariIzin(izin.jenisIzin);

          if (statusIzin === "SAKIT") {
            rekap.sakit++;
          } else {
            rekap.izin++;
          }

          rekap.total++;

          rekapAbsensi.set(izin.userId, rekap);
        }
      }

      const laporan = users.map((user) => {
        const rekap = rekapAbsensi.get(user.id) ?? {
          hadir: 0,
          terlambat: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total: 0,
        };

        const totalHadir = rekap.hadir + rekap.terlambat;

        return {
          nama: user.nama,
          nip: user.nip,
          role: user.role,

          hadir: rekap.hadir,
          terlambat: rekap.terlambat,
          izin: rekap.izin,
          sakit: rekap.sakit,
          alpha: rekap.alpha,

          total: rekap.total,

          persentase:
            rekap.total > 0 ? Math.round((totalHadir / rekap.total) * 100) : 0,
        };
      });

      return NextResponse.json({
        tipe,
        periode,
        tanggalMulai,
        tanggalSelesai,
        laporan,
      });
    }

    /**
     * LAPORAN MENGAJAR
     */
    if (tipe === "mengajar") {
      const guru = await prisma.guru.findMany({
        where: {
          user: {
            aktif: true,
          },
        },
        include: {
          user: true,
          jadwal: {
            where: {
              aktif: true,
            },
            select: {
              id: true,
              hari: true,
            },
          },
        },
        orderBy: {
          user: {
            nama: "asc",
          },
        },
      });

      const [semuaAbsensi, semuaIzin] = await Promise.all([
        prisma.absensi.findMany({
          where: {
            tipe: "JAM_MENGAJAR",
            tanggal: {
              gte: tanggalMulai,
              lte: tanggalSelesai,
            },
          },
          select: {
            userId: true,
            jadwalId: true,
            status: true,
            tanggal: true,
          },
        }),

        prisma.izin.findMany({
          where: {
            status: "APPROVED",
            tanggalMulai: {
              lte: tanggalSelesai,
            },
            tanggalAkhir: {
              gte: tanggalMulai,
            },
            user: {
              role: "GURU",
              aktif: true,
            },
          },
          select: {
            userId: true,
            jenisIzin: true,
            tanggalMulai: true,
            tanggalAkhir: true,
          },
        }),
      ]);

      const absensiJadwalAktualKeys = new Set(
        semuaAbsensi
          .filter((absensi) => absensi.jadwalId)
          .map(
            (absensi) =>
              `${absensi.userId}-${absensi.jadwalId}-${getTanggalKey(
                absensi.tanggal,
              )}`,
          ),
      );

      const guruByUserId = new Map(guru.map((g) => [g.userId, g]));

      const rekapAbsensi = new Map<
        string,
        {
          hadir: number;
          terlambat: number;
          izin: number;
          sakit: number;
          alpha: number;
          total: number;
        }
      >();

      for (const absensi of semuaAbsensi) {
        const rekap = rekapAbsensi.get(absensi.userId) ?? {
          hadir: 0,
          terlambat: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total: 0,
        };

        if (absensi.status === "HADIR") {
          rekap.hadir++;
        }

        if (absensi.status === "TERLAMBAT") {
          rekap.terlambat++;
        }

        if (absensi.status === "IZIN") {
          rekap.izin++;
        }

        if (absensi.status === "SAKIT") {
          rekap.sakit++;
        }

        if (absensi.status === "ALPHA") {
          rekap.alpha++;
        }

        rekap.total++;

        rekapAbsensi.set(absensi.userId, rekap);
      }

      for (const izin of semuaIzin) {
        const dataGuru = guruByUserId.get(izin.userId);

        if (!dataGuru) {
          continue;
        }

        const mulai =
          izin.tanggalMulai > tanggalMulai ? izin.tanggalMulai : tanggalMulai;

        const selesai =
          izin.tanggalAkhir < tanggalSelesai
            ? izin.tanggalAkhir
            : tanggalSelesai;

        for (const tanggalIzin of getDaftarTanggal(mulai, selesai)) {
          const hariIzin = getHariEnum(tanggalIzin);

          if (!hariIzin) {
            continue;
          }

          const jadwalPadaHariItu = dataGuru.jadwal.filter(
            (jadwal) => jadwal.hari === hariIzin,
          );

          for (const jadwal of jadwalPadaHariItu) {
            const key = `${izin.userId}-${jadwal.id}-${getTanggalKey(tanggalIzin)}`;

            // Scan atau input absensi aktual mengalahkan izin
            if (absensiJadwalAktualKeys.has(key)) {
              continue;
            }

            const rekap = rekapAbsensi.get(izin.userId) ?? {
              hadir: 0,
              terlambat: 0,
              izin: 0,
              sakit: 0,
              alpha: 0,
              total: 0,
            };

            const statusIzin = getStatusDariIzin(izin.jenisIzin);

            if (statusIzin === "SAKIT") {
              rekap.sakit++;
            } else {
              rekap.izin++;
            }

            rekap.total++;

            rekapAbsensi.set(izin.userId, rekap);
          }
        }
      }

      const laporan = guru.map((g) => {
        const rekap = rekapAbsensi.get(g.userId) ?? {
          hadir: 0,
          terlambat: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total: 0,
        };

        const totalKehadiran = rekap.hadir + rekap.terlambat;

        return {
          nama: g.user.nama,
          nip: g.user.nip,
          role: "GURU",

          hadir: rekap.hadir,
          terlambat: rekap.terlambat,
          izin: rekap.izin,
          sakit: rekap.sakit,
          alpha: rekap.alpha,

          total: rekap.total,

          persentase:
            rekap.total > 0
              ? Math.round((totalKehadiran / rekap.total) * 100)
              : 0,
        };
      });

      return NextResponse.json({
        tipe,
        periode,
        tanggalMulai,
        tanggalSelesai,
        laporan,
      });
    }

    /**
     * LAPORAN KEPULANGAN
     */
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["GURU", "STAFF"],
        },
        aktif: true,
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        role: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    const semuaAbsensi = await prisma.absensi.findMany({
      where: {
        tipe: {
          in: ["BERANGKAT", "PULANG"],
        },
        tanggal: {
          gte: tanggalMulai,
          lte: tanggalSelesai,
        },
        user: {
          role: {
            in: ["GURU", "STAFF"],
          },
          aktif: true,
        },
      },
      select: {
        userId: true,
        tipe: true,
        tanggal: true,
      },
      orderBy: {
        tanggal: "asc",
      },
    });

    const rekapKepulangan = new Map<
      string,
      {
        tanggalBerangkat: Set<string>;
        tanggalPulang: Set<string>;
      }
    >();

    for (const absensi of semuaAbsensi) {
      const rekap = rekapKepulangan.get(absensi.userId) ?? {
        tanggalBerangkat: new Set<string>(),
        tanggalPulang: new Set<string>(),
      };

      const tanggalKey = getTanggalKey(absensi.tanggal);

      if (absensi.tipe === "BERANGKAT") {
        rekap.tanggalBerangkat.add(tanggalKey);
      }

      if (absensi.tipe === "PULANG") {
        rekap.tanggalPulang.add(tanggalKey);
      }

      rekapKepulangan.set(absensi.userId, rekap);
    }

    const laporan = users.map((user) => {
      const rekap = rekapKepulangan.get(user.id) ?? {
        tanggalBerangkat: new Set<string>(),
        tanggalPulang: new Set<string>(),
      };

      const totalHariBerangkat = rekap.tanggalBerangkat.size;

      const sudahPulang = [...rekap.tanggalBerangkat].filter((tanggalKey) =>
        rekap.tanggalPulang.has(tanggalKey),
      ).length;

      const belumPulang = Math.max(totalHariBerangkat - sudahPulang, 0);

      return {
        nama: user.nama,
        nip: user.nip,
        role: user.role,

        // Mengikuti struktur frontend yang sudah ada:
        // hadir       = sudah scan pulang
        // terlambat   = sementara 0
        // tidakHadir  = belum scan pulang
        hadir: sudahPulang,
        terlambat: 0,
        tidakHadir: belumPulang,
        total: totalHariBerangkat,
        persentase:
          totalHariBerangkat > 0
            ? Math.round((sudahPulang / totalHariBerangkat) * 100)
            : 0,
      };
    });

    return NextResponse.json({
      tipe,
      periode,
      tanggalMulai,
      tanggalSelesai,
      laporan,
    });
  } catch (error) {
    console.error("LAPORAN_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
