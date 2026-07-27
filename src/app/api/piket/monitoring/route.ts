import { NextResponse } from "next/server";
import { HariMinggu } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dayJakarta, timeJakarta, todayJakarta } from "@/lib/time";

function toMinutes(time: string) {
  const [jam, menit] = time.split(":").map(Number);

  if (Number.isNaN(jam) || Number.isNaN(menit)) {
    return 0;
  }

  return jam * 60 + menit;
}

function emptyMonitoring() {
  return {
    total: 0,
    hadir: 0,
    terkonfirmasi: 0,
    belum: 0,
    data: [],
    upcoming: [],
  };
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = new Set<string>(["ADMIN", "PIMPINAN", "PIKET"]);

    if (!allowedRoles.has(session.user.role)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses monitoring piket" },
        { status: 403 },
      );
    }

    const tanggal = todayJakarta();
    const hariSekarang = dayJakarta();
    const jamSekarang = timeJakarta();

    const hariValid = Object.values(HariMinggu).includes(
      hariSekarang as HariMinggu,
    );

    if (!hariValid) {
      return NextResponse.json(emptyMonitoring());
    }

    const semuaJadwal = await prisma.jadwal.findMany({
      where: {
        hari: hariSekarang as HariMinggu,
        aktif: true,
        guru: {
          user: {
            aktif: true,
          },
        },
      },
      include: {
        guru: {
          include: {
            user: true,
          },
        },
        mataPelajaran: true,
        kelas: true,
        ruangan: true,
      },
      orderBy: {
        jamMulai: "asc",
      },
    });

    const sekarangMenit = toMinutes(jamSekarang);

    /*
     * Jadwal aktif ditampilkan mulai 15 menit sebelum
     * jam pelajaran sampai jam pelajaran selesai.
     */
    const jadwalAktif = semuaJadwal.filter((jadwal) => {
      const mulaiMonitoring = toMinutes(jadwal.jamMulai) - 15;

      const selesai = toMinutes(jadwal.jamSelesai);

      return sekarangMenit >= mulaiMonitoring && sekarangMenit <= selesai;
    });

    const jadwalAktifIds = new Set(jadwalAktif.map((jadwal) => jadwal.id));

    /*
     * Maksimal lima jadwal berikutnya.
     * Jadwal yang sudah masuk window monitoring tidak
     * ditampilkan lagi di bagian berikutnya.
     */
    const jadwalBerikutnya = semuaJadwal
      .filter((jadwal) => {
        const mulai = toMinutes(jadwal.jamMulai);

        return mulai > sekarangMenit && !jadwalAktifIds.has(jadwal.id);
      })
      .slice(0, 5);

    const seluruhJadwalIds = [
      ...new Set(
        [...jadwalAktif, ...jadwalBerikutnya].map((jadwal) => jadwal.id),
      ),
    ];

    const absensi = seluruhJadwalIds.length
      ? await prisma.absensi.findMany({
          where: {
            tanggal,
            tipe: "JAM_MENGAJAR",
            jadwalId: {
              in: seluruhJadwalIds,
            },
          },
          orderBy: {
            waktuScan: "desc",
          },
        })
      : [];

    /*
     * Menyimpan absensi terbaru untuk setiap jadwal.
     */
    const absensiPerJadwal = new Map<string, (typeof absensi)[number]>();

    for (const item of absensi) {
      if (item.jadwalId && !absensiPerJadwal.has(item.jadwalId)) {
        absensiPerJadwal.set(item.jadwalId, item);
      }
    }

    function createMonitoringItem(jadwal: (typeof semuaJadwal)[number]) {
      const absensiHariIni = absensiPerJadwal.get(jadwal.id);

      return {
        jadwalId: jadwal.id,
        guru: jadwal.guru.user.nama,
        noWa: jadwal.guru.user.noWa,
        mapel: jadwal.mataPelajaran.nama,
        kelas: jadwal.kelas.nama,
        jam: `${jadwal.jamMulai} - ${jadwal.jamSelesai}`,
        ruangan: jadwal.ruangan.nama,
        status: absensiHariIni?.status ?? "BELUM",
        waktuScan: absensiHariIni?.waktuScan ?? null,
      };
    }

    const data = jadwalAktif.map(createMonitoringItem);

    const upcoming = jadwalBerikutnya.map(createMonitoringItem);

    const hadir = data.filter(
      (item) => item.status === "HADIR" || item.status === "TERLAMBAT",
    ).length;

    const terkonfirmasi = data.filter((item) => item.status !== "BELUM").length;

    const belum = data.filter((item) => item.status === "BELUM").length;

    return NextResponse.json({
      total: data.length,
      hadir,
      terkonfirmasi,
      belum,
      data,
      upcoming,
    });
  } catch (error) {
    console.error("PIKET_MONITORING_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
