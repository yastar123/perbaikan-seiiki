import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

let dbInstance: any = null;
let poolInstance: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS dashboard_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'worker',
    specialty TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
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
`;

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

  if (process.env.DATABASE_URL) {
    try {
      poolInstance = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      await poolInstance.query("SELECT 1");
      await poolInstance.query(SCHEMA_DDL);
      dbInstance = drizzlePg(poolInstance, { schema });
      console.log("[DB] Connected to PostgreSQL via DATABASE_URL");
      return;
    } catch (err) {
      console.warn("[DB] Failed to connect to DATABASE_URL, falling back to in-memory PGlite:", err);
    }
  }

  if (!pgliteInstance) {
    console.log("[DB] Initializing in-memory PGlite database...");
    pgliteInstance = new PGlite();
    await pgliteInstance.exec(SCHEMA_DDL);
    dbInstance = drizzlePglite(pgliteInstance, { schema });
    console.log("[DB] In-memory database initialized successfully.");
  }
}

function ensureDbInstance(): any {
  if (!dbInstance) {
    if (!pgliteInstance) {
      pgliteInstance = new PGlite();
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
export * from "./schema";

