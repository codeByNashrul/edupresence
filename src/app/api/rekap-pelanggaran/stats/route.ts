import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = ["ADMIN", "PIMPINAN", "GURU", "STAFF"];

function sumSholat(r: {
  subuhS: number;
  subuhI: number;
  subuhA: number;
  dzuhurS: number;
  dzuhurI: number;
  dzuhurA: number;
  asarS: number;
  asarI: number;
  asarA: number;
  magribS: number;
  magribI: number;
  magribA: number;
  isyaS: number;
  isyaI: number;
  isyaA: number;
}) {
  return (
    r.subuhS +
    r.subuhI +
    r.subuhA +
    r.dzuhurS +
    r.dzuhurI +
    r.dzuhurA +
    r.asarS +
    r.asarI +
    r.asarA +
    r.magribS +
    r.magribI +
    r.magribA +
    r.isyaS +
    r.isyaI +
    r.isyaA
  );
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tahunAjaran = searchParams.get("tahunAjaran") ?? "2025/2026";
  const semester = searchParams.get("semester") ?? "GENAP";
  const mingguKe = Number(searchParams.get("mingguKe") ?? "1");

  try {
    const data = await prisma.rekapPelanggaran.findMany({
      where: {
        tahunAjaran,
        semester,
        mingguKe,
        siswa: { aktif: true },
      },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
            kelas: { select: { nama: true } },
          },
        },
      },
    });

    const totalSiswa = data.length;
    const avgApnTotal = totalSiswa
      ? Math.round(data.reduce((s, r) => s + r.apnTotal, 0) / totalSiswa)
      : 0;
    const siswaLunas = data.filter((r) => r.sisaApTotal <= 0).length;
    const siswaKritis = data.filter((r) => r.sisaApTotal > 10).length;

    const kategori = [
      { name: "Sholat", jumlah: data.reduce((s, r) => s + sumSholat(r), 0) },
      {
        name: "BTA",
        jumlah: data.reduce((s, r) => s + r.btaS + r.btaI + r.btaA, 0),
      },
      {
        name: "KBM",
        jumlah: data.reduce((s, r) => s + r.kbmS + r.kbmI + r.kbmA, 0),
      },
      {
        name: "Ekskul",
        jumlah: data.reduce((s, r) => s + r.ekskulS + r.ekskulI + r.ekskulA, 0),
      },
      {
        name: "Vokasional",
        jumlah: data.reduce(
          (s, r) => s + r.vokasionalS + r.vokasionalI + r.vokasionalA,
          0,
        ),
      },
      {
        name: "Piket",
        jumlah: data.reduce((s, r) => s + r.piketS + r.piketI + r.piketA, 0),
      },
      { name: "Lain", jumlah: data.reduce((s, r) => s + r.lain, 0) },
    ].filter((k) => k.jumlah > 0);

    const topViolators = [...data]
      .sort((a, b) => b.apnTotal - a.apnTotal)
      .slice(0, 5)
      .map((r) => ({
        siswaId: r.siswa.id,
        nama: r.siswa.nama,
        nis: r.siswa.nis,
        kelas: r.siswa.kelas?.nama ?? "-",
        apnTotal: r.apnTotal,
        apnMingguIni: r.apnMingguIni,
        sisaApTotal: r.sisaApTotal,
      }));

    const statusDistribusi = [
      { name: "Lunas", value: siswaLunas },
      {
        name: "Perhatian (1–10)",
        value: data.filter((r) => r.sisaApTotal > 0 && r.sisaApTotal <= 10)
          .length,
      },
      { name: "Kritis (>10)", value: siswaKritis },
    ].filter((s) => s.value > 0);

    let bulanLabel = "";
    if (data.length > 0) {
      const tgl = new Date(data[0].tanggalMulai);
      bulanLabel = tgl.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
    }

    return NextResponse.json({
      periode: { tahunAjaran, semester, mingguKe, bulanLabel },
      summary: { totalSiswa, avgApnTotal, siswaLunas, siswaKritis },
      kategori,
      topViolators,
      statusDistribusi,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
