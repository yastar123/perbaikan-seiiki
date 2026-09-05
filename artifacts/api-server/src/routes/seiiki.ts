import { and, count, desc, asc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bookingConfigTable,
  bookingServicesTable,
  dashboardUsersTable,
  equipmentRequestsTable,
  fieldReportsTable,
  nidiSloTariffsTable,
  serviceRequestsTable,
  transactionsTable,
} from "@workspace/db";
import { DEFAULT_NIDI_SLO_TARIFFS } from "../lib/seed.js";
import {
  CreateEquipmentRequestBody,
  CreateFieldReportBody,
  CreateServiceRequestBody,
  CreateUserBody,
  CreateVisitPaymentBody,
  ListServiceRequestsQueryParams,
  ListTransactionsQueryParams,
  UpdateEquipmentRequestBody,
  UpdateEquipmentRequestParams,
  UpdateServiceRequestBody,
  UpdateServiceRequestParams,
  UpdateUserBody,
  UpdateUserParams,
  CreateVisitPaymentParams,
  CreateFieldReportParams,
  DeleteServiceRequestParams,
  DeleteUserParams,
} from "@workspace/api-zod";
const router: IRouter = Router();
const requestStatuses = [
  "waiting_payment",
  "paid",
  "assigned",
  "on_site",
  "waiting_approval",
  "in_progress",
  "completed",
  "cancelled",
] as const;

function asDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function mapRequest(request: typeof serviceRequestsTable.$inferSelect) {
  const worker = request.assignedWorkerId
    ? (
        await db
          .select({ name: dashboardUsersTable.name })
          .from(dashboardUsersTable)
          .where(eq(dashboardUsersTable.id, request.assignedWorkerId))
          .limit(1)
      )[0]
    : undefined;
  const [{ value: reportCount }] = await db
    .select({ value: count() })
    .from(fieldReportsTable)
    .where(eq(fieldReportsTable.requestId, request.id));

  return {
    id: request.id,
    code: request.code,
    customerName: request.customerName,
    whatsapp: request.whatsapp,
    address: request.address,
    province: request.province,
    regency: request.regency,
    district: request.district,
    village: request.village,
    latitude: request.latitude,
    longitude: request.longitude,
    serviceType: request.serviceType,
    powerVa: request.powerVa,
    sloFee: request.sloFee,
    nidiFee: request.nidiFee,
    totalAmount: request.totalAmount,
    notes: request.notes,
    status: request.status,
    paymentStatus: request.paymentStatus,
    visitFee: request.visitFee,
    repairCost: request.repairCost,
    assignedWorkerId: request.assignedWorkerId,
    assignedWorkerName: worker?.name ?? null,
    reportCount: Number(reportCount),
    createdAt: request.createdAt,
  };
}

function mapUser(user: typeof dashboardUsersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone || "",
    email: user.email || `${user.name.toLowerCase().replace(/\s+/g, "")}@seiiki.id`,
    role: user.role as "admin" | "worker",
    specialty: user.specialty || "Teknisi Listrik",
    status: user.status as "active" | "inactive",
  };
}

