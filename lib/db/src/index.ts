import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import path from "path";
import fs from "fs";
import * as schema from "./schema/index.js";

let dbInstance: any = null;
let poolInstance: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS dashboard_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'worker',
    specialty TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS password TEXT;
  CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    service_type TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'waiting_payment',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    visit_fee INTEGER NOT NULL DEFAULT 25000,
    repair_cost INTEGER,
    assigned_worker_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    request_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS equipment_requests (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL,
    worker_name TEXT NOT NULL,
    item TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS field_reports (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    notes TEXT NOT NULL,
    media TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS booking_services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Umum',
    description TEXT,
    estimated_price INTEGER,
    estimated_duration TEXT,
    icon TEXT DEFAULT 'Wrench',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS booking_config (
    id SERIAL PRIMARY KEY,
    step_number TEXT NOT NULL DEFAULT '01',
    title TEXT NOT NULL DEFAULT 'Ajukan kunjungan',
    subtitle TEXT NOT NULL DEFAULT 'Isi detail singkat, kami lanjutkan lewat WhatsApp.',
    visit_fee INTEGER NOT NULL DEFAULT 25000,
    visit_fee_note TEXT NOT NULL DEFAULT 'dibayar di muka',
    button_text TEXT NOT NULL DEFAULT 'Lanjut ke pembayaran',
    admin_whatsapp TEXT NOT NULL DEFAULT '6281112345678',
    name_placeholder TEXT NOT NULL DEFAULT 'Contoh: Sinta Rahma',
    phone_placeholder TEXT NOT NULL DEFAULT '08xx xxxx xxxx',
    phone_hint TEXT NOT NULL DEFAULT 'Gunakan nomor yang aktif menerima pesan',
    address_placeholder TEXT NOT NULL DEFAULT 'Alamat lengkap, patokan, dan lantai bila ada',
    gps_button_text TEXT NOT NULL DEFAULT 'Ambil lokasi GPS',
    gps_hint TEXT NOT NULL DEFAULT 'Bagikan lokasi agar teknisi menemukan alamat dengan tepat',
    notes_placeholder TEXT NOT NULL DEFAULT 'Keluhan, waktu yang diinginkan...',
    notes_hint TEXT NOT NULL DEFAULT 'Opsional',
    enable_gps INTEGER NOT NULL DEFAULT 1,
    enable_notes INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS nidi_slo_tariffs (
    id SERIAL PRIMARY KEY,
    sort_order INTEGER NOT NULL DEFAULT 0,
    power_va INTEGER NOT NULL,
    power_label TEXT NOT NULL,
    slo_fee INTEGER NOT NULL,
    nidi_fee INTEGER NOT NULL,
    total_fee INTEGER NOT NULL,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS province TEXT;
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS regency TEXT;
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS district TEXT;
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS village TEXT;
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS power_va INTEGER;
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS slo_fee INTEGER;
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS nidi_fee INTEGER;
  ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS total_amount INTEGER;
  CREATE TABLE IF NOT EXISTS provinces (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS regencies (
    id SERIAL PRIMARY KEY,
    province_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'kabupaten',
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    regency_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS villages (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'desa',
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS landing_cms (
    id SERIAL PRIMARY KEY,
    navbar JSONB NOT NULL,
    flow JSONB NOT NULL,
    hero JSONB NOT NULL,
    assurance JSONB NOT NULL,
    footer JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_id TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paywuz_id TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_number TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_url TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_payment INTEGER;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee INTEGER;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paywuz_status TEXT;
`;

const dataDir = path.resolve(process.cwd(), ".data/pglite");

export async function initDb(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    for (const envFile of [".env", ".env.example"]) {
      const fullPath = path.resolve(process.cwd(), envFile);
      if (fs.existsSync(fullPath)) {
        try {
          if (typeof process.loadEnvFile === "function") {
            process.loadEnvFile(fullPath);
          }
        } catch {}
        if (process.env.DATABASE_URL) break;
      }
    }
  }

  const rawUrl = process.env.DATABASE_URL?.trim();
  const isLocalHostDb = Boolean(
    rawUrl && (rawUrl.includes("@localhost") || rawUrl.includes("@127.0.0.1") || rawUrl.includes("://localhost") || rawUrl.includes("://127.0.0.1"))
  );

  if (rawUrl && !isLocalHostDb) {
    let testPool: pg.Pool | null = null;
    try {
      testPool = new pg.Pool({
        connectionString: rawUrl,
        connectionTimeoutMillis: 3000,
        ssl: rawUrl.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      });
      testPool.on("error", () => {
        // Guard against uncaught background errors
      });

      const client = await testPool.connect();
      await client.query("SELECT 1");
      client.release();
      await testPool.query(SCHEMA_DDL);

      poolInstance = testPool;
      dbInstance = drizzlePg(poolInstance, { schema });
      console.log("[DB] Connected successfully to remote PostgreSQL via DATABASE_URL");
      return;
    } catch (err: any) {
      if (testPool) {
        try {
          await testPool.end();
        } catch {}
      }
      poolInstance = null;
      console.log(`[DB] Remote PostgreSQL is not reachable (${err?.code || err?.message || 'offline'}). Using local persistent PGlite storage.`);
    }
  } else if (isLocalHostDb) {
    console.log("[DB] Notice: DATABASE_URL is configured for local machine (localhost). In cloud environment, using persistent embedded PostgreSQL (PGlite).");
  }

  if (!pgliteInstance) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.exec(SCHEMA_DDL);
    dbInstance = drizzlePglite(pgliteInstance, { schema });
    console.log("[DB] Persistent PGlite database ready at", dataDir);
  }
}

function ensureDbInstance(): any {
  if (!dbInstance) {
    if (!pgliteInstance) {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      pgliteInstance = new PGlite(dataDir);
      pgliteInstance.exec(SCHEMA_DDL).catch((err) => {
        console.error("[DB] Error executing initial DDL:", err);
      });
      dbInstance = drizzlePglite(pgliteInstance, { schema });
    }
  }
  return dbInstance;
}

export const db: any = new Proxy({}, {
  get(_target, prop) {
    const inst = ensureDbInstance();
    const val = inst[prop];
    return typeof val === "function" ? val.bind(inst) : val;
  }
});

export const pool = poolInstance;
export * from "./schema/index.js";

