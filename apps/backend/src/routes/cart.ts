// apps/backend/src/routes/cart.ts
// apps/backend/src/server/routes.ts
import { Router } from 'express';
import { telegramAuth } from '../api/telegramAuth';
import { CartService } from '../services/cart.service';
import { db } from '../lib/db';

import {Readable } from "node:stream";
import { publicImageUrl } from "../lib/r2"; // <-- adjust ../ if your path differs
import { getTenantId, getTenantSlugFromReq } from '../services/tenant.util';
import { extFromMime } from "./utils/ext";


export const cartRouter = Router();
cartRouter.use(telegramAuth);

cartRouter.get("/products/:id/image", async (req, res) => {
  const id = req.params.id;

  try {
    const p = await db.product.findFirst({
      where: { id, active: true },
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: {
            imageId: true,
            image: { select: { mime: true } },
          },
        },
      },
    });

    if (!p) {
      console.warn("[image:route] product not found or inactive", { productId: id });
      return res.status(404).send(`Product not found or inactive: ${id}`);
    }

    const im = p.images?.[0];
    if (!im?.imageId) {
      console.warn("[image:route] no imageId for product", { productId: id });
      return res.status(404).send(`No image for product: ${id}`);
    }

    const ext = extFromMime(im.image?.mime);
    const url = publicImageUrl(im.imageId, ext);

    const r2 = await fetch(url);
    if (!r2.ok) {
      const t = await r2.text().catch(() => "");
      console.error("[image:route] r2 fetch failed", {
        status: r2.status,
        body: t.slice(0, 200),
        url,
      });
      return res.status(502).send("R2 fetch failed");
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", r2.headers.get("content-type") || "image/jpeg");

    const body: any = r2.body;
    if (body && typeof (Readable as any).fromWeb === "function") {
      return (Readable as any).fromWeb(body).pipe(res);
    }

    const buf = Buffer.from(await r2.arrayBuffer());
    res.setHeader("Content-Length", String(buf.length));
    return res.end(buf);
  } catch (err: any) {
    console.error("[image:route] error", {
      productId: id,
      err: err?.message,
      stack: err?.stack,
    });
    return res.status(500).send(`image proxy error: ${err?.message ?? String(err)}`);
  }
});

cartRouter.delete("/cart/items/:itemId", async (req: any, res) => {
  const userId = req.userId!;
  const slug = getTenantSlugFromReq(req);
  if (!slug) return res.status(400).json({ error: "tenant_slug_required" });

  const tenantId = await getTenantId(slug);
  const itemId = req.params.itemId;

  // Ensure item belongs to the same user + tenant
  const item = await db.cartItem.findFirst({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== userId || item.cart.tenantId !== tenantId) {
    return res.status(404).json({ error: "item_not_found" });
  }

  // Delete the item
  await db.cartItem.delete({ where: { id: itemId } });

  // Return updated cart
  const cart = await CartService.list(userId, tenantId);
  return res.json(cart || { id: null, userId, items: [] });
});


cartRouter.patch("/cart/items/:itemId", async (req: any, res) => {
  const userId = req.userId!;
  const slug = getTenantSlugFromReq(req);

  if (!slug) {
    return res.status(400).json({ error: "tenant_slug_required" });
  }

  const tenantId = await getTenantId(slug);
  const itemId = req.params.itemId;
  const { qtyDelta } = (req.body ?? {}) as { qtyDelta?: number };

  if (!qtyDelta) {
    return res.status(400).json({ error: "qtyDelta_required" });
  }

  // Load item and ensure ownership
  const item = await db.cartItem.findFirst({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== userId || item.cart.tenantId !== tenantId) {
    return res.status(404).json({ error: "item_not_found" });
  }

  if (qtyDelta > 0) {
    // increase quantity
    await CartService.inc(itemId);
  } else {
    // qtyDelta < 0
    if (item.quantity <= 1) {
      // remove item
      await db.cartItem.delete({ where: { id: itemId } });
    } else {
      // decrease quantity
      await CartService.dec(itemId);
    }
  }

  const cart = await CartService.list(userId, tenantId);
  return res.json(cart || { id: null, userId, items: [] });
});


// GET /api/cart
// GET /api/cart
cartRouter.get("/cart", async (req: any, res) => {
  const userId = req.userId!;
  const slug = getTenantSlugFromReq(req);
  if (!slug) return res.status(400).json({ error: "tenant_slug_required" });

  const tenantId = await getTenantId(slug);
  const cart = await CartService.list(userId, tenantId);
  return res.json(cart || { id: null, userId, items: [] });
});

// POST /api/cart/items
cartRouter.post("/cart/items", async (req: any, res) => {
  const userId = req.userId!;
  const { productId, qty } = req.body || {};
  if (!productId) return res.status(400).json({ error: "productId_required" });

  const slug = getTenantSlugFromReq(req);
  if (!slug) return res.status(400).json({ error: "tenant_slug_required" });

  const tenantId = await getTenantId(slug);
  const cart = await CartService.add(userId, String(productId), Number(qty ?? 1), tenantId);
  return res.json(cart);
});