router.get("/requests", async (req, res): Promise<void> => {
  const parsed = ListServiceRequestsQueryParams.safeParse({
    status: req.query.status ?? "all",
    from: asDate(req.query.from),
    to: asDate(req.query.to),
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = [];
  if (parsed.data.status !== "all") {
    filters.push(eq(serviceRequestsTable.status, parsed.data.status));
  }
  if (parsed.data.from) {
    filters.push(gte(serviceRequestsTable.createdAt, parsed.data.from));
  }
  if (parsed.data.to) {
    filters.push(lte(serviceRequestsTable.createdAt, parsed.data.to));
  }

  const requests = await db
    .select()
    .from(serviceRequestsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(serviceRequestsTable.createdAt));
  res.json(await Promise.all(requests.map(mapRequest)));
});

router.post("/requests", async (req, res): Promise<void> => {
  const parsed = CreateServiceRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let currentVisitFee = 25000;
  try {
    const config = (await db.select().from(bookingConfigTable).limit(1))[0];
    if (config?.visitFee) {
      currentVisitFee = config.visitFee;
    }
  } catch (e) {
    // fallback to 25000
  }

  const { province, regency, district, village, powerVa, sloFee, nidiFee, totalAmount } = req.body || {};

  const isNidiSlo =
    parsed.data.serviceType?.toLowerCase().includes("slo") ||
    parsed.data.serviceType?.toLowerCase().includes("nidi");

  const finalVisitFee = isNidiSlo ? 0 : currentVisitFee;
  const finalPowerVa = powerVa ? Number(powerVa) : null;
  const finalSloFee = sloFee ? Number(sloFee) : null;
  const finalNidiFee = nidiFee ? Number(nidiFee) : null;
  const calculatedTotal =
    finalSloFee !== null && finalNidiFee !== null
      ? finalSloFee + finalNidiFee
      : totalAmount
      ? Number(totalAmount)
      : isNidiSlo
      ? 85000
      : null;

  const [request] = await db
    .insert(serviceRequestsTable)
    .values({
      ...parsed.data,
      province: province || null,
      regency: regency || null,
      district: district || null,
      village: village || null,
      powerVa: finalPowerVa,
      sloFee: finalSloFee,
      nidiFee: finalNidiFee,
      totalAmount: calculatedTotal,
      code: `SEI-${Date.now().toString().slice(-8)}`,
      visitFee: finalVisitFee,
      status: "waiting_payment",
      paymentStatus: "unpaid",
    })
    .returning();
  res.status(201).json(await mapRequest(request));
});

router.patch("/requests/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceRequestParams.safeParse(req.params);
  const parsed = UpdateServiceRequestBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    parsed.data.status &&
    !requestStatuses.includes(parsed.data.status as (typeof requestStatuses)[number])
  ) {
    res.status(400).json({ error: "Invalid request status" });
    return;
  }

  const [request] = await db
    .update(serviceRequestsTable)
    .set(parsed.data)
    .where(eq(serviceRequestsTable.id, params.data.id))
    .returning();
  if (!request) {
    res.status(404).json({ error: "Service request not found" });
    return;
  }

  // Handle repair cost transaction sync
  if (parsed.data.repairCost !== undefined) {
    const existingRepairTransaction = (
      await db
        .select({ id: transactionsTable.id })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.requestId, request.id),
            eq(transactionsTable.type, "repair_fee"),
          ),
        )
        .limit(1)
    )[0];

    if (parsed.data.repairCost === null || parsed.data.repairCost === 0) {
      if (existingRepairTransaction) {
        await db
          .delete(transactionsTable)
          .where(eq(transactionsTable.id, existingRepairTransaction.id));
      }
    } else if (existingRepairTransaction) {
      await db
        .update(transactionsTable)
        .set({
          amount: parsed.data.repairCost,
          status: request.status === "completed" ? "paid" : "pending",
        })
        .where(eq(transactionsTable.id, existingRepairTransaction.id));
    } else {
      await db.insert(transactionsTable).values({
        requestId: request.id,
        requestCode: request.code,
        customerName: request.customerName,
        type: "repair_fee",
        amount: parsed.data.repairCost,
        status: request.status === "completed" ? "paid" : "pending",
      });
    }
  }

  // Handle status sync for existing transactions
  if (parsed.data.status) {
    if (parsed.data.status === "completed") {
      await db
        .update(transactionsTable)
        .set({ status: "paid" })
        .where(
          and(
            eq(transactionsTable.requestId, request.id),
            eq(transactionsTable.type, "repair_fee"),
          ),
        );
    } else if (parsed.data.status === "cancelled") {
      await db
        .update(transactionsTable)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(transactionsTable.requestId, request.id),
            eq(transactionsTable.status, "pending"),
          ),
        );
    }
  }

  res.json(await mapRequest(request));
});

router.delete("/requests/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Service request not found" });
    return;
  }

  // Delete all related transactions to prevent orphan records
  await db
    .delete(transactionsTable)
    .where(eq(transactionsTable.requestId, params.data.id));

  res.sendStatus(204);
});

