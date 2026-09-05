import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, serviceRequestsTable, transactionsTable } from "@workspace/db";
import {
  fetchPaywuzPaymentMethods,
  createPaywuzTransaction,
  getPaywuzTransaction,
  cancelPaywuzTransaction,
  verifyPaywuzWebhookSignature,
  getPaywuzApiKey,
  isPaywuzConfigured,
  type PaywuzPaymentMethod,
} from "../lib/paywuz";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory cache for payment methods to respect Paywuz rate-limit (120 req/min)
let cachedMethods: PaywuzPaymentMethod[] | null = null;
let cachedMethodsTime = 0;
const CACHE_TTL_MS = 60 * 1000;

// GET /api/paywuz/config
router.get("/paywuz/config", async (_req: Request, res: Response): Promise<void> => {
  const apiKey = getPaywuzApiKey();
  const configured = apiKey.length > 0;
  const isLive = apiKey.startsWith("pk_live_");
  const isSand = apiKey.startsWith("pk_sand_");
  const mode = isLive ? "live" : isSand ? "sandbox" : configured ? "custom" : "none";

  res.json({
    configured,
    mode,
    maskedKey: configured ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : null,
  });
});

// GET /api/paywuz/payment-methods
router.get("/paywuz/payment-methods", async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = Date.now();
    if (cachedMethods && now - cachedMethodsTime < CACHE_TTL_MS) {
      res.json({ data: cachedMethods, cached: true });
      return;
    }

    const methods = await fetchPaywuzPaymentMethods();
    cachedMethods = methods;
    cachedMethodsTime = now;

    res.json({ data: methods });
  } catch (err: any) {
    logger.error({ err }, "Error fetching Paywuz payment methods");

    // Fallback if rate limited or temporary network error
    if (cachedMethods) {
      res.json({ data: cachedMethods, stale: true });
      return;
    }

    // Default Indonesian popular methods as fallback
    const fallbackMethods: PaywuzPaymentMethod[] = [
      {
        code: "QRIS",
        name: "QRIS (Semua E-Wallet & Bank)",
        type: "qris",
        fee: { flatIdr: 290, percentBps: 70, totalIdr: 290 },
        limits: { minIdr: 1000, maxIdr: 10000000 },
      },
      {
        code: "VA",
        name: "Virtual Account (Pilih Bank)",
        type: "meta",
        fee: { flatIdr: 0, percentBps: 0, totalIdr: 0 },
        limits: { minIdr: 10000, maxIdr: 50000000 },
      },
      {
        code: "BCAVA",
        name: "BCA Virtual Account",
        type: "virtual_account",
        fee: { flatIdr: 4900, percentBps: 0, totalIdr: 4900 },
        limits: { minIdr: 10000, maxIdr: 50000000 },
      },
      {
        code: "MANDIRIVA",
        name: "Mandiri Virtual Account",
        type: "virtual_account",
        fee: { flatIdr: 3400, percentBps: 0, totalIdr: 3400 },
        limits: { minIdr: 10000, maxIdr: 50000000 },
      },
      {
        code: "BNIVA",
        name: "BNI Virtual Account",
        type: "virtual_account",
        fee: { flatIdr: 3400, percentBps: 0, totalIdr: 3400 },
        limits: { minIdr: 10000, maxIdr: 50000000 },
      },
      {
        code: "BRIVA",
        name: "BRI Virtual Account",
        type: "virtual_account",
        fee: { flatIdr: 3400, percentBps: 0, totalIdr: 3400 },
        limits: { minIdr: 10000, maxIdr: 50000000 },
      },
    ];

    res.json({
      data: fallbackMethods,
      warning: err?.message || "Menggunakan fallback metode pembayaran",
    });
  }
});

