// apps/backend/src/services/tenant.util.ts
import { db } from "../lib/db";
import { ENV } from "../config/env";

let cachedDefaultTenantId: string | null = null;

export async function getTenantId(slug?: string): Promise<string> {
  if (slug && slug.trim()) {
    const t = await db.tenant.findUnique({ where: { slug } });
    if (!t) throw new Error(`Tenant not found for slug=${slug}`);
    return t.id;
  }
  // Only use default if it's configured
  if (ENV.DEFAULT_TENANT_SLUG) {
    if (cachedDefaultTenantId) return cachedDefaultTenantId;
    const t = await db.tenant.findUnique({ where: { slug: ENV.DEFAULT_TENANT_SLUG } });
    if (!t) throw new Error(`Default tenant not found for slug=${ENV.DEFAULT_TENANT_SLUG}`);
    cachedDefaultTenantId = t.id;
    return t.id;
  }
  throw new Error("No tenant slug provided and DEFAULT_TENANT_SLUG is not configured");
}

export function getTenantSlugFromReq(req: any): string | null {
  const hdr =
    (req.headers?.["x-tenant-slug"] as string) ||
    (req.headers?.["X-Tenant-Slug"] as string);
  const q = (req.query?.tenant as string) || (req.query?.slug as string);
  const p = (req.params?.slug as string);
  return (p || hdr || q || null)?.toString().trim() || null;
}