router.get("/workers", async (_req, res): Promise<void> => {
  const workers = await db
    .select()
    .from(dashboardUsersTable)
    .where(
      and(
        eq(dashboardUsersTable.role, "worker"),
        eq(dashboardUsersTable.status, "active"),
      ),
    )
    .orderBy(dashboardUsersTable.name);
  const assigned = await db
    .select({ workerId: serviceRequestsTable.assignedWorkerId })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.status, "assigned"));
  const assignedIds = new Set(assigned.map((row) => row.workerId));
  res.json(
    workers.map((worker) => ({
      id: worker.id,
      name: worker.name,
      phone: worker.phone,
      specialty: worker.specialty ?? "Teknisi listrik",
      status: assignedIds.has(worker.id) ? "assigned" : "available",
    })),
  );
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const requests = await db.select().from(serviceRequestsTable);
  const visit = await db
    .select({ value: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "visit_fee"));
  const repair = await db
    .select({ value: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "repair_fee"));
  const recent = await db
    .select()
    .from(serviceRequestsTable)
    .orderBy(desc(serviceRequestsTable.createdAt))
    .limit(4);

  res.json({
    totalRequests: requests.length,
    pendingAssignment: requests.filter((request) => request.status === "paid").length,
    onSite: requests.filter((request) =>
      ["on_site", "waiting_approval", "in_progress"].includes(request.status),
    ).length,
    completed: requests.filter((request) => request.status === "completed").length,
    visitRevenue: Number(visit[0]?.value ?? 0),
    repairRevenue: Number(repair[0]?.value ?? 0),
    recentActivity: recent.map((request) => ({
      label:
        request.status === "completed"
          ? "Pekerjaan selesai"
          : request.status === "assigned"
            ? "Teknisi ditugaskan"
            : "Permintaan baru",
      detail: `${request.code} · ${request.customerName}`,
      time: request.createdAt.toISOString(),
    })),
  });
});

router.post("/payments/:requestId", async (req, res): Promise<void> => {
  const params = CreateVisitPaymentParams.safeParse(req.params);
  const parsed = CreateVisitPaymentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Data pembayaran tidak valid" });
    return;
  }
  const request = (
    await db
      .select()
      .from(serviceRequestsTable)
      .where(eq(serviceRequestsTable.id, params.data.requestId))
      .limit(1)
  )[0];
  if (!request) {
    res.status(404).json({ error: "Service request not found" });
    return;
  }
  const [transaction] = await db
    .insert(transactionsTable)
    .values({
      requestId: request.id,
      requestCode: request.code,
      customerName: request.customerName,
      type: "visit_fee",
      amount: request.visitFee,
      status: "paid",
    })
    .returning();
  const [updated] = await db
    .update(serviceRequestsTable)
    .set({ paymentStatus: "paid", status: "paid" })
    .where(eq(serviceRequestsTable.id, request.id))
    .returning();
  void parsed.data.method;
  res.status(201).json({
    id: transaction.id,
    requestId: transaction.requestId,
    requestCode: transaction.requestCode,
    customerName: transaction.customerName,
    type: transaction.type as "visit_fee",
    amount: transaction.amount,
    status: transaction.status as "paid",
    createdAt: transaction.createdAt,
  });
  void updated;
});

