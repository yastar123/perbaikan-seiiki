import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  jsonb,
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
  email: text("email"),
  password: text("password"),
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
  province: text("province"),
  regency: text("regency"),
  district: text("district"),
  village: text("village"),
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

export const provincesTable = pgTable("provinces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const regenciesTable = pgTable("regencies", {
  id: serial("id").primaryKey(),
  provinceId: integer("province_id").notNull(),
  type: text("type").notNull().default("kabupaten"), // 'kabupaten' | 'kota'
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const districtsTable = pgTable("districts", {
  id: serial("id").primaryKey(),
  regencyId: integer("regency_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const villagesTable = pgTable("villages", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull(),
  type: text("type").notNull().default("desa"), // 'desa' | 'kelurahan'
  name: text("name").notNull(),
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
  orderId: text("order_id"),
  paywuzId: text("paywuz_id"),
  paymentMethod: text("payment_method"),
  paymentNumber: text("payment_number"),
  paymentUrl: text("payment_url"),
  totalPayment: integer("total_payment"),
  fee: integer("fee"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  paywuzStatus: text("paywuz_status"),
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
export const insertProvinceSchema = createInsertSchema(provincesTable).omit({ id: true, createdAt: true });
export const insertRegencySchema = createInsertSchema(regenciesTable).omit({ id: true, createdAt: true });
export const insertDistrictSchema = createInsertSchema(districtsTable).omit({ id: true, createdAt: true });
export const insertVillageSchema = createInsertSchema(villagesTable).omit({ id: true, createdAt: true });

export interface CmsNavbarLink {
  id: string;
  label: string;
  href: string;
}

export interface CmsNavbar {
  brandName: string;
  brandTagline: string;
  logoText: string;
  links: CmsNavbarLink[];
  actionText: string;
  actionHref: string;
  showAction: boolean;
}

export interface CmsHeroBadge {
  id: string;
  icon: string;
  text: string;
}

export interface CmsHero {
  enabled: boolean;
  eyebrow: string;
  titleLine1: string;
  titleLine2Accent: string;
  description: string;
  badges: CmsHeroBadge[];
}

export interface CmsFlowStep {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
}

export interface CmsFlow {
  enabled: boolean;
  eyebrow: string;
  titleLine1: string;
  titleLine2Accent: string;
  steps: CmsFlowStep[];
}

export interface CmsAssuranceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CmsAssurance {
  enabled: boolean;
  eyebrow: string;
  title: string;
  items: CmsAssuranceItem[];
}

export interface CmsFooterLink {
  id: string;
  label: string;
  href: string;
}

export interface CmsFooter {
  copyrightText: string;
  tagline: string;
  links: CmsFooterLink[];
  whatsappContact: string;
}

export interface CmsLandingContent {
  id?: number;
  navbar: CmsNavbar;
  flow: CmsFlow;
  hero: CmsHero;
  assurance: CmsAssurance;
  footer: CmsFooter;
  updatedAt?: Date | string;
}

export const landingCmsTable = pgTable("landing_cms", {
  id: serial("id").primaryKey(),
  navbar: jsonb("navbar").$type<CmsNavbar>().notNull(),
  flow: jsonb("flow").$type<CmsFlow>().notNull(),
  hero: jsonb("hero").$type<CmsHero>().notNull(),
  assurance: jsonb("assurance").$type<CmsAssurance>().notNull(),
  footer: jsonb("footer").$type<CmsFooter>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const DEFAULT_CMS_CONTENT: CmsLandingContent = {
  navbar: {
    brandName: "SEIIKI",
    brandTagline: "Solusi Energi Kelistrikan Indonesia",
    logoText: "SEIIKI",
    links: [
      { id: "1", label: "Cara kerja", href: "#alur" },
      { id: "2", label: "Jaminan kami", href: "#aman" },
    ],
    actionText: "Akses tim",
    actionHref: "/admin",
    showAction: true,
  },
  flow: {
    enabled: true,
    eyebrow: "Alur SEIIKI",
    titleLine1: "Rapi sejak",
    titleLine2Accent: "pesan pertama.",
    steps: [
      { id: "s1", stepNumber: "01", title: "Ajukan", description: "Ceritakan kebutuhan listrik dan lokasi Anda." },
      { id: "s2", stepNumber: "02", title: "Bayar kunjungan", description: "Rp 25.000 untuk biaya kedatangan teknisi." },
      { id: "s3", stepNumber: "03", title: "Kami datang", description: "Admin dan teknisi meneruskan detail lewat WhatsApp." },
    ],
  },
  hero: {
    enabled: true,
    eyebrow: "Layanan listrik yang datang siap kerja",
    titleLine1: "Masalah listrik,",
    titleLine2Accent: "kami urus.",
    description: "Teknisi terverifikasi datang ke lokasi Anda dengan alur yang jelas, biaya kunjungan pasti, dan admin yang selalu bisa dihubungi.",
    badges: [
      { id: "b1", icon: "ShieldCheck", text: "Teknisi terverifikasi" },
      { id: "b2", icon: "Clock3", text: "Respon di hari yang sama" },
    ],
  },
  assurance: {
    enabled: true,
    eyebrow: "Yang bisa Anda pegang",
    title: "Tenang, ada tim di balik setiap kunjungan.",
    items: [
      { id: "a1", icon: "ShieldCheck", title: "Teknisi terarah", description: "Penugasan disesuaikan dengan kebutuhan layanan." },
      { id: "a2", icon: "MessageCircle", title: "Admin mudah dihubungi", description: "Setelah bayar, percakapan berlanjut di WhatsApp." },
      { id: "a3", icon: "ReceiptText", title: "Biaya transparan", description: "Biaya kunjungan dipisahkan dari estimasi perbaikan." },
    ],
  },
  footer: {
    copyrightText: "© 2024 SEIIKI · PT Solusi Energi Kelistrikan Indonesia",
    tagline: "clear work · safe homes",
    links: [
      { id: "f1", label: "Hubungi Admin WhatsApp", href: "https://wa.me/6281112345678" },
      { id: "f2", label: "Masuk Dashboard Internal", href: "/login" },
    ],
    whatsappContact: "6281112345678",
  },
};

export type DashboardUser = typeof dashboardUsersTable.$inferSelect;
export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type EquipmentRequest = typeof equipmentRequestsTable.$inferSelect;
export type FieldReport = typeof fieldReportsTable.$inferSelect;
export type BookingService = typeof bookingServicesTable.$inferSelect;
export type BookingConfig = typeof bookingConfigTable.$inferSelect;
export type Province = typeof provincesTable.$inferSelect;
export type Regency = typeof regenciesTable.$inferSelect;
export type District = typeof districtsTable.$inferSelect;
export type Village = typeof villagesTable.$inferSelect;
export type LandingCms = typeof landingCmsTable.$inferSelect;
export type InsertDashboardUser = z.infer<typeof insertDashboardUserSchema>;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type InsertBookingService = z.infer<typeof insertBookingServiceSchema>;
export type InsertBookingConfig = z.infer<typeof insertBookingConfigSchema>;
export type InsertProvince = z.infer<typeof insertProvinceSchema>;
export type InsertRegency = z.infer<typeof insertRegencySchema>;
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type InsertVillage = z.infer<typeof insertVillageSchema>;