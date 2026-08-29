import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export type DashboardRole = "admin" | "worker";

type AuthenticatedRequest = Request & {
  userId?: string;
  userRole?: DashboardRole;
};

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const userId =
    auth?.userId ||
    (auth?.sessionClaims as { userId?: string } | undefined)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Autentikasi diperlukan" });
    return;
  }
  req.userId = userId;
  const metadata = (auth?.sessionClaims as { metadata?: { role?: string } } | undefined)
    ?.metadata;
  if (metadata?.role === "admin" || metadata?.role === "worker") {
    req.userRole = metadata.role;
  }
  next();
}

export function requireRole(...roles: DashboardRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({
        error:
          "Akun belum memiliki akses role. Atur publicMetadata.role menjadi admin atau worker.",
      });
      return;
    }
    next();
  };
}