router.get("/transactions", async (req, res): Promise<void> => {
  const parsed = ListTransactionsQueryParams.safeParse({
    period: req.query.period ?? "all",
    from: asDate(req.query.from),
    to: asDate(req.query.to),
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const filters = [];
  const now = new Date();
  if (parsed.data.period === "week") {
    filters.push(gte(transactionsTable.createdAt, new Date(now.getTime() - 7 * 86400000)));
  }
  if (parsed.data.period === "month") {
    filters.push(gte(transactionsTable.createdAt, new Date(now.getTime() - 30 * 86400000)));
  }
  if (parsed.data.period === "custom" && parsed.data.from) {
    filters.push(gte(transactionsTable.createdAt, parsed.data.from));
  }
  if (parsed.data.to) filters.push(lte(transactionsTable.createdAt, parsed.data.to));
  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(transactionsTable.createdAt));
  res.json(
    transactions.map((transaction) => ({
      ...transaction,
      type: transaction.type as "visit_fee" | "repair_fee",
      status: transaction.status as "paid" | "pending",
    })),
  );
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "ID transaksi tidak valid" });
    return;
  }

  // 1. Check if real record in transactionsTable
  const existing = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, id))
    .limit(1);

  if (existing.length > 0) {
    const tx = existing[0];
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id));

    // If associated with a service request, check if any other transactions remain
    if (tx.requestId) {
      const remainingTx = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.requestId, tx.requestId));
      if (remainingTx.length === 0) {
        await db
          .update(serviceRequestsTable)
          .set({ paymentStatus: "unpaid" })
          .where(eq(serviceRequestsTable.id, tx.requestId));
      }
    }

    res.json({ success: true, message: "Transaksi berhasil dihapus" });
    return;
  }

  // 2. Handle synthetic repair fee transactions (id >= 99000)
  if (id >= 99000 && id < 150000) {
    const reqId = id - 99000;
    await db
      .update(serviceRequestsTable)
      .set({ repairCost: null })
      .where(eq(serviceRequestsTable.id, reqId));
    res.json({ success: true, message: "Biaya perbaikan berhasil dihapus dari pesanan" });
    return;
  }

  // 3. Handle synthetic NIDI & SLO transactions (id >= 88000)
  if (id >= 88000 && id < 99000) {
    const reqId = id - 88000;
    await db
      .update(serviceRequestsTable)
      .set({ totalAmount: null, paymentStatus: "unpaid" })
      .where(eq(serviceRequestsTable.id, reqId));
    res.json({ success: true, message: "Transaksi NIDI & SLO berhasil dihapus" });
    return;
  }

  res.status(404).json({ error: "Transaksi tidak ditemukan" });
});

router.get("/equipment-requests", async (_req, res): Promise<void> => {
  const requests = await db
    .select()
    .from(equipmentRequestsTable)
    .orderBy(desc(equipmentRequestsTable.createdAt));
  res.json(
    requests.map((request) => ({
      ...request,
      urgency: request.urgency as "normal" | "urgent",
      status: request.status as "pending" | "approved" | "rejected",
    })),
  );
});

router.post("/equipment-requests", async (req, res): Promise<void> => {
  const parsed = CreateEquipmentRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const worker = (
    await db
      .select()
      .from(dashboardUsersTable)
      .where(eq(dashboardUsersTable.id, parsed.data.workerId))
      .limit(1)
  )[0];
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  const [request] = await db
    .insert(equipmentRequestsTable)
    .values({
      ...parsed.data,
      workerName: worker.name,
      status: "pending",
    })
    .returning();
  res.status(201).json({
    ...request,
    urgency: request.urgency as "normal" | "urgent",
    status: request.status as "pending" | "approved" | "rejected",
  });
});

router.patch("/equipment-requests/:id", async (req, res): Promise<void> => {
  const params = UpdateEquipmentRequestParams.safeParse(req.params);
  const parsed = UpdateEquipmentRequestBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Data permintaan alat tidak valid" });
    return;
  }
  const [request] = await db
    .update(equipmentRequestsTable)
    .set(parsed.data)
    .where(eq(equipmentRequestsTable.id, params.data.id))
    .returning();
  if (!request) {
    res.status(404).json({ error: "Equipment request not found" });
    return;
  }
  res.json({
    ...request,
    urgency: request.urgency as "normal" | "urgent",
    status: request.status as "pending" | "approved" | "rejected",
  });
});

router.post("/requests/:id/reports", async (req, res): Promise<void> => {
  const params = CreateFieldReportParams.safeParse(req.params);
  const parsed = CreateFieldReportBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Laporan lapangan tidak valid" });
    return;
  }
  const [report] = await db
    .insert(fieldReportsTable)
    .values({ requestId: params.data.id, ...parsed.data })
    .returning();
  await db
    .update(serviceRequestsTable)
    .set({ status: "waiting_approval" })
    .where(eq(serviceRequestsTable.id, params.data.id));
  res.status(201).json(report);
});

