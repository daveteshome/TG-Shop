import type { Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { ENV } from "../config/env";

type TenantRequest = Request & {
  tenant?: import("@prisma/client").Tenant;
  tenantId?: string;
};

export async function resolveTenant(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const slugFromRoute = (req.params as any)?.slug as string | undefined;
    const slug = slugFromRoute || ENV.DEFAULT_TENANT_SLUG || "demo";

    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return res.status(404).json({ error: "tenant_not_found", slug });
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;

    next();
  } catch (err) {
    next(err);
  }
}
