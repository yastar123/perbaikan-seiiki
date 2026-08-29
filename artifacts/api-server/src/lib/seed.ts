import { count } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  bookingConfigTable,
  bookingServicesTable,
  dashboardUsersTable,
  fieldReportsTable,
  serviceRequestsTable,
  transactionsTable,
} from "@workspace/db";

export async function seedDemoData(): Promise<void> {
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(dashboardUsersTable);

  if (Number(userCount) === 0) {
    await db.insert(dashboardUsersTable).values([
      {
        name: "Raka Pratama",
        phone: "0812 9000 1122",
        role: "worker",
        specialty: "Instalasi & panel",
        status: "active",
      },
      {
        name: "Dimas Saputra",
        phone: "0813 5550 7788",
        role: "worker",
        specialty: "Perbaikan rumah",
        status: "active",
      },
      {
        name: "Admin SEIIKI",
        phone: "0811 8899 0011",
        role: "admin",
        specialty: "Operasional",
        status: "active",
      },
    ]);
  }

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

  const [{ value: serviceCount }] = await db
    .select({ value: count() })
    .from(bookingServicesTable);

  if (Number(serviceCount) === 0) {
    await db.insert(bookingServicesTable).values([
      {
        name: "Perbaikan listrik rumah",
        category: "Perbaikan",
        description: "Penanganan korsleting, MCB trip / sering jeglek, kabel panas, dan stop kontak mati.",
        estimatedPrice: 75000,
        estimatedDuration: "1 - 2 Jam",
        icon: "Wrench",
        isActive: 1,
        sortOrder: 1,
      },
      {
        name: "Instalasi titik listrik",
        category: "Pemasangan",
        description: "Penambahan stop kontak baru, saklar lampu, kabel rapi, dan jalur peralatan elektronik.",
        estimatedPrice: 60000,
        estimatedDuration: "1 - 3 Jam",
        icon: "Plus",
        isActive: 1,
        sortOrder: 2,
      },
      {
        name: "Pemeriksaan instalasi",
        category: "Pemeriksaan",
        description: "Audit menyeluruh kelaikan instalasi listrik, kebocoran arus grounding, dan beban trafo/MCB.",
        estimatedPrice: 100000,
        estimatedDuration: "2 - 3 Jam",
        icon: "ShieldCheck",
        isActive: 1,
        sortOrder: 3,
      },
      {
        name: "Perbaikan panel / MCB",
        category: "Panel & Daya",
        description: "Penggantian MCB rusak, upgrade pembagian grup sirkuit panel, dan instalasi ELCB/RCCB anti-setrum.",
        estimatedPrice: 120000,
        estimatedDuration: "1 - 2 Jam",
        icon: "Activity",
        isActive: 1,
        sortOrder: 4,
      },
    ]);
  }

  const [{ value: requestCount }] = await db
    .select({ value: count() })
    .from(serviceRequestsTable);

  if (Number(requestCount) === 0) {
    const [first] = await db
      .insert(serviceRequestsTable)
      .values({
        code: "SEI-260829-101",
        customerName: "Budi Santoso",
        whatsapp: "0812 3456 7890",
        address: "Jl. Kemang Raya No. 14, Jakarta Selatan",
        latitude: -6.2607,
        longitude: 106.8106,
        serviceType: "Perbaikan listrik rumah",
        notes: "MCB sering turun saat AC menyala.",
        status: "paid",
        paymentStatus: "paid",
        visitFee: 25000,
      })
      .returning();

    await db.insert(serviceRequestsTable).values([
      {
        code: "SEI-260829-102",
        customerName: "Nadia Putri",
        whatsapp: "0821 9087 6677",
        address: "Perumahan Citra Garden, Blok D7",
        latitude: -6.1472,
        longitude: 106.7056,
        serviceType: "Instalasi lampu & saklar",
        notes: "Butuh pemasangan 4 titik lampu.",
        status: "assigned",
        paymentStatus: "paid",
        visitFee: 25000,
        assignedWorkerId: 1,
      },
      {
        code: "SEI-260828-099",
        customerName: "Andi Wijaya",
        whatsapp: "0857 2012 3344",
        address: "Jl. Tebet Barat Dalam, Jakarta Selatan",
        latitude: -6.2382,
        longitude: 106.8568,
        serviceType: "Cek instalasi listrik",
        notes: "Pemeriksaan jalur listrik sebelum renovasi.",
        status: "completed",
        paymentStatus: "paid",
        visitFee: 25000,
        repairCost: 450000,
        assignedWorkerId: 2,
      },
    ]);

    if (first) {
      await db.insert(transactionsTable).values({
        requestId: first.id,
        requestCode: first.code,
        customerName: first.customerName,
        type: "visit_fee",
        amount: 25000,
        status: "paid",
      });
    }
  }

  const [{ value: reportCount }] = await db
    .select({ value: count() })
    .from(fieldReportsTable);

  if (Number(reportCount) === 0) {
    const requests = await db.select().from(serviceRequestsTable);
    if (requests.length > 0) {
      const targetReq = requests.find((r) => r.status === "completed") || requests[0];
      await db.insert(fieldReportsTable).values([
        {
          requestId: targetReq.id,
          notes: "Pemeriksaan MCB dan instalasi grounding di lokasi selesai. Jalur stop kontak utama telah diperbaiki karena longgar dan kendor, MCB utama diganti ke tipe anti-trip 16A.",
          media: ["foto_pemeriksaan_mcb.jpg", "skema_jalur_kabel.png"],
        },
      ]);
    }
  }
}