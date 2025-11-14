// apps/backend/src/routes/cart.ts
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { dec, requireAuth, requireTenant } from "./_helpers";
import { publicImageUrl } from "../lib/r2";

export const cartRouter = Router();

async function getOrCreateCart(tenantId: string, userId: string) {
  return db.cart.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { updatedAt: new Date() },
    create: { tenantId, userId },
    select: { id: true, tenantId: true, userId: true },
  });
}

function buildWebUrlFromImage(im: any): string | null {
  if (!im) return null;

  // R2-style: imageId + mime → publicImageUrl
  if (im.imageId) {
    const mime = im.image?.mime?.toLowerCase?.() || "";
    let ext: "jpg" | "png" | "webp" = "jpg";
    if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    return publicImageUrl(im.imageId, ext);
  }

  // Fallback: direct URL fields if they exist
  if (im.webUrl) return im.webUrl;
  if (im.url) return im.url;

  return null;
}
async function serializeCart(cartId: string) {
  const items = await db.cartItem.findMany({
    where: { cartId },
    include: {
      product: {
        select: {
          title: true,
          currency: true,
          price: true,
          images: {
            take: 1,
            orderBy: { position: "asc" },
            include: { image: true },   // 👈 REQUIRED !!! 
          },
        },
      },
      variant: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = items.map((ci) => {
    const cover = ci.product.images[0] ?? null;

    // ---- BUILD R2 URL EXACTLY LIKE Universal/ShopBuyer ----
    let thumbUrl: string | null = null;
    if (cover?.imageId) {
      const mime = cover.image?.mime?.toLowerCase?.() || "";
      let ext: "jpg" | "png" | "webp" = "jpg";
      if (mime.includes("png")) ext = "png";
      else if (mime.includes("webp")) ext = "webp";

      thumbUrl = publicImageUrl(cover.imageId, ext);
    }

    return {
      id: ci.id,
      productId: ci.productId,
      variantId: ci.variantId,
      title: ci.product.title,
      variantName: ci.variant?.name ?? null,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice.toString(),
      currency: ci.currency,
      thumbUrl,   // 👈 NOW REALLY R2 URL
    };
  });

  const subtotal = rows.reduce(
    (acc, r) => acc.add(r.unitPrice),
    new Prisma.Decimal(0)
  );

  return { items: rows, subtotal: subtotal.toString(), currency: rows[0]?.currency ?? "ETB" };
}

cartRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = requireTenant(req);
    const tgId = requireAuth(req);
    const cart = await getOrCreateCart(tenantId, tgId);
    const dto = await serializeCart(cart.id);
    res.json({ id: cart.id, ...dto });
  } catch (e) {
    next(e);
  }
});

cartRouter.post("/items", async (req, res, next) => {
  try {
    const tenantId = requireTenant(req);
    const tgId = requireAuth(req);
    const { productId, variantId, qty } = (req.body ?? {}) as {
      productId: string;
      variantId?: string | null;
      qty?: number;
    };
    const quantity = Math.max(1, Math.min(99, Number(qty || 1)));

    const product = await db.product.findFirst({
      where: { id: productId, tenantId, active: true },
    });
    if (!product)
      return res
        .status(404)
        .json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

    let stock = product.stock;
    let price = product.price;
    if (variantId) {
      const v = await db.productVariant.findFirst({
        where: { id: variantId, productId, tenantId },
      });
      if (!v)
        return res
          .status(404)
          .json({ error: "Variant not found", code: "VARIANT_NOT_FOUND" });
      stock = v.stock;
      if (v.priceDiff) price = price.add(v.priceDiff);
    }

    if (quantity > stock)
      return res
        .status(400)
        .json({ error: "Insufficient stock", code: "OUT_OF_STOCK" });

    const cart = await getOrCreateCart(tenantId, tgId);

    const existing = await db.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: variantId ?? null },
    });

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, stock);
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await db.cartItem.create({
        data: {
          tenantId,
          cartId: cart.id,
          productId,
          variantId: variantId ?? null,
          quantity,
          unitPrice: price,
          currency: product.currency,
        },
      });
    }

    const dto = await serializeCart(cart.id);
    res.json({ id: cart.id, ...dto });
  } catch (e) {
    next(e);
  }
});

cartRouter.patch("/items/:itemId", async (req, res, next) => {
  try {
    const tenantId = requireTenant(req);
    const tgId = requireAuth(req);
    const { qty } = (req.body ?? {}) as { qty: number };
    const itemId = req.params.itemId;

    const item = await db.cartItem.findFirst({
      where: { id: itemId },
      include: { cart: true, variant: true, product: true },
    });
    if (!item || item.cart.userId !== tgId || item.cart.tenantId !== tenantId) {
      return res
        .status(404)
        .json({ error: "Not found", code: "CART_ITEM_NOT_FOUND" });
    }

    if (!qty || qty <= 0) {
      await db.cartItem.delete({ where: { id: item.id } });
    } else {
      const stock = item.variantId ? item.variant!.stock : item.product.stock;
      const newQty = Math.min(qty, stock);
      await db.cartItem.update({
        where: { id: item.id },
        data: { quantity: newQty },
      });
    }

    const dto = await serializeCart(item.cartId);
    res.json({ id: item.cartId, ...dto });
  } catch (e) {
    next(e);
  }
});

cartRouter.delete("/items/:itemId", async (req, res, next) => {
  try {
    const tenantId = requireTenant(req);
    const tgId = requireAuth(req);
    const itemId = req.params.itemId;

    const item = await db.cartItem.findFirst({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== tgId || item.cart.tenantId !== tenantId) {
      return res
        .status(404)
        .json({ error: "Not found", code: "CART_ITEM_NOT_FOUND" });
    }

    await db.cartItem.delete({ where: { id: item.id } });
    const dto = await serializeCart(item.cartId);
    res.json({ id: item.cartId, ...dto });
  } catch (e) {
    next(e);
  }
});
