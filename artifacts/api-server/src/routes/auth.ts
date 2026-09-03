import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dashboardUsersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email dan kata sandi wajib diisi." });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const envAdminEmail = (process.env.ADMIN_EMAIL || "admin@acc.co.id").trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || "password123";

    // 1. Check primary administrator from .env configuration
    if (cleanEmail === envAdminEmail && cleanPassword === envAdminPassword) {
      res.json({
        success: true,
        token: `seiiki-admin-token-${Date.now()}`,
        user: {
          id: 1,
          name: "Admin SEIIKI",
          email: envAdminEmail,
          role: "admin",
          phone: "0811 8899 0011",
        },
      });
      return;
    }

    // 2. Check users in database
    const users = await db.select().from(dashboardUsersTable);
    const matchedUser = users.find((u: any) => {
      const uEmail = (u.email || "").trim().toLowerCase();
      const uPhone = (u.phone || "").replace(/\D/g, "");
      const cleanPhone = cleanEmail.replace(/\D/g, "");
      const uName = (u.name || "").trim().toLowerCase();
      const slugName = uName.replace(/\s+/g, "");
      const firstName = uName.split(/\s+/)[0];

      const isEmailOrPhoneMatch =
        (uEmail && uEmail === cleanEmail) ||
        (cleanPhone.length >= 8 && uPhone === cleanPhone) ||
        uName === cleanEmail ||
        slugName === cleanEmail ||
        `${slugName}@seiiki.id` === cleanEmail ||
        `${firstName}@seiiki.id` === cleanEmail ||
        `${firstName}@acc.co.id` === cleanEmail;

      if (!isEmailOrPhoneMatch) return false;

      // Match password if configured on user record or default worker password
      if (u.password) {
        return u.password === cleanPassword;
      }
      return cleanPassword === "password123" || cleanPassword === "admin123" || cleanPassword === "pekerja123";
    });

    if (matchedUser && matchedUser.status === "active") {
      res.json({
        success: true,
        token: `seiiki-user-token-${matchedUser.id}-${Date.now()}`,
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email || `${matchedUser.name.toLowerCase().replace(/\s+/g, "")}@seiiki.id`,
          role: matchedUser.role,
          phone: matchedUser.phone,
          specialty: matchedUser.specialty,
        },
      });
      return;
    }

    res.status(401).json({
      error: "Email atau kata sandi tidak valid. Silakan periksa kembali kredensial Anda.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Terjadi kesalahan internal server." });
  }
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true, message: "Berhasil keluar dari sistem." });
});

router.get("/auth/session", (req, res): void => {
  const envAdminEmail = (process.env.ADMIN_EMAIL || "admin@acc.co.id").trim().toLowerCase();
  res.json({
    adminConfiguredEmail: envAdminEmail,
    status: "ready",
  });
});

export default router;
