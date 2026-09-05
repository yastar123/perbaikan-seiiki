import { count, inArray, eq, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  bookingConfigTable,
  bookingServicesTable,
  dashboardUsersTable,
  fieldReportsTable,
  nidiSloTariffsTable,
  serviceRequestsTable,
  transactionsTable,
} from "@workspace/db";

export const DEFAULT_NIDI_SLO_TARIFFS = [
  { sortOrder: 1, powerVa: 450, powerLabel: "450 VA", sloFee: 40000, nidiFee: 45000, totalFee: 85000, notes: "Tarif tetap per golongan daya (TR 450 VA)" },
  { sortOrder: 2, powerVa: 900, powerLabel: "900 VA", sloFee: 60000, nidiFee: 90000, totalFee: 150000, notes: "Tarif tetap per golongan daya (TR 900 VA)" },
  { sortOrder: 3, powerVa: 1300, powerLabel: "1.300 VA", sloFee: 120000, nidiFee: 130000, totalFee: 250000, notes: "Tarif tetap per golongan daya (TR 1.300 VA)" },
  { sortOrder: 4, powerVa: 2200, powerLabel: "2.200 VA", sloFee: 135000, nidiFee: 220000, totalFee: 355000, notes: "Tarif tetap per golongan daya (TR 2.200 VA)" },
  { sortOrder: 5, powerVa: 3500, powerLabel: "3.500 VA", sloFee: 122500, nidiFee: 350000, totalFee: 472500, notes: "SLO: 3.500 VA × Rp35/VA | NIDI: 3.500 VA × Rp100/VA" },
  { sortOrder: 6, powerVa: 4400, powerLabel: "4.400 VA", sloFee: 154000, nidiFee: 440000, totalFee: 594000, notes: "SLO: 4.400 VA × Rp35/VA | NIDI: 4.400 VA × Rp100/VA" },
  { sortOrder: 7, powerVa: 5500, powerLabel: "5.500 VA", sloFee: 192500, nidiFee: 550000, totalFee: 742500, notes: "SLO: 5.500 VA × Rp35/VA | NIDI: 5.500 VA × Rp100/VA" },
  { sortOrder: 8, powerVa: 6600, powerLabel: "6.600 VA", sloFee: 231000, nidiFee: 660000, totalFee: 891000, notes: "SLO: 6.600 VA × Rp35/VA | NIDI: 6.600 VA × Rp100/VA" },
  { sortOrder: 9, powerVa: 7700, powerLabel: "7.700 VA", sloFee: 269500, nidiFee: 770000, totalFee: 1039500, notes: "SLO: 7.700 VA × Rp35/VA | NIDI: 7.700 VA × Rp100/VA" },
  { sortOrder: 10, powerVa: 10600, powerLabel: "10.600 VA", sloFee: 318000, nidiFee: 1060000, totalFee: 1378000, notes: "SLO: 10.600 VA × Rp30/VA | NIDI: 10.600 VA × Rp100/VA" },
  { sortOrder: 11, powerVa: 11000, powerLabel: "11.000 VA", sloFee: 330000, nidiFee: 1100000, totalFee: 1430000, notes: "SLO: 11.000 VA × Rp30/VA | NIDI: 11.000 VA × Rp100/VA" },
  { sortOrder: 12, powerVa: 13200, powerLabel: "13.200 VA", sloFee: 396000, nidiFee: 1320000, totalFee: 1716000, notes: "SLO: 13.200 VA × Rp30/VA | NIDI: 13.200 VA × Rp100/VA" },
  { sortOrder: 13, powerVa: 16500, powerLabel: "16.500 VA", sloFee: 495000, nidiFee: 1650000, totalFee: 2145000, notes: "SLO: 16.500 VA × Rp30/VA | NIDI: 16.500 VA × Rp100/VA" },
  { sortOrder: 14, powerVa: 23000, powerLabel: "23.000 VA", sloFee: 690000, nidiFee: 2300000, totalFee: 2990000, notes: "SLO: 23.000 VA × Rp30/VA | NIDI: 23.000 VA × Rp100/VA" },
  { sortOrder: 15, powerVa: 33000, powerLabel: "33.000 VA", sloFee: 825000, nidiFee: 2475000, totalFee: 3300000, notes: "SLO: 33.000 VA × Rp25/VA | NIDI: 33.000 VA × Rp75/VA" },
  { sortOrder: 16, powerVa: 41500, powerLabel: "41.500 VA", sloFee: 1037500, nidiFee: 3112500, totalFee: 4150000, notes: "SLO: 41.500 VA × Rp25/VA | NIDI: 41.500 VA × Rp75/VA" },
  { sortOrder: 17, powerVa: 53000, powerLabel: "53.000 VA", sloFee: 1325000, nidiFee: 3975000, totalFee: 5300000, notes: "SLO: 53.000 VA × Rp25/VA | NIDI: 53.000 VA × Rp75/VA" },
  { sortOrder: 18, powerVa: 66000, powerLabel: "66.000 VA", sloFee: 1650000, nidiFee: 4950000, totalFee: 6600000, notes: "SLO: 66.000 VA × Rp25/VA | NIDI: 66.000 VA × Rp75/VA" },
  { sortOrder: 19, powerVa: 82500, powerLabel: "82.500 VA", sloFee: 1650000, nidiFee: 4950000, totalFee: 6600000, notes: "Batas bawah golongan tarif SLO disesuaikan dengan data Supervisi NIDI" },
  { sortOrder: 20, powerVa: 105000, powerLabel: "105.000 VA", sloFee: 2100000, nidiFee: 6300000, totalFee: 8400000, notes: "SLO: 105.000 VA × Rp20/VA | NIDI: 105.000 VA × Rp60/VA" },
  { sortOrder: 21, powerVa: 131000, powerLabel: "131.000 VA", sloFee: 2620000, nidiFee: 7860000, totalFee: 10480000, notes: "SLO: 131.000 VA × Rp20/VA | NIDI: 131.000 VA × Rp60/VA" },
  { sortOrder: 22, powerVa: 147000, powerLabel: "147.000 VA", sloFee: 2940000, nidiFee: 8820000, totalFee: 11760000, notes: "SLO: 147.000 VA × Rp20/VA | NIDI: 147.000 VA × Rp60/VA" },
  { sortOrder: 23, powerVa: 164000, powerLabel: "164.000 VA", sloFee: 3280000, nidiFee: 9840000, totalFee: 13120000, notes: "SLO: 164.000 VA × Rp20/VA | NIDI: 164.000 VA × Rp60/VA" },
  { sortOrder: 24, powerVa: 197000, powerLabel: "197.000 VA", sloFee: 3940000, nidiFee: 11820000, totalFee: 15760000, notes: "SLO: 197.000 VA × Rp20/VA | NIDI: 197.000 VA × Rp60/VA" },
];

