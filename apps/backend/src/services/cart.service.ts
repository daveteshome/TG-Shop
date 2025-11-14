// apps/backend/src/services/cart.service.ts
import { db } from "../lib/db";
import { Prisma } from "@prisma/client";
import { getTenantId } from "./tenant.util";
import { publicImageUrl } from "../lib/r2"; // 👈 ADD THIS

export const CartService = {
  async list(userId: string, tenantIdOverride?: string) {
    const tenantId = tenantIdOverride ?? (await getTenantId());

    const cart = await db.cart.findUnique({
  where: { tenantId_userId: { tenantId, userId } },
  include: {
    items: {
      orderBy: { createdAt: "asc" },   // 👈 preserve add order
      include: {
        product: {
          select: {
            title: true,
            currency: true,
            price: true,
            images: {
              orderBy: { position: "asc" },
              take: 1,
              include: {
                image: true,
              },
            },
          },
        },
        variant: { select: { name: true } },
      },
    },
  },
});


    if (!cart) return null;

    return {
      id: cart.id,
      userId,
      items: cart.items.map((it) => {
        const product = it.product;
        const cover = product?.images?.[0] || null;

        // ---- Build R2 URL from imageId + mime ----
        let imageUrl: string | null = null;
        if (cover?.imageId) {
          const mime = cover.image?.mime?.toLowerCase?.() || "";
          let ext: "jpg" | "png" | "webp" = "jpg";
          if (mime.includes("png")) ext = "png";
          else if (mime.includes("webp")) ext = "webp";

          imageUrl = publicImageUrl(cover.imageId, ext);
        } else if (cover?.url) {
          // Optional fallback if you still have old URL field
          imageUrl = cover.url;
        }

        return {
          itemId: it.id,
          productId: it.productId,
          title: product?.title ?? "",
          unitPrice: it.unitPrice, // Prisma.Decimal, frontend will Number() it
          currency: it.currency ?? product?.currency ?? "ETB",
          qty: it.quantity,
          imageUrl, // 👈 this is what Cart.tsx will use
        };
      }),
    };
  },

  async add(userId: string, productId: string, qty: number = 1, tenantIdOverride?: string) {
    const tenantId = tenantIdOverride ?? (await getTenantId());

    const product = await db.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, price: true, currency: true },
    });
    if (!product) throw new Error("product_not_found_in_tenant");

    const cart = await db.cart.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      update: {},
      create: { tenantId, userId },
    });

    const existing = await db.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + Math.max(1, qty) },
      });
    } else {
      await db.cartItem.create({
        data: {
          tenantId,
          cartId: cart.id,
          productId,
          quantity: Math.max(1, qty),
          unitPrice: product.price,
          currency: product.currency,
        },
      });
    }

    return this.list(userId, tenantId);
  },

  async inc(itemId: string) {
    const it = await db.cartItem.findUnique({ where: { id: itemId } });
    if (!it) return null;
    return db.cartItem.update({
      where: { id: itemId },
      data: { quantity: it.quantity + 1 },
    });
  },

  async dec(itemId: string) {
    const it = await db.cartItem.findUnique({ where: { id: itemId } });
    if (!it) return null;
    if (it.quantity <= 1) {
      await db.cartItem.delete({ where: { id: itemId } });
      return null;
    }
    return db.cartItem.update({
      where: { id: itemId },
      data: { quantity: it.quantity - 1 },
    });
  },

  async clear(userId: string, tenantIdOverride?: string) {
    const tenantId = tenantIdOverride ?? (await getTenantId());
    const cart = await db.cart.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!cart) return;
    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
  },
};
