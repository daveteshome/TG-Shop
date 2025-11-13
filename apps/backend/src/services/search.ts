// apps/backend/src/routes/search.ts
import { Router } from "express";
import { searchProductsRaw } from "../services/search.core";
import { resolveTenantIdsForScope } from "../services/search.scope";
import { db } from "../lib/db";
import { toPhotoUrl } from "../services/search.photo";
const router = Router();

// helpers
async function tenantIdFromSlug(slug?: string | null) {
  if (!slug) return null;
  const t = await db.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return t?.id ?? null;
}

router.get("/search/suggest", async (req: any, res) => {
  const q = String(req.query.q ?? "").trim();
  const scope = String(req.query.scope ?? "universal") as "universal" | "owner" | "buyer";
  const limit = Math.min(12, Number(req.query.limit ?? 8));
  const categoryId = req.query.categoryId ? String(req.query.categoryId) : null;

  const tenantSlug = req.query.tenantSlug ? String(req.query.tenantSlug) : null;
  const forcedTenantId = await tenantIdFromSlug(tenantSlug);

  // Resolve scope → tenantIds
  const ownerTenantId = (req as any).tenantId ?? forcedTenantId ?? null;
  const userId = req.user?.tgId ?? null;

  let tenantIds = await resolveTenantIdsForScope(scope, userId, ownerTenantId);

  // If a slug was provided (buyer or owner page) force to that single shop
  if (forcedTenantId) {
    tenantIds = [forcedTenantId];
  }

  const { rows } = await searchProductsRaw({
    q,
    limit,
    offset: 0,
    where: {
      tenantIds,
      activeOnly: scope !== "owner",
      categoryId,
    },
  });

  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    photoUrl: toPhotoUrl(r),
    price: r.price,
    currency: r.currency,
    tenant: { slug: r.tenantSlug, name: r.tenantName },
  }));

  res.json({ items });
});

router.get("/search", async (req: any, res) => {
  const q = String(req.query.q ?? "").trim();
  const scope = String(req.query.scope ?? "universal") as "universal" | "owner" | "buyer";
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.perPage ?? 20)));
  const categoryId = req.query.categoryId ? String(req.query.categoryId) : null;

  const tenantSlug = req.query.tenantSlug ? String(req.query.tenantSlug) : null;
  const forcedTenantId = await tenantIdFromSlug(tenantSlug);

  const ownerTenantId = (req as any).tenantId ?? forcedTenantId ?? null;
  const userId = req.user?.tgId ?? null;

  let tenantIds = await resolveTenantIdsForScope(scope, userId, ownerTenantId);
  if (forcedTenantId) {
    tenantIds = [forcedTenantId];
  }

  const { rows, total } = await searchProductsRaw({
    q,
    limit: perPage,
    offset: (page - 1) * perPage,
    where: {
      tenantIds,
      activeOnly: scope !== "owner",
      categoryId,
    },
  });

  res.json({
    page,
    perPage,
    total,
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      price: r.price,
      currency: r.currency,
      photoUrl: toPhotoUrl(r),
      tenant: { slug: r.tenantSlug, name: r.tenantName },
    })),
  });
});

export default router;
