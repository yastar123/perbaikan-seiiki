import { and, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  dashboardUsersTable,
  equipmentRequestsTable,
  fieldReportsTable,
  serviceRequestsTable,
  transactionsTable,
} from "@workspace/db";
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
import { requireAuth, requireRole } from "../middlewares/auth";

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
    latitude: request.latitude,
    longitude: request.longitude,
    serviceType: request.serviceType,
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
    phone: user.phone,
    role: user.role as "admin" | "worker",
    status: user.status as "active" | "inactive",
  };
}

router.get("/requests", requireAuth, requireRole("admin", "worker"), async (req, res): Promise<void> => {
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

  const [request] = await db
    .insert(serviceRequestsTable)
    .values({
      ...parsed.data,
      code: `SEI-${Date.now().toString().slice(-8)}`,
      visitFee: 25000,
      status: "waiting_payment",
      paymentStatus: "unpaid",
    })
    .returning();
  res.status(201).json(await mapRequest(request));
});

router.patch("/requests/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
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
  if (parsed.data.repairCost !== undefined && parsed.data.repairCost !== null) {
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
    if (existingRepairTransaction) {
      await db
        .update(transactionsTable)
        .set({ amount: parsed.data.repairCost })
        .where(eq(transactionsTable.id, existingRepairTransaction.id));
    } else {
      await db.insert(transactionsTable).values({
        requestId: request.id,
        requestCode: request.code,
        customerName: request.customerName,
        type: "repair_fee",
        amount: parsed.data.repairCost,
        status: "pending",
      });
    }
  }
  res.json(await mapRequest(request));
});

router.delete("/requests/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
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
  res.sendStatus(204);
});

router.get("/workers", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
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

router.get("/dashboard/summary", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
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

router.get("/transactions", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
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

router.get("/equipment-requests", requireAuth, requireRole("admin", "worker"), async (_req, res): Promise<void> => {
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

router.post("/equipment-requests", requireAuth, requireRole("worker"), async (req, res): Promise<void> => {
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

router.patch("/equipment-requests/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
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

router.post("/requests/:id/reports", requireAuth, requireRole("worker"), async (req, res): Promise<void> => {
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

router.get("/users", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(dashboardUsersTable)
    .orderBy(desc(dashboardUsersTable.createdAt));
  res.json(users.map(mapUser));
});

router.post("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .insert(dashboardUsersTable)
    .values({ ...parsed.data, status: "active" })
    .returning();
  res.status(201).json(mapUser(user));
});

router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Data pengguna tidak valid" });
    return;
  }
  const [user] = await db
    .update(dashboardUsersTable)
    .set(parsed.data)
    .where(eq(dashboardUsersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(mapUser(user));
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
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

export default router;