// POST /api/paywuz/create-transaction
router.post("/paywuz/create-transaction", async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId, paymentMethod = "QRIS", redirectUrl } = req.body;

    if (!requestId) {
      res.status(400).json({ error: "requestId wajib disertakan" });
      return;
    }

    const [request] = await db
      .select()
      .from(serviceRequestsTable)
      .where(eq(serviceRequestsTable.id, Number(requestId)))
      .limit(1);

    if (!request) {
      res.status(404).json({ error: "Permintaan layanan tidak ditemukan" });
      return;
    }

    // Determine payment amount and transaction type
    const isNidiSlo =
      request.serviceType?.toLowerCase().includes("slo") ||
      request.serviceType?.toLowerCase().includes("nidi");
    const amount =
      isNidiSlo && (request.totalAmount || (request as any).totalFee)
        ? Number(request.totalAmount || (request as any).totalFee)
        : request.visitFee || 25000;
    const txType = isNidiSlo ? "nidi_slo_fee" : "visit_fee";

    // Check if an existing pending Paywuz transaction exists for this request
    const [existingTx] = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.requestId, request.id),
          eq(transactionsTable.status, "pending")
        )
      )
      .orderBy(desc(transactionsTable.createdAt))
      .limit(1);

    // If existing transaction is valid and matches paymentMethod, we can check status or return it
    if (existingTx && existingTx.orderId && existingTx.paymentMethod === paymentMethod) {
      if (existingTx.expiresAt && new Date(existingTx.expiresAt).getTime() > Date.now()) {
        res.json({
          success: true,
          data: {
            id: existingTx.paywuzId,
            orderId: existingTx.orderId,
            amount: existingTx.amount,
            totalPayment: existingTx.totalPayment || existingTx.amount,
            paymentMethod: existingTx.paymentMethod,
            paymentNumber: existingTx.paymentNumber,
            paymentUrl: existingTx.paymentUrl,
            status: existingTx.status,
            expiresAt: existingTx.expiresAt,
            customerName: request.customerName,
            requestCode: request.code,
          },
        });
        return;
      }
    }

    // Generate unique orderId (1–64 characters)
    // Example: SEIIKI-REQ123-K7X9
    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    const orderId = `SEIIKI-${request.code}-${suffix}`.slice(0, 64);

    const paywuzRes = await createPaywuzTransaction({
      orderId,
      amount,
      paymentMethod,
      expiryMinutes: paymentMethod === "QRIS" ? 60 : 720,
      redirectUrl: redirectUrl || undefined,
      metadata: {
        requestId: request.id,
        requestCode: request.code,
        customerName: request.customerName,
        customerPhone: request.whatsapp,
        serviceType: request.serviceType,
      },
    });

    // Record in local transactions table
    const [newTx] = await db
      .insert(transactionsTable)
      .values({
        requestId: request.id,
        requestCode: request.code,
        customerName: request.customerName,
        type: txType,
        amount,
        status: paywuzRes.status === "success" ? "paid" : "pending",
        orderId: paywuzRes.orderId,
        paywuzId: paywuzRes.id,
        paymentMethod: paywuzRes.paymentMethod,
        paymentNumber: paywuzRes.paymentNumber,
        paymentUrl: paywuzRes.paymentUrl,
        totalPayment: paywuzRes.totalPayment,
        fee:
          typeof paywuzRes.fee === "object" && paywuzRes.fee !== null
            ? (paywuzRes.fee.totalIdr ?? (paywuzRes.totalPayment - paywuzRes.amount))
            : typeof paywuzRes.fee === "number"
            ? paywuzRes.fee
            : paywuzRes.totalPayment - paywuzRes.amount,
        expiresAt: paywuzRes.expiresAt ? new Date(paywuzRes.expiresAt) : null,
        paywuzStatus: paywuzRes.status,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        id: paywuzRes.id,
        orderId: paywuzRes.orderId,
        amount: paywuzRes.amount,
        totalPayment: paywuzRes.totalPayment,
        paymentMethod: paywuzRes.paymentMethod,
        paymentNumber: paywuzRes.paymentNumber,
        paymentUrl: paywuzRes.paymentUrl,
        status: paywuzRes.status,
        expiresAt: paywuzRes.expiresAt,
        customerName: request.customerName,
        requestCode: request.code,
        localTxId: newTx.id,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Error creating Paywuz transaction");
    res.status(500).json({
      error: "Gagal membuat transaksi pembayaran Paywuz",
      message: err?.message || String(err),
    });
  }
});