router.get("/field-reports", async (_req, res): Promise<void> => {
  const reports = await db
    .select({
      id: fieldReportsTable.id,
      requestId: fieldReportsTable.requestId,
      notes: fieldReportsTable.notes,
      media: fieldReportsTable.media,
      createdAt: fieldReportsTable.createdAt,
      requestCode: serviceRequestsTable.code,
      customerName: serviceRequestsTable.customerName,
      whatsapp: serviceRequestsTable.whatsapp,
      serviceType: serviceRequestsTable.serviceType,
      address: serviceRequestsTable.address,
      latitude: serviceRequestsTable.latitude,
      longitude: serviceRequestsTable.longitude,
      assignedWorkerId: serviceRequestsTable.assignedWorkerId,
      assignedWorkerName: dashboardUsersTable.name,
      requestStatus: serviceRequestsTable.status,
      repairCost: serviceRequestsTable.repairCost,
    })
    .from(fieldReportsTable)
    .leftJoin(
      serviceRequestsTable,
      eq(fieldReportsTable.requestId, serviceRequestsTable.id),
    )
    .leftJoin(
      dashboardUsersTable,
      eq(serviceRequestsTable.assignedWorkerId, dashboardUsersTable.id),
    )
    .orderBy(desc(fieldReportsTable.createdAt));

  res.json(reports);
});

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(dashboardUsersTable)
    .orderBy(desc(dashboardUsersTable.createdAt));
  res.json(users.map(mapUser));
});

