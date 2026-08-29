import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const dashboardUsersTable = pgTable("dashboard_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull().default("worker"),
  specialty: text("specialty"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const serviceRequestsTable = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  customerName: text("customer_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  serviceType: text("service_type").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("waiting_payment"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  visitFee: integer("visit_fee").notNull().default(25000),
  repairCost: integer("repair_cost"),
  assignedWorkerId: integer("assigned_worker_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  requestCode: text("request_code").notNull(),
  customerName: text("customer_name").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("paid"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const equipmentRequestsTable = pgTable("equipment_requests", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  workerName: text("worker_name").notNull(),
  item: text("item").notNull(),
  quantity: integer("quantity").notNull(),
  urgency: text("urgency").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const fieldReportsTable = pgTable("field_reports", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  notes: text("notes").notNull(),
  media: text("media").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookingServicesTable = pgTable("booking_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Umum"),
  description: text("description"),
  estimatedPrice: integer("estimated_price"),
  estimatedDuration: text("estimated_duration"),
  icon: text("icon").default("Wrench"),
  isActive: integer("is_active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookingConfigTable = pgTable("booking_config", {
  id: serial("id").primaryKey(),
  stepNumber: text("step_number").notNull().default("01"),
  title: text("title").notNull().default("Ajukan kunjungan"),
  subtitle: text("subtitle").notNull().default("Isi detail singkat, kami lanjutkan lewat WhatsApp."),
  visitFee: integer("visit_fee").notNull().default(25000),
  visitFeeNote: text("visit_fee_note").notNull().default("dibayar di muka"),
  buttonText: text("button_text").notNull().default("Lanjut ke pembayaran"),
  adminWhatsapp: text("admin_whatsapp").notNull().default("6281112345678"),
  namePlaceholder: text("name_placeholder").notNull().default("Contoh: Sinta Rahma"),
  phonePlaceholder: text("phone_placeholder").notNull().default("08xx xxxx xxxx"),
  phoneHint: text("phone_hint").notNull().default("Gunakan nomor yang aktif menerima pesan"),
  addressPlaceholder: text("address_placeholder").notNull().default("Alamat lengkap, patokan, dan lantai bila ada"),
  gpsButtonText: text("gps_button_text").notNull().default("Ambil lokasi GPS"),
  gpsHint: text("gps_hint").notNull().default("Bagikan lokasi agar teknisi menemukan alamat dengan tepat"),
  notesPlaceholder: text("notes_placeholder").notNull().default("Keluhan, waktu yang diinginkan..."),
  notesHint: text("notes_hint").notNull().default("Opsional"),
  enableGps: integer("enable_gps").notNull().default(1),
  enableNotes: integer("enable_notes").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDashboardUserSchema = createInsertSchema(
  dashboardUsersTable,
).omit({ id: true, createdAt: true });
export const insertServiceRequestSchema = createInsertSchema(
  serviceRequestsTable,
).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(
  transactionsTable,
).omit({ id: true, createdAt: true });
export const insertEquipmentRequestSchema = createInsertSchema(
  equipmentRequestsTable,
).omit({ id: true, createdAt: true });
export const insertFieldReportSchema = createInsertSchema(
  fieldReportsTable,
).omit({ id: true, createdAt: true });
export const insertBookingServiceSchema = createInsertSchema(
  bookingServicesTable,
).omit({ id: true, createdAt: true });
export const insertBookingConfigSchema = createInsertSchema(
  bookingConfigTable,
).omit({ id: true, updatedAt: true });

export type DashboardUser = typeof dashboardUsersTable.$inferSelect;
export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type EquipmentRequest = typeof equipmentRequestsTable.$inferSelect;
export type FieldReport = typeof fieldReportsTable.$inferSelect;
export type BookingService = typeof bookingServicesTable.$inferSelect;
export type BookingConfig = typeof bookingConfigTable.$inferSelect;
export type InsertDashboardUser = z.infer<typeof insertDashboardUserSchema>;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type InsertBookingService = z.infer<typeof insertBookingServiceSchema>;
export type InsertBookingConfig = z.infer<typeof insertBookingConfigSchema>;