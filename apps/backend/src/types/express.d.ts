import type { Tenant } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: Tenant;
    }
  }
}
