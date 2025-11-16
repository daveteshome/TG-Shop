// apps/backend/src/api/ordersRouter.ts
import { Router } from "express";
import { db } from "../lib/db";
import { requireAuth, requireTenant } from "./_helpers";
import { publicImageUrl } from "../lib/r2";

export const ordersRouter = Router();

/**
 * Same idea as cart.ts / universal.ts
 * Build a public URL from a ProductImage + its Image row.
 */
function buildWebUrlFromImage(im: any): string | null {
  if (!im) return null;

  if (im.imageId) {
    const mime = im.image?.mime?.toLowerCase?.() || "";
    let ext: "jpg" | "png" | "webp" = "jpg";
    if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    return publicImageUrl(im.imageId, ext);
  }

  // Fallback to stored URLs if present
  if (im.webUrl) return im.webUrl;
  if (im.url) return im.url;

  return null;
}

/**
 * GET /api/orders
 * Used by BuyerOrders.tsx (list of orders)
 */
ordersRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = requireTenant(req);
    const tgId = requireAuth(req);

    const limit = Math.min(
      parseInt((req.query.limit as string) || "20", 10),
      50
    );
    const cursor = (req.query.cursor as string) || undefined;

    const rows = await db.order.findMany({
      where: { tenantId, userId: tgId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        shortCode: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    });

    const hasNext = rows.length > limit;
    if (hasNext) rows.pop();

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        shortCode: r.shortCode,
        status: r.status,
        total: r.total.toString(),
        currency: r.currency,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor: hasNext ? rows[rows.length - 1].id : null,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/orders/:id
 * Used by BuyerOrderDetail.tsx
 * -> Here we now build thumbUrl + images[] exactly like cart.ts
 */
ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const tenantId = requireTenant(req);
    const tgId = requireAuth(req);
    const id = req.params.id;

    const order: any = await db.order.findFirst({
      where: { id, tenantId, userId: tgId },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: {
            product: {
              include: {
                images: {
                  orderBy: { position: "asc" },
                  include: { image: true }, // SAME AS cart.ts
                },
              },
            },
          },
        },
        address: true,
      },
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: "Not found", code: "ORDER_NOT_FOUND" });
    }

    const items = (order.items ?? []).map((it: any) => {
      const product = it.product || {};
      const imagesRaw = product.images ?? [];

      // 1) R2 / stored image URLs from ProductImage rows
      const urls: string[] = imagesRaw
        .map((im: any) => buildWebUrlFromImage(im))
        .filter((u: string | null): u is string => !!u);

      // 2) If there are no ProductImage rows but product has a photoUrl,
      //    fall back to that (this mirrors how ProductDetail/Cart handle seeds).
      if (urls.length === 0 && typeof product.photoUrl === "string" && product.photoUrl) {
        urls.push(product.photoUrl);
      }

      const thumbUrl = urls[0] ?? null;

      return {
        productId: it.productId,
        variantId: it.variantId,
        title: it.titleSnapshot,
        variant: it.variantSnapshot,
        quantity: it.quantity,
        unitPrice: it.unitPrice.toString(),
        currency: it.currency,
        thumbUrl,         // <- used as small thumbnail
        images: urls,     // <- used for slider in BuyerOrderDetail
      };
    });

    res.json({
      id: order.id,
      shortCode: order.shortCode,
      status: order.status,
      total: order.total.toString(),
      currency: order.currency,
      note: order.note,
      createdAt: order.createdAt.toISOString(),
      // address is not used by BuyerOrderDetail at the moment, but we keep it here
      address: order.address && {
        label: order.address.label,
        line1: order.address.line1,
        line2: order.address.line2,
        city: order.address.city,
        region: order.address.region,
        country: order.address.country,
        postalCode: order.address.postalCode,
      },
      items,
    });
  } catch (e) {
    next(e);
  }
});
