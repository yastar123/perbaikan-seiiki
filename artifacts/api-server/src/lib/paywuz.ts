import crypto from "crypto";

const PAYWUZ_BASE_URL = "https://api.paywuz.id/v1";

export interface PaywuzPaymentMethod {
  code: string;
  name: string;
  type: "qris" | "virtual_account" | "meta" | "retail" | string;
  fee: {
    flatIdr: number;
    percentBps: number;
    totalIdr: number;
  };
  limits: {
    minIdr: number;
    maxIdr: number;
  };
}

export interface PaywuzTransactionResponse {
  id: string;
  orderId: string;
  amount: number;
  totalPayment: number;
  fee?: {
    baseIdr?: number;
    discountIdr?: number;
    totalIdr?: number;
  } | number;
  paymentMethod: string;
  paymentNumber: string | null;
  paymentUrl: string;
  status: "pending" | "settlement" | "success" | "failed" | "cancelled" | string;
  paidAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export function getPaywuzApiKey(): string {
  const key =
    process.env.API_KEY_PAYWUZ ||
    process.env.PAYWUZ_API_KEY ||
    process.env.VITE_API_KEY_PAYWUZ ||
    "";
  return key.trim();
}

export function isPaywuzConfigured(): boolean {
  return getPaywuzApiKey().length > 0;
}

export async function fetchPaywuzPaymentMethods(): Promise<PaywuzPaymentMethod[]> {
  const apiKey = getPaywuzApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_PAYWUZ belum dikonfigurasi di file .env");
  }

  const res = await fetch(`${PAYWUZ_BASE_URL}/payment-methods`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let errorDetail = text;
    try {
      const json = JSON.parse(text);
      errorDetail = json.message || json.error || text;
    } catch {}
    throw new Error(`Paywuz GET /payment-methods gagal (${res.status}): ${errorDetail}`);
  }

  const data = (await res.json()) as { data: PaywuzPaymentMethod[] };
  return data.data || [];
}

export async function createPaywuzTransaction(params: {
  orderId: string;
  amount: number;
  paymentMethod: string;
  expiryMinutes?: number;
  redirectUrl?: string;
  feeByMerchant?: boolean;
  metadata?: Record<string, any>;
}): Promise<PaywuzTransactionResponse> {
  const apiKey = getPaywuzApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_PAYWUZ belum dikonfigurasi di file .env");
  }

  const payload = {
    orderId: params.orderId,
    amount: Math.round(params.amount),
    paymentMethod: params.paymentMethod,
    expiryMinutes: params.expiryMinutes || (params.paymentMethod === "QRIS" ? 60 : 720),
    ...(params.redirectUrl ? { redirectUrl: params.redirectUrl } : {}),
    ...(typeof params.feeByMerchant === "boolean" ? { feeByMerchant: params.feeByMerchant } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  const res = await fetch(`${PAYWUZ_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Paywuz respons tidak valid (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok && res.status !== 200 && res.status !== 201) {
    const errCode = json.error || "payment_error";
    const errMsg = json.message || "Gagal membuat transaksi di Paywuz";
    throw new Error(`[${errCode}] ${errMsg}`);
  }

  return json.data as PaywuzTransactionResponse;
}

export async function getPaywuzTransaction(orderId: string): Promise<PaywuzTransactionResponse> {
  const apiKey = getPaywuzApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_PAYWUZ belum dikonfigurasi di file .env");
  }

  const res = await fetch(`${PAYWUZ_BASE_URL}/transactions/${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let errMsg = text;
    try {
      const json = JSON.parse(text);
      errMsg = json.message || json.error || text;
    } catch {}
    throw new Error(`Paywuz cek status gagal (${res.status}): ${errMsg}`);
  }

  const json = await res.json();
  return json.data as PaywuzTransactionResponse;
}

export async function cancelPaywuzTransaction(orderId: string): Promise<any> {
  const apiKey = getPaywuzApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_PAYWUZ belum dikonfigurasi di file .env");
  }

  const res = await fetch(`${PAYWUZ_BASE_URL}/transactions/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const json = await res.json();
  return json.data;
}

export function verifyPaywuzWebhookSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  apiKey: string
): boolean {
  if (!signature || !apiKey) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", apiKey).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
