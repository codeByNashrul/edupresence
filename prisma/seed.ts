import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database EduPresence...");

  // 1. Admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { nip: "000000000001" },
    update: {},
    create: {
      nama: "Administrator",
      nip: "000000000001",
      password: adminPassword,
      role: Role.ADMIN,
      aktif: true,
    },
  });

  // 2. Kepala Sekolah
  const kepsekPassword = await bcrypt.hash("kepsek123", 12);
  await prisma.user.upsert({
    where: { nip: "000000000002" },
    update: {},
    create: {
      nama: "Kepala Sekolah",
      nip: "000000000002",
      password: kepsekPassword,
      noWa: "6281234567890",
      role: Role.PIMPINAN,
      aktif: true,
    },
  });

  // 3. Kelas
  const kelasData = [
    { nama: "X-A", tingkat: "X" },
    { nama: "X-B", tingkat: "X" },
    { nama: "XI-A", tingkat: "XI" },
    { nama: "XI-B", tingkat: "XI" },
    { nama: "XII-A", tingkat: "XII" },
    { nama: "XII-B", tingkat: "XII" },
  ];
  for (const kelas of kelasData) {
    await prisma.kelas.upsert({
      where: { nama: kelas.nama },
      update: {},
      create: kelas,
    });
  }

  // 4. Mata Pelajaran
  const mapelData = [
    { nama: "Matematika", kode: "MTK" },
    { nama: "Bahasa Indonesia", kode: "BIND" },
    { nama: "Bahasa Inggris", kode: "BING" },
    { nama: "IPA", kode: "IPA" },
    { nama: "IPS", kode: "IPS" },
    { nama: "Sejarah", kode: "SEJ" },
    { nama: "Pendidikan Agama", kode: "PAI" },
    { nama: "Olahraga", kode: "PJOK" },
  ];
  for (const mapel of mapelData) {
    await prisma.mataPelajaran.upsert({
      where: { kode: mapel.kode },
      update: {},
      create: mapel,
    });
  }

  // 5. Ruangan
  const ruanganData = [
    { nama: "Ruang 1", kodeQr: "RG001-EDUPRESENCE" },
    { nama: "Ruang 2", kodeQr: "RG002-EDUPRESENCE" },
    { nama: "Ruang 3", kodeQr: "RG003-EDUPRESENCE" },
    { nama: "Lapangan", kodeQr: "LAPANGAN-EDUPRESENCE" },
    { nama: "Lab Komputer", kodeQr: "LABKOM-EDUPRESENCE" },
  ];
  for (const ruangan of ruanganData) {
    await prisma.ruangan.upsert({
      where: { nama: ruangan.nama },
      update: {},
      create: ruangan,
    });
  }

  // 6. Pengaturan default
  const count = await prisma.pengaturan.count();
  if (count === 0) {
    await prisma.pengaturan.create({
      data: {
        toleransiMenit: 15,
        jamBerangkatMulai: "06:00",
        jamBerangkatSelesai: "08:00",
        jamPulangMulai: "13:00",
        jamPulangSelesai: "16:00",
        templatePesanWa:
          "Yth. Bpk/Ibu {nama},\n\nAnda terjadwal mengajar *{mapel}* kelas *{kelas}* pada jam *{jam}* hari ini ({tanggal}).\n\nMohon konfirmasi kehadiran Anda.\n\nTerima kasih.\n_EduPresence_",
      },
    });
  }

  console.log("✅ Seeding selesai!");
  console.log("📋 Akun default:");
  console.log("   Admin    → NIP: 000000000001 | Password: admin123");
  console.log("   Pimpinan → NIP: 000000000002 | Password: kepsek123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