// GET /api/paywuz/status/:orderId
router.get("/paywuz/status/:orderId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({ error: "orderId diperlukan" });
      return;
    }

    const paywuzData = await getPaywuzTransaction(orderId);

    const isPaid =
      paywuzData.status === "success" ||
      paywuzData.status === "settlement" ||
      paywuzData.status === "paid";

    if (isPaid) {
      // Update transaction in DB
      await db
        .update(transactionsTable)
        .set({
          status: "paid",
          paidAt: paywuzData.paidAt ? new Date(paywuzData.paidAt) : new Date(),
          paywuzStatus: paywuzData.status,
          paymentNumber: paywuzData.paymentNumber || undefined,
        })
        .where(eq(transactionsTable.orderId, orderId));

      // Update service request
      const [tx] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.orderId, orderId))
        .limit(1);

      if (tx) {
        await db
          .update(serviceRequestsTable)
          .set({ paymentStatus: "paid", status: "paid" })
          .where(eq(serviceRequestsTable.id, tx.requestId));
      }
    } else if (paywuzData.status === "cancelled" || paywuzData.status === "failed") {
      await db
        .update(transactionsTable)
        .set({
          status: paywuzData.status === "cancelled" ? "cancelled" : "failed",
          paywuzStatus: paywuzData.status,
        })
        .where(eq(transactionsTable.orderId, orderId));
    }

    res.json({
      success: true,
      data: paywuzData,
      isPaid,
    });
  } catch (err: any) {
    logger.error({ err }, `Error checking Paywuz status for order ${req.params.orderId}`);
    res.status(500).json({
      error: "Gagal memeriksa status pembayaran Paywuz",
      message: err?.message || String(err),
    });
  }
});

// POST /api/paywuz/cancel/:orderId
router.post("/paywuz/cancel/:orderId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const cancelRes = await cancelPaywuzTransaction(orderId);

    await db
      .update(transactionsTable)
      .set({ status: "cancelled", paywuzStatus: "cancelled" })
      .where(eq(transactionsTable.orderId, orderId));

    res.json({ success: true, data: cancelRes });
  } catch (err: any) {
    logger.error({ err }, "Error cancelling Paywuz transaction");
    res.status(500).json({
      error: "Gagal membatalkan transaksi",
      message: err?.message || String(err),
    });
  }
});

// POST /api/paywuz/webhook
router.post("/paywuz/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers["x-paywuz-signature"] as string | undefined;
    const eventName = req.headers["x-paywuz-event"] as string | undefined;
    const deliveryId = req.headers["x-paywuz-delivery"] as string | undefined;
    const apiKey = getPaywuzApiKey();

    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

    // Verify signature
    const isValid = verifyPaywuzWebhookSignature(rawBody, signature, apiKey);
    if (!isValid && apiKey) {
      logger.warn({ signature, deliveryId }, "Paywuz webhook signature verification failed");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const payload = req.body;
    const event = eventName || payload.event;
    const data = payload.data;

    logger.info({ event, orderId: data?.orderId, deliveryId }, "Paywuz webhook received");

    if (data && data.orderId) {
      if (event === "transaction.paid" || event === "transaction.settlement" || data.status === "success") {
        // Mark transaction as paid
        await db
          .update(transactionsTable)
          .set({
            status: "paid",
            paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
            paywuzStatus: data.status,
            totalPayment: data.totalPayment,
            fee: data.fee,
          })
          .where(eq(transactionsTable.orderId, data.orderId));

        const [tx] = await db
          .select()
          .from(transactionsTable)
          .where(eq(transactionsTable.orderId, data.orderId))
          .limit(1);

        if (tx) {
          await db
            .update(serviceRequestsTable)
            .set({ paymentStatus: "paid", status: "paid" })
            .where(eq(serviceRequestsTable.id, tx.requestId));
          logger.info({ requestId: tx.requestId, orderId: data.orderId }, "Service request payment confirmed via Paywuz webhook");
        }
      } else if (event === "transaction.failed" || data.status === "failed") {
        await db
          .update(transactionsTable)
          .set({ status: "failed", paywuzStatus: "failed" })
          .where(eq(transactionsTable.orderId, data.orderId));
      } else if (event === "transaction.cancelled" || data.status === "cancelled") {
        await db
          .update(transactionsTable)
          .set({ status: "cancelled", paywuzStatus: "cancelled" })
          .where(eq(transactionsTable.orderId, data.orderId));
      }
    }

    // Acknowledge quickly within 15 seconds
    res.status(200).json({ received: true, event });
  } catch (err: any) {
    logger.error({ err }, "Error processing Paywuz webhook");
    res.status(500).json({ error: "Webhook processing error" });
  }
});

export default router;
