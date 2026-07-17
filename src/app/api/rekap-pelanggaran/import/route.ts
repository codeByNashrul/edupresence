// src/app/api/rekap-pelanggaran/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rows, mingguKe, tahunAjaran, semester, tanggalMulai, tanggalAkhir } = body;

    if (!rows?.length || !mingguKe || !tahunAjaran || !semester || !tanggalMulai || !tanggalAkhir) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (!["GANJIL", "GENAP"].includes(semester)) {
      return NextResponse.json({ error: "Semester tidak valid" }, { status: 400 });
    }

    const num = (val: unknown) => {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };

    const str = (val: unknown): string | null => {
      if (val === null || val === undefined || String(val).trim() === "") return null;
      return String(val).trim();
    };

    let berhasil = 0;
    let gagal = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Cari siswa berdasarkan NIS
        const siswa = await prisma.siswa.findFirst({
          where: { nis: String(row.nis), aktif: true },
        });

        if (!siswa) {
          errors.push(`NIS ${row.nis} tidak ditemukan`);
          gagal++;
          continue;
        }

        // Hitung sisaApMingguIni = apnMingguIni - appMingguIni
        const apnMingguIni = num(row.apnMingguIni);
        const appMingguIni = num(row.appMingguIni);
        const sisaApMingguIni = apnMingguIni - appMingguIni;

        const payload = {
          tanggalMulai: new Date(tanggalMulai),
          tanggalAkhir: new Date(tanggalAkhir),

          // Sholat berjamaah
          subuhS:  num(row.subuhS),  subuhI:  num(row.subuhI),  subuhA:  num(row.subuhA),
          dzuhurS: num(row.dzuhurS), dzuhurI: num(row.dzuhurI), dzuhurA: num(row.dzuhurA),
          asarS:   num(row.asarS),   asarI:   num(row.asarI),   asarA:   num(row.asarA),
          magribS: num(row.magribS), magribI: num(row.magribI), magribA: num(row.magribA),
          isyaS:   num(row.isyaS),   isyaI:   num(row.isyaI),   isyaA:   num(row.isyaA),

          // Kegiatan
          btaS:       num(row.btaS),       btaI:       num(row.btaI),       btaA:       num(row.btaA),
          kbmS:       num(row.kbmS),       kbmI:       num(row.kbmI),       kbmA:       num(row.kbmA),
          ekskulS:    num(row.ekskulS),    ekskulI:    num(row.ekskulI),    ekskulA:    num(row.ekskulA),
          vokasionalS:num(row.vokasionalS),vokasionalI:num(row.vokasionalI),vokasionalA:num(row.vokasionalA),
          piketS:     num(row.piketS),     piketI:     num(row.piketI),     piketA:     num(row.piketA),
          lain:       num(row.lain),

          // Minggu ini
          apnMingguIni,
          appMingguIni,
          sisaApMingguIni,

          // Akumulasi minggu lalu (diisi manual dari Excel)
          sisaApMingguLalu: num(row.sisaApMingguLalu),

          // Akumulasi keseluruhan
          apnTotal:    num(row.apnTotal),
          appTotal:    num(row.appTotal),
          sisaApTotal: num(row.sisaApTotal),
          noUrut:      row.noUrut != null ? num(row.noUrut) : null,

          // Pembimbingan & keterangan
          pembimbingan: str(row.pembimbingan),
          keterangan:   str(row.keterangan),
        };

        await prisma.rekapPelanggaran.upsert({
          where: {
            siswaId_mingguKe_tahunAjaran_semester: {
              siswaId: siswa.id,
              mingguKe: Number(mingguKe),
              tahunAjaran,
              semester,
            },
          },
          update: payload,
          create: {
            siswaId:    siswa.id,
            mingguKe:   Number(mingguKe),
            tahunAjaran,
            semester,
            ...payload,
          },
        });

        berhasil++;
      } catch (err) {
        console.error(err);
        errors.push(`NIS ${row.nis}: gagal disimpan`);
        gagal++;
      }
    }

    return NextResponse.json({ berhasil, gagal, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
