import { count } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  dashboardUsersTable,
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
}