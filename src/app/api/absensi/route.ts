import { NextResponse } from "next/server";
import { Role, StatusAbsensi, TipeAbsensi } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nowJakarta, todayJakarta, timeJakarta } from "@/lib/time";
import { getJadwalEfektif } from "@/lib/jadwal-efektif";

function toMinutes(time: string) {
  const match = time.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error(`Format waktu tidak valid: ${time}`);
  }

  const jam = Number(match[1]);
  const menit = Number(match[2]);

  if (
    !Number.isInteger(jam) ||
    !Number.isInteger(menit) ||
    jam < 0 ||
    jam > 23 ||
    menit < 0 ||
    menit > 59
  ) {
    throw new Error(`Nilai waktu tidak valid: ${time}`);
  }

  return jam * 60 + menit;
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Data scan tidak valid" },
        { status: 400 },
      );
    }

    const { kodeQr } = body as {
      kodeQr?: string;
    };

    if (!kodeQr?.trim()) {
      return NextResponse.json(
        { error: "Kode QR wajib diisi" },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    const sessionRoles = new Set(
      [
        session.user.role,
        ...(Array.isArray(session.user.roles) ? session.user.roles : []),
      ].filter((role): role is string => typeof role === "string"),
    );

    const isGuru = sessionRoles.has(Role.GURU);

    const now = nowJakarta();
    const tanggal = todayJakarta();
    const jamSekarang = timeJakarta();
    const menitSekarang = toMinutes(jamSekarang);

    const [pengaturan, izinHariIni] = await Promise.all([
      prisma.pengaturan.findFirst({
        orderBy: {
          updatedAt: "desc",
        },
      }),

      prisma.izin.findFirst({
        where: {
          userId,
          status: "APPROVED",

          tanggalMulai: {
            lte: tanggal,
          },

          tanggalAkhir: {
            gte: tanggal,
          },
        },

        select: {
          id: true,
          jenisIzin: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    /*
     * Izin berlaku satu hari penuh.
     * Blokir semua jenis scan untuk mencegah status yang bertentangan.
     */
    if (izinHariIni) {
      const jenisIzin = izinHariIni.jenisIzin
        .toLowerCase()
        .replaceAll("_", " ");

      return NextResponse.json(
        {
          error: `Absensi tidak dapat dilakukan karena Anda tercatat ${jenisIzin} hari ini`,
        },
        { status: 409 },
      );
    }

    const jamBerangkatMulai = pengaturan?.jamBerangkatMulai ?? "07:00";

    const jamBerangkatHadirSelesai =
      pengaturan?.jamBerangkatHadirSelesai ?? "10:00";

    const jamBerangkatSelesai = pengaturan?.jamBerangkatSelesai ?? "12:00";

    const toleransiMengajarMenit = pengaturan?.toleransiMengajarMenit ?? 30;

    const jamPulangMulai = pengaturan?.jamPulangMulai ?? "12:00";

    const jamPulangSelesai = pengaturan?.jamPulangSelesai ?? "16:00";

    let tipe: TipeAbsensi;
    let ruanganId: string | null = null;
    let ruanganNama = "";

    if (kodeQr === "ABSEN_BERANGKAT") {
      tipe = TipeAbsensi.BERANGKAT;
      ruanganNama = "QR Absen Berangkat";
    } else if (kodeQr === "ABSEN_PULANG") {
      tipe = TipeAbsensi.PULANG;
      ruanganNama = "QR Absen Pulang";
    } else {
      tipe = TipeAbsensi.JAM_MENGAJAR;

      const ruangan = await prisma.ruangan.findFirst({
        where: {
          kodeQr,
          aktif: true,
        },

        select: {
          id: true,
          nama: true,
        },
      });

      if (!ruangan) {
        return NextResponse.json(
          { error: "QR Code tidak valid" },
          { status: 400 },
        );
      }

      ruanganId = ruangan.id;
      ruanganNama = ruangan.nama;
    }

    /*
     * BERANGKAT dan PULANG hanya boleh satu kali per hari.
     */
    if (tipe !== TipeAbsensi.JAM_MENGAJAR) {
      const sudahScan = await prisma.absensi.findFirst({
        where: {
          userId,
          tipe,
          tanggal,
        },

        select: {
          id: true,
          status: true,
        },
      });

      if (sudahScan) {
        return NextResponse.json(
          {
            error: `Anda sudah melakukan absensi ${tipe
              .toLowerCase()
              .replaceAll("_", " ")} hari ini`,
          },
          { status: 409 },
        );
      }
    }

    let status: StatusAbsensi = StatusAbsensi.HADIR;

    let jadwalId: string | null = null;

    let sumberJadwal: "INDUK" | "TUKAR" | null = null;

    let tukarJadwalId: string | null = null;
    let ditukarDengan: string | null = null;

    if (tipe === TipeAbsensi.BERANGKAT) {
      const menitMulai = toMinutes(jamBerangkatMulai);

      const menitBatasHadir = toMinutes(jamBerangkatHadirSelesai);

      const menitSelesai = toMinutes(jamBerangkatSelesai);

      if (menitSekarang < menitMulai) {
        return NextResponse.json(
          {
            error: `Absensi berangkat dimulai pukul ${jamBerangkatMulai}`,
          },
          { status: 400 },
        );
      }

      if (menitSekarang > menitSelesai) {
        return NextResponse.json(
          {
            error: `Absensi berangkat sudah ditutup pukul ${jamBerangkatSelesai}`,
          },
          { status: 400 },
        );
      }

      status =
        menitSekarang > menitBatasHadir
          ? StatusAbsensi.TERLAMBAT
          : StatusAbsensi.HADIR;
    }

    if (tipe === TipeAbsensi.PULANG) {
      const menitMulaiPulang = toMinutes(jamPulangMulai);

      const menitSelesaiPulang = toMinutes(jamPulangSelesai);

      if (menitSekarang < menitMulaiPulang) {
        return NextResponse.json(
          {
            error: `Belum waktunya absen pulang. Mulai pukul ${jamPulangMulai}`,
          },
          { status: 400 },
        );
      }

      if (menitSekarang > menitSelesaiPulang) {
        return NextResponse.json(
          {
            error: `Absensi pulang sudah ditutup pukul ${jamPulangSelesai}`,
          },
          { status: 400 },
        );
      }

      status = StatusAbsensi.HADIR;
    }

    if (tipe === TipeAbsensi.JAM_MENGAJAR) {
      if (!isGuru) {
        return NextResponse.json(
          {
            error: "Hanya guru yang dapat absen jam mengajar",
          },
          { status: 403 },
        );
      }

      /*
       * Gunakan jadwal efektif, bukan jadwal induk.
       *
       * Jadwal yang dipindahkan keluar tidak akan muncul.
       * Jadwal hasil tukar muncul dengan tanggal dan jam barunya.
       */
      const jadwalHariIni = await getJadwalEfektif({
        tanggal,
        userId,
      });

      if (jadwalHariIni.length === 0) {
        return NextResponse.json(
          {
            error: "Tidak ada jadwal mengajar efektif hari ini",
          },
          { status: 400 },
        );
      }

      const jadwal = jadwalHariIni.find(
        (item) =>
          item.ruangan.id === ruanganId &&
          menitSekarang >= toMinutes(item.jamMulai) &&
          menitSekarang <= toMinutes(item.jamSelesai),
      );

      if (!jadwal) {
        return NextResponse.json(
          {
            error:
              "Tidak ada jadwal mengajar aktif di ruangan ini pada jam sekarang",
          },
          { status: 400 },
        );
      }

      jadwalId = jadwal.jadwalId;
      sumberJadwal = jadwal.sumber;

      if (jadwal.tukar) {
        tukarJadwalId = jadwal.tukar.id;
        ditukarDengan = jadwal.tukar.ditukarDengan.nama;
      }

      const sudahScanJadwal = await prisma.absensi.findFirst({
        where: {
          userId,
          tipe: TipeAbsensi.JAM_MENGAJAR,
          jadwalId,
          tanggal,
        },

        select: {
          id: true,
          status: true,
        },
      });

      if (sudahScanJadwal) {
        return NextResponse.json(
          {
            error: "Anda sudah scan untuk jadwal mengajar ini",
          },
          { status: 409 },
        );
      }

      const selisihMenit = menitSekarang - toMinutes(jadwal.jamMulai);

      status =
        selisihMenit > toleransiMengajarMenit
          ? StatusAbsensi.TERLAMBAT
          : StatusAbsensi.HADIR;
    }

    const absensi = await prisma.absensi.create({
      data: {
        userId,
        ruanganId,
        jadwalId,
        tipe,
        status,

        waktuScan: now,
        tanggal,

        sumber: "QR",
        dicatatOlehId: null,
      },
    });

    return NextResponse.json({
      success: true,
      id: absensi.id,

      tipe,
      status,
      waktu: jamSekarang,
      ruangan: ruanganNama,

      sumberJadwal,
      tukarJadwalId,
      ditukarDengan,
    });
  } catch (error) {
    console.error("ABSENSI_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