export async function seedDemoData(): Promise<void> {
  // 1. Clean up legacy dummy demo requests, transactions, and reports
  try {
    const dummyCodes = ["SEI-260829-101", "SEI-260829-102", "SEI-260828-099"];
    const dummyRequests = await db
      .select()
      .from(serviceRequestsTable)
      .where(
        or(
          inArray(serviceRequestsTable.code, dummyCodes),
          inArray(serviceRequestsTable.customerName, ["Budi Santoso", "Nadia Putri", "Andi Wijaya"])
        )
      );

    if (dummyRequests.length > 0) {
      const dummyReqIds = dummyRequests.map((r: any) => r.id);
      await db
        .delete(fieldReportsTable)
        .where(inArray(fieldReportsTable.requestId, dummyReqIds));
      await db
        .delete(transactionsTable)
        .where(inArray(transactionsTable.requestId, dummyReqIds));
      await db
        .delete(serviceRequestsTable)
        .where(inArray(serviceRequestsTable.id, dummyReqIds));
      console.log(`[Seed] Cleaned up ${dummyRequests.length} legacy dummy request(s).`);
    }

    // Clean up legacy dummy worker users
    await db
      .delete(dashboardUsersTable)
      .where(
        or(
          inArray(dashboardUsersTable.email, ["raka@seiiki.id", "dimas@seiiki.id"]),
          inArray(dashboardUsersTable.name, ["Raka Pratama", "Dimas Saputra"])
        )
      );
  } catch (cleanErr) {
    console.warn("[Seed] Note during dummy data cleanup:", cleanErr);
  }

  // 2. Ensure initial Admin account exists
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(dashboardUsersTable);

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@acc.co.id").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "password123";

  if (Number(userCount) === 0) {
    await db.insert(dashboardUsersTable).values([
      {
        name: "Admin SEIIKI",
        phone: "0811 8899 0011",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        specialty: "Operasional",
        status: "active",
      },
    ]);
  }

  // 3. Ensure booking form default configuration exists
  const [{ value: configCount }] = await db
    .select({ value: count() })
    .from(bookingConfigTable);

  if (Number(configCount) === 0) {
    await db.insert(bookingConfigTable).values({
      stepNumber: "01",
      title: "Ajukan kunjungan",
      subtitle: "Isi detail singkat, kami lanjutkan lewat WhatsApp.",
      visitFee: 25000,
      visitFeeNote: "dibayar di muka",
      buttonText: "Lanjut ke pembayaran",
      adminWhatsapp: "6281112345678",
      namePlaceholder: "Contoh: Sinta Rahma",
      phonePlaceholder: "08xx xxxx xxxx",
      phoneHint: "Gunakan nomor yang aktif menerima pesan",
      addressPlaceholder: "Alamat lengkap, patokan, dan lantai bila ada",
      gpsButtonText: "Ambil lokasi GPS",
      gpsHint: "Bagikan lokasi agar teknisi menemukan alamat dengan tepat",
      notesPlaceholder: "Keluhan, waktu yang diinginkan...",
      notesHint: "Opsional",
      enableGps: 1,
      enableNotes: 1,
    });
  }

  // 4. Ensure master service categories exist (3 layanan utama)
  const existingServices = await db.select().from(bookingServicesTable);
  const targetServices = [
    {
      name: "Perbaikan Listrik Rumah",
      category: "Perbaikan",
      description: "Penanganan korsleting, MCB trip / jeglek, perbaikan instalasi rumah, kabel terbakar, dan stop kontak mati.",
      estimatedPrice: null,
      estimatedDuration: "1 - 2 Jam",
      icon: "Wrench",
      isActive: 1,
      sortOrder: 1,
    },
    {
      name: "Pasang Baru",
      category: "Pemasangan",
      description: "Pemasangan instalasi listrik baru untuk rumah, ruko, bangunan baru, penambahan titik listrik & panel distribusi.",
      estimatedPrice: null,
      estimatedDuration: "1 - 3 Jam",
      icon: "Plus",
      isActive: 1,
      sortOrder: 2,
    },
    {
      name: "NIDI dan SLO",
      category: "Sertifikasi",
      description: "Penerbitan Nomor Identitas Instalasi Tenaga Listrik (NIDI) & Sertifikat Laik Operasi (SLO) Tegangan Rendah (TR) resmi.",
      estimatedPrice: null,
      estimatedDuration: "1 - 3 Hari Kerja",
      icon: "Zap",
      isActive: 1,
      sortOrder: 3,
    },
  ];

  if (existingServices.length === 0) {
    await db.insert(bookingServicesTable).values(targetServices);
  } else {
    // Ensure the 3 core services are in the database
    for (const ts of targetServices) {
      const match = existingServices.find(
        (s) => s.name.toLowerCase() === ts.name.toLowerCase()
      );
      if (!match) {
        await db.insert(bookingServicesTable).values(ts);
      }
    }
  }

  // 5. Ensure NIDI & SLO 24 Tariffs exist
  const [{ value: tariffCount }] = await db
    .select({ value: count() })
    .from(nidiSloTariffsTable);

  if (Number(tariffCount) === 0) {
    await db.insert(nidiSloTariffsTable).values(
      DEFAULT_NIDI_SLO_TARIFFS.map((t) => ({
        ...t,
        isActive: 1,
      }))
    );
    console.log(`[Seed] Seeded ${DEFAULT_NIDI_SLO_TARIFFS.length} NIDI & SLO tariff rows.`);
  }
}

