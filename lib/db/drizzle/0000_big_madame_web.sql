CREATE TABLE "booking_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"step_number" text DEFAULT '01' NOT NULL,
	"title" text DEFAULT 'Ajukan kunjungan' NOT NULL,
	"subtitle" text DEFAULT 'Isi detail singkat, kami lanjutkan lewat WhatsApp.' NOT NULL,
	"visit_fee" integer DEFAULT 25000 NOT NULL,
	"visit_fee_note" text DEFAULT 'dibayar di muka' NOT NULL,
	"button_text" text DEFAULT 'Lanjut ke pembayaran' NOT NULL,
	"admin_whatsapp" text DEFAULT '6281112345678' NOT NULL,
	"name_placeholder" text DEFAULT 'Contoh: Sinta Rahma' NOT NULL,
	"phone_placeholder" text DEFAULT '08xx xxxx xxxx' NOT NULL,
	"phone_hint" text DEFAULT 'Gunakan nomor yang aktif menerima pesan' NOT NULL,
	"address_placeholder" text DEFAULT 'Alamat lengkap, patokan, dan lantai bila ada' NOT NULL,
	"gps_button_text" text DEFAULT 'Ambil lokasi GPS' NOT NULL,
	"gps_hint" text DEFAULT 'Bagikan lokasi agar teknisi menemukan alamat dengan tepat' NOT NULL,
	"notes_placeholder" text DEFAULT 'Keluhan, waktu yang diinginkan...' NOT NULL,
	"notes_hint" text DEFAULT 'Opsional' NOT NULL,
	"enable_gps" integer DEFAULT 1 NOT NULL,
	"enable_notes" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'Umum' NOT NULL,
	"description" text,
	"estimated_price" integer,
	"estimated_duration" text,
	"icon" text DEFAULT 'Wrench',
	"is_active" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"password" text,
	"role" text DEFAULT 'worker' NOT NULL,
	"specialty" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"worker_name" text NOT NULL,
	"item" text NOT NULL,
	"quantity" integer NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"notes" text NOT NULL,
	"media" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"customer_name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"address" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"service_type" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'waiting_payment' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"visit_fee" integer DEFAULT 25000 NOT NULL,
	"repair_cost" integer,
	"assigned_worker_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"request_code" text NOT NULL,
	"customer_name" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
