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

export type DashboardUser = typeof dashboardUsersTable.$inferSelect;
export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type EquipmentRequest = typeof equipmentRequestsTable.$inferSelect;
export type FieldReport = typeof fieldReportsTable.$inferSelect;
export type InsertDashboardUser = z.infer<typeof insertDashboardUserSchema>;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;