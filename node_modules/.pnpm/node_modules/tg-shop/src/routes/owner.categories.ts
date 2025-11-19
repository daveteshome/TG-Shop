// apps/backend/src/server/routes.ts
import { Router } from 'express';
import { CatalogService } from '../services/catalog.service';
import { db } from '../lib/db';
import { publicImageUrl } from "../lib/r2"; // <-- adjust ../ if your path differs
import { resolveTenant } from '../middlewares/resolveTenant';
import { telegramAuth } from '../api/telegramAuth';
import { listCategoriesWithCountsForShop } from "../services/catalog.service";
import { extFromMime } from "./utils/ext";


export const ownerCategoriesRouter = Router();
ownerCategoriesRouter.use(telegramAuth);

ownerCategoriesRouter.get(
  "/shop/:slug/categories/:categoryId/products",
  resolveTenant,
  async (req: any, res, next) => {
    try {
      const tenantId = req.tenantId as string;
      const categoryId = req.params.categoryId as string;

      // Fetch products for this tenant + category
      const items = await db.product.findMany({
        where: {
          tenantId,
          categoryId,
          active: true,
        },
        include: {
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: {
              url: true,
              imageId: true,
              image: { select: { mime: true } }, // 👈 now TS knows about image.mime
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Map to the shape your frontend expects (`photoUrl`, etc.)
      const products = items.map((p) => {
        const img = p.images?.[0] || null;

        // Build R2 URL first (same logic as /shop/:slug/products)
        const photoUrl = img?.imageId
          ? publicImageUrl(img.imageId, extFromMime(img.image?.mime))
          : null;

        return {
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          currency: p.currency,
          stock: p.stock ?? 0,
          categoryId: p.categoryId,
          photoUrl,
        };
      });

      res.json({ products });
    } catch (err) {
      next(err);
    }
  }
);


// 👇 Return universal categories for every shop
ownerCategoriesRouter.get("/shop/:slug/categories", resolveTenant, async (req: any, res, next) => {
  try {
    // Reuse your universal catalog service so it's consistent with /categories
    const cats = await CatalogService.listCategories();
    // Ensure the webapp-friendly shape
    res.json({ items: cats });
  } catch (err) {
    next(err);
  }
});

// ── ADD this endpoint (tenant-scoped) ──────────────────────────────────────────
ownerCategoriesRouter.get("/shop/:slug/categories/with-counts", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const data = await listCategoriesWithCountsForShop(tenantId);
    res.json({ items: data });
  } catch (e) {
    next(e);
  }
});