router.post("/users", async (req, res): Promise<void> => {
  const { name, username, email, password, phone, role, specialty } = req.body || {};
  const finalName = String(username || name || "").trim();
  if (!finalName) {
    res.status(400).json({ error: "Username wajib diisi" });
    return;
  }
  const cleanEmail = email ? String(email).trim().toLowerCase() : `${finalName.toLowerCase().replace(/[^a-z0-9]/g, "")}@seiiki.id`;
  const cleanPassword = password ? String(password).trim() : "password123";

  const [user] = await db
    .insert(dashboardUsersTable)
    .values({
      name: finalName,
      email: cleanEmail,
      password: cleanPassword,
      phone: phone ? String(phone).trim() : "-",
      role: role || "worker",
      specialty: specialty || (role === "admin" ? "Administrator" : "Teknisi umum"),
      status: "active",
    })
    .returning();
  res.status(201).json(mapUser(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID pengguna tidak valid" });
    return;
  }
  const { name, username, email, password, phone, role, specialty, status } = req.body || {};
  const updatePayload: Record<string, any> = {};
  if (username !== undefined || name !== undefined) {
    const finalName = String(username || name || "").trim();
    if (finalName) updatePayload.name = finalName;
  }
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail) updatePayload.email = cleanEmail;
  }
  if (password !== undefined && String(password).trim() !== "") {
    updatePayload.password = String(password).trim();
  }
  if (phone !== undefined) updatePayload.phone = String(phone).trim();
  if (role !== undefined) updatePayload.role = role;
  if (specialty !== undefined) updatePayload.specialty = specialty;
  if (status !== undefined) updatePayload.status = status;

  const [user] = await db
    .update(dashboardUsersTable)
    .set(updatePayload)
    .where(eq(dashboardUsersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(mapUser(user));
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db
    .delete(dashboardUsersTable)
    .where(eq(dashboardUsersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

// ==========================================
// Booking Component & Services Configuration CRUD
// ==========================================

router.get("/booking-config", async (_req, res): Promise<void> => {
  let [config] = await db.select().from(bookingConfigTable).limit(1);
  if (!config) {
    [config] = await db
      .insert(bookingConfigTable)
      .values({
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
      })
      .returning();
  }
  res.json(config);
});

router.put("/booking-config", async (req, res): Promise<void> => {
  const body = req.body;
  let [config] = await db.select().from(bookingConfigTable).limit(1);
  if (!config) {
    [config] = await db
      .insert(bookingConfigTable)
      .values({
        ...body,
        updatedAt: new Date(),
      })
      .returning();
  } else {
    [config] = await db
      .update(bookingConfigTable)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(bookingConfigTable.id, config.id))
      .returning();
  }
  res.json(config);
});

router.get("/booking-services", async (_req, res): Promise<void> => {
  let services = await db
    .select()
    .from(bookingServicesTable)
    .orderBy(asc(bookingServicesTable.sortOrder), asc(bookingServicesTable.id));

  if (services.length === 0) {
    services = await db
      .insert(bookingServicesTable)
      .values([
        {
          name: "Perbaikan listrik rumah",
          category: "Perbaikan",
          description: "Penanganan korsleting, MCB trip / sering jeglek, kabel panas, dan stop kontak mati.",
          estimatedPrice: null,
          estimatedDuration: "1 - 2 Jam",
          icon: "Wrench",
          isActive: 1,
          sortOrder: 1,
        },
        {
          name: "Instalasi titik listrik",
          category: "Pemasangan",
          description: "Penambahan stop kontak baru, saklar lampu, kabel rapi, dan jalur peralatan elektronik.",
          estimatedPrice: null,
          estimatedDuration: "1 - 3 Jam",
          icon: "Plus",
          isActive: 1,
          sortOrder: 2,
        },
        {
          name: "Pemeriksaan instalasi",
          category: "Pemeriksaan",
          description: "Audit menyeluruh kelaikan instalasi listrik, kebocoran arus grounding, dan beban trafo/MCB.",
          estimatedPrice: null,
          estimatedDuration: "2 - 3 Jam",
          icon: "ShieldCheck",
          isActive: 1,
          sortOrder: 3,
        },
        {
          name: "Perbaikan panel / MCB",
          category: "Panel & Daya",
          description: "Penggantian MCB rusak, upgrade pembagian grup sirkuit panel, dan instalasi ELCB/RCCB anti-setrum.",
          estimatedPrice: null,
          estimatedDuration: "1 - 2 Jam",
          icon: "Activity",
          isActive: 1,
          sortOrder: 4,
        },
      ])
      .returning();
  }

  res.json(services);
});

router.post("/booking-services", async (req, res): Promise<void> => {
  const { name, category, description, estimatedPrice, estimatedDuration, icon, isActive, sortOrder } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Nama layanan wajib diisi" });
    return;
  }
  const [created] = await db
    .insert(bookingServicesTable)
    .values({
      name: name.trim(),
      category: category?.trim() || "Umum",
      description: description?.trim() || null,
      estimatedPrice: estimatedPrice ? Number(estimatedPrice) : null,
      estimatedDuration: estimatedDuration?.trim() || null,
      icon: icon || "Wrench",
      isActive: isActive !== undefined ? Number(isActive) : 1,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
    })
    .returning();
  res.status(201).json(created);
});

router.put("/booking-services/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: "ID layanan tidak valid" });
    return;
  }
  const { name, category, description, estimatedPrice, estimatedDuration, icon, isActive, sortOrder } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (category !== undefined) updateData.category = category.trim();
  if (description !== undefined) updateData.description = description;
  if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice ? Number(estimatedPrice) : null;
  if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
  if (icon !== undefined) updateData.icon = icon;
  if (isActive !== undefined) updateData.isActive = Number(isActive);
  if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

  const [updated] = await db
    .update(bookingServicesTable)
    .set(updateData)
    .where(eq(bookingServicesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Layanan tidak ditemukan" });
    return;
  }
  res.json(updated);
});

router.delete("/booking-services/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: "ID layanan tidak valid" });
    return;
  }
  const [deleted] = await db
    .delete(bookingServicesTable)
    .where(eq(bookingServicesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Layanan tidak ditemukan" });
    return;
  }
  res.sendStatus(204);
});

// NIDI & SLO Tariffs Endpoints
router.get("/nidi-slo-tariffs", async (req, res): Promise<void> => {
  const activeOnly = req.query.activeOnly === "true";
  let tariffs = await db
    .select()
    .from(nidiSloTariffsTable)
    .where(activeOnly ? eq(nidiSloTariffsTable.isActive, 1) : undefined)
    .orderBy(asc(nidiSloTariffsTable.sortOrder), asc(nidiSloTariffsTable.powerVa));

  if (tariffs.length === 0 && !activeOnly) {
    // Auto-seed default 24 tariffs if empty
    await db.insert(nidiSloTariffsTable).values(
      DEFAULT_NIDI_SLO_TARIFFS.map((t) => ({
        ...t,
        isActive: 1,
      }))
    );
    tariffs = await db
      .select()
      .from(nidiSloTariffsTable)
      .orderBy(asc(nidiSloTariffsTable.sortOrder), asc(nidiSloTariffsTable.powerVa));
  }

  res.json(tariffs);
});

router.post("/nidi-slo-tariffs/reset-defaults", async (_req, res): Promise<void> => {
  try {
    // Delete existing and re-seed all 24 tariffs
    await db.delete(nidiSloTariffsTable);
    const seeded = await db
      .insert(nidiSloTariffsTable)
      .values(
        DEFAULT_NIDI_SLO_TARIFFS.map((t) => ({
          ...t,
          isActive: 1,
        }))
      )
      .returning();

    seeded.sort((a, b) => a.sortOrder - b.sortOrder);
    res.json(seeded);
  } catch (err: any) {
    console.error("[Tariff Reset] Error resetting tariffs:", err);
    res.status(500).json({ error: err?.message || "Gagal mereset data tarif NIDI & SLO" });
  }
});

router.post("/nidi-slo-tariffs", async (req, res): Promise<void> => {
  const { sortOrder, powerVa, powerLabel, sloFee, nidiFee, totalFee, notes, isActive } = req.body;
  if (!powerVa || !powerLabel) {
    res.status(400).json({ error: "Daya (VA) dan label daya wajib diisi" });
    return;
  }
  const slo = Number(sloFee || 0);
  const nidi = Number(nidiFee || 0);
  const total = totalFee !== undefined ? Number(totalFee) : slo + nidi;

  const [created] = await db
    .insert(nidiSloTariffsTable)
    .values({
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      powerVa: Number(powerVa),
      powerLabel: String(powerLabel).trim(),
      sloFee: slo,
      nidiFee: nidi,
      totalFee: total,
      notes: notes?.trim() || null,
      isActive: isActive !== undefined ? Number(isActive) : 1,
    })
    .returning();
  res.status(201).json(created);
});

router.put("/nidi-slo-tariffs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: "ID tarif tidak valid" });
    return;
  }
  const { sortOrder, powerVa, powerLabel, sloFee, nidiFee, totalFee, notes, isActive } = req.body;
  const updateData: any = {};
  if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
  if (powerVa !== undefined) updateData.powerVa = Number(powerVa);
  if (powerLabel !== undefined) updateData.powerLabel = String(powerLabel).trim();
  if (sloFee !== undefined) updateData.sloFee = Number(sloFee);
  if (nidiFee !== undefined) updateData.nidiFee = Number(nidiFee);
  if (totalFee !== undefined) {
    updateData.totalFee = Number(totalFee);
  } else if (sloFee !== undefined || nidiFee !== undefined) {
    const slo = sloFee !== undefined ? Number(sloFee) : 0;
    const nidi = nidiFee !== undefined ? Number(nidiFee) : 0;
    updateData.totalFee = slo + nidi;
  }
  if (notes !== undefined) updateData.notes = notes?.trim() || null;
  if (isActive !== undefined) updateData.isActive = Number(isActive);

  const [updated] = await db
    .update(nidiSloTariffsTable)
    .set(updateData)
    .where(eq(nidiSloTariffsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Tarif NIDI & SLO tidak ditemukan" });
    return;
  }
  res.json(updated);
});

router.delete("/nidi-slo-tariffs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: "ID tarif tidak valid" });
    return;
  }
  const [deleted] = await db
    .delete(nidiSloTariffsTable)
    .where(eq(nidiSloTariffsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Tarif NIDI & SLO tidak ditemukan" });
    return;
  }
  res.sendStatus(204);
});

export default router;