import { Router } from 'express';
import { db } from '../lib/db';
import { publicImageUrl } from "../lib/r2"; 
import { resolveTenant } from '../middlewares/resolveTenant';
import { telegramAuth } from '../api/telegramAuth';
import { extFromMime } from "./utils/ext";;
import {Readable } from "node:stream";
import { addUserRole } from '../middlewares/addUserRole';
import { canAddStock, canRecordSale, canAdjustStock, canDeleteProducts } from '../lib/permissions';

export const ownerProductsRouter = Router();
ownerProductsRouter.use(telegramAuth);


async function getDescendantsIds(rootId: string): Promise<string[]> {
  const seen = new Set<string>();
  let frontier: string[] = [String(rootId)];

  while (frontier.length) {
    const rows = await db.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    const kids = rows.map(r => String(r.id));

    const fresh: string[] = [];
    for (const id of kids) {
      if (!seen.has(id)) {
        seen.add(id);
        fresh.push(id);
      }
    }
    frontier = fresh;
  }
  return Array.from(seen); // descendants only (not including root)
}



// apps/backend/src/api/owner.products.ts
ownerProductsRouter.post("/shop/:slug/products", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const slug = req.params.slug;
    const {
      title,
      price,
      currency,
      description,
      categoryId,
      stock,
      active = true,
      imageIds,
      brand,
      condition,
    } = req.body || {};


    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ error: "title_required" });
    }

    // 🔹 Brand required
    if (!brand || String(brand).trim().length === 0) {
      return res.status(400).json({ error: "brand_required" });
    }

    // 🔹 Condition required & must be one of allowed values
    if (
      !condition ||
      !["new", "used", "refurbished"].includes(String(condition))
    ) {
      return res.status(400).json({ error: "invalid_condition" });
    }

    const priceNum = Number(price);
    if (price === undefined || Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: "invalid_price" });
    }

    const stockNumRaw = stock === undefined || stock === null || stock === "" ? 0 : Number(stock);
    if (Number.isNaN(stockNumRaw) || stockNumRaw < 0 || !Number.isInteger(stockNumRaw)) {
      return res.status(400).json({ error: "invalid_stock" });
    }

    // 🔹 Require at least one image
if (!Array.isArray(imageIds) || imageIds.length === 0) {
  return res.status(400).json({ error: "image_required" });
}


    const product = await db.$transaction(async (tx) => {
      // Check if shop is trusted (auto-approve for universal)
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { autoApproveProducts: true },
      });

      const isTrusted = tenant?.autoApproveProducts ?? false;

      const p = await tx.product.create({
        data: {
          tenantId,
          title: title.trim(),
          price: priceNum,
          currency: currency || "ETB",
          description: description ?? null,
          categoryId: categoryId ?? null,
          stock: stockNumRaw,
          active,
          // ✅ Always publish to shop (no approval needed)
          isPublished: true,
          // ✅ Request universal listing (needs approval unless trusted)
          publishToUniversal: true,
          // ✅ Auto-approve if shop is trusted, otherwise pending
          reviewStatus: isTrusted ? 'approved' : 'pending',
          reviewedAt: isTrusted ? new Date() : null,
          reviewedBy: isTrusted ? 'auto' : null,
          brand: String(brand).trim(),
          condition,
        },
      });


      if (Array.isArray(imageIds) && imageIds.length > 0) {
        for (let i = 0; i < imageIds.length; i++) {
          await tx.productImage.create({
            data: {
              tenantId,
              productId: p.id,
              imageId: imageIds[i],
              position: i,
            },
          });
        }
      }

      return p;
    });

    res.json({ product: { id: product.id } });
  } catch (e) {
    next(e);
  }
});

// /shop/:slug/products handler with this one ---
ownerProductsRouter.get("/shop/:slug/products", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const categoryId = (req.query.category as string | undefined) || undefined;
    const categories = (req.query.categories as string | undefined) || undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 50)));

    const where: any = { tenantId, active: true };

    // Support multiple categories (for filtering with children)
    if (categories) {
      const catIds = categories.split(',').map(id => id.trim()).filter(Boolean);
      if (catIds.length > 0) {
        where.categoryId = { in: catIds };
      }
    } else if (categoryId && categoryId !== "all") {
      const descendants = await getDescendantsIds(categoryId);
      where.categoryId = { in: [categoryId, ...descendants] };
    }

    const products = await db.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: {
            url: true,                 // http(s) or tg:file_id (legacy)
            imageId: true,             // for publicImageUrl()
            image: { select: { mime: true } }, // to decide extension
          },
        },
        tenant: { select: { id: true, slug: true, name: true, publicPhone: true } },
      },
    });

    // Get product IDs for stats lookup
    const productIds = products.map(p => p.id);
    
    // Fetch stats for all products
    const stats = await db.productStats.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, viewsTotal: true },
    });
    
    // Count cart items for each product
    const cartCounts = await db.cartItem.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _count: { id: true },
    });
    
    // Create lookup maps
    const statsMap = new Map(stats.map(s => [s.productId, s.viewsTotal]));
    const cartMap = new Map(cartCounts.map(c => [c.productId, c._count.id]));

    const items = products.map((p) => {
      const img  = p.images?.[0] || null;

      // Build R2 URL first (same as detail/logo)
      const photoUrl = img ?.imageId
        ? publicImageUrl(img .imageId, extFromMime(img .image?.mime))
        : null;

      return {
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        price: Number(p.price),
        currency: p.currency,
        stock: p.stock,
        active: p.active,
        categoryId: p.categoryId ?? null,
        photoUrl,
        compareAtPrice: p.compareAtPrice ?? null,
        views: statsMap.get(p.id) ?? 0,
        addToCart: cartMap.get(p.id) ?? 0,
      };
    });

    res.json({ items, tenant: req.tenant });
  } catch (e) {
    next(e);
  }
});

// GET /shop/:slug/products/:id
// GET /shop/:slug/products/:id
ownerProductsRouter.get(
  "/shop/:slug/products/:id",
  resolveTenant,
  async (req: any, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const productId = String(req.params.id);

      const product = await db.product.findFirst({
        where: { id: productId, tenantId },
        include: {
          category: { select: { id: true, name: true, parentId: true } },
          tenant: { 
            select: { 
              id: true, 
              slug: true, 
              name: true, 
              description: true,
              publicPhone: true, 
              publicTelegramLink: true,
              logoImageId: true,
              instagramUrl: true,
              facebookUrl: true,
              twitterUrl: true,
              returnPolicy: true,
              shippingInfo: true,
              deliveryMode: true,
              location: true,
            } 
          },
        },
      });

      if (!product) {
        return res.status(404).json({ error: "product_not_found" });
      }

      // Track product view (fire-and-forget, don't block response)
      db.productStats.upsert({
        where: { productId: productId },
        create: {
          productId: productId,
          tenantId: tenantId,
          viewsTotal: 1,
          revenueTotal: 0,
        },
        update: {
          viewsTotal: { increment: 1 },
        },
      }).catch(err => console.error('Failed to track view:', err));

      // Build tenant logo URL if exists
      let logoWebUrl: string | null = null;
      if (product.tenant?.logoImageId) {
        const logoImg = await db.image.findUnique({
          where: { id: product.tenant.logoImageId },
          select: { mime: true },
        });
        const mime = logoImg?.mime?.toLowerCase() || "image/jpeg";
        let ext: "jpg" | "png" | "webp" = "jpg";
        if (mime.includes("png")) ext = "png";
        else if (mime.includes("webp")) ext = "webp";
        logoWebUrl = publicImageUrl(product.tenant.logoImageId, ext);
      }

      const tenant = product.tenant ? {
        ...product.tenant,
        logoWebUrl,
      } : null;

      const images = await db.productImage.findMany({
        where: { productId, tenantId },
        orderBy: { position: "asc" },
        select: { id: true, imageId: true, position: true },
      });

      const imagesWithUrl = await Promise.all(
        images.map(async (im) => {
          if (!im.imageId) {
            return { ...im, webUrl: null };
          }

          const imgRow = await db.image.findUnique({
            where: { id: im.imageId },
            select: { mime: true },
          });

          const mime = imgRow?.mime?.toLowerCase() || "image/jpeg";
          let ext: "jpg" | "png" | "webp" = "jpg";
          if (mime.includes("png")) ext = "png";
          else if (mime.includes("webp")) ext = "webp";

          return {
            ...im,
            webUrl: publicImageUrl(im.imageId, ext),
          };
        })
      );

      const moves = await db.inventoryMove.findMany({
        where: { tenantId, productId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          quantity: true,
          reason: true,
        },
      });

      const stockMoves = moves.map((m) => {
        let type: "IN" | "OUT" | "ADJUST";
        if (m.quantity > 0) type = "IN";
        else if (m.quantity < 0) type = "OUT";
        else type = "ADJUST";

        return {
          id: m.id,
          createdAt: m.createdAt,
          quantity: m.quantity,
          reason: m.reason,
          type,
        };
      });

      // Format product data
      const productData = {
        ...product,
        tenant,
        category: product.category ? {
          id: product.category.id,
          title: product.category.name,
          parentId: product.category.parentId,
        } : null,
      };

      // ✅ SINGLE RESPONSE
      return res.json({
        product: productData,
        images: imagesWithUrl,
        stockMoves,
      });
    } catch (e) {
      return next(e);
    }
  }
);



// POST /shop/:slug/products/:id/stock-move
ownerProductsRouter.post(
  "/shop/:slug/products/:id/stock-move",
  resolveTenant,
  addUserRole,
  async (req: any, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId;
      const userRole = req.userRole;
      const productId = String(req.params.id);
      const { type, quantity, reason, sellingPrice, paymentMethod, customerName, notes } = req.body || {};

      if (!["add", "remove", "set"].includes(type)) {
        return res.status(400).json({ error: "invalid_move_type" });
      }

      // Permission checks based on role
      if (type === "add" && !canAddStock(userRole)) {
        return res.status(403).json({ error: "Permission denied: Only OWNER and COLLABORATOR can add stock" });
      }

      if (type === "remove" && !canRecordSale(userRole)) {
        return res.status(403).json({ error: "Permission denied: Only OWNER, COLLABORATOR, and HELPER can record sales" });
      }

      if (type === "set" && !canAdjustStock(userRole)) {
        return res.status(403).json({ error: "Permission denied: Only OWNER and COLLABORATOR can adjust stock" });
      }

      const qtyNum = Number(quantity);
      if (!quantity || Number.isNaN(qtyNum) || !Number.isInteger(qtyNum)) {
        return res.status(400).json({ error: "invalid_quantity" });
      }

      // Validate quantity based on operation type
      if (type === "add" && qtyNum <= 0) {
        return res.status(400).json({ error: "quantity_must_be_positive" });
      }
      if (type === "remove" && qtyNum <= 0) {
        return res.status(400).json({ error: "quantity_must_be_positive" });
      }
      if (type === "set" && qtyNum < 0) {
        return res.status(400).json({ error: "quantity_cannot_be_negative" });
      }

      const result = await db.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
          where: { id: productId, tenantId },
          select: { stock: true },
        });

        if (!product) {
          throw new Error("product_not_found");
        }

        const currentStock = product.stock ?? 0;
        let newStock = currentStock;
        let delta = 0;

        if (type === "add") {
          delta = qtyNum;
          newStock = currentStock + qtyNum;
        } else if (type === "remove") {
          // Validate we have enough stock to remove
          if (currentStock === 0) {
            throw new Error("out_of_stock");
          }
          if (currentStock < qtyNum) {
            throw new Error("insufficient_stock");
          }
          delta = -qtyNum;
          newStock = currentStock - qtyNum;
        } else if (type === "set") {
          // Don't allow setting to same value
          if (qtyNum === currentStock) {
            throw new Error("no_change");
          }
          newStock = qtyNum;
          delta = qtyNum - currentStock;
        }

        if (newStock < 0) {
          throw new Error("stock_negative");
        }

        await tx.product.update({
          where: { id: productId, tenantId },
          data: { stock: newStock },
        });

        // Map move type
        let moveType: "IN" | "OUT" | "ADJUST" = "ADJUST";
        if (delta > 0) moveType = "IN";
        else if (delta < 0) moveType = "OUT";

        await tx.inventoryMove.create({
          data: {
            tenantId,
            productId,
            quantity: delta,               // signed int
            reason: reason?.trim() || null,
            kind: moveType,                // ✅ REQUIRED BY PRISMA
            createdBy: userId,             // Track who performed the action
            sellingPrice: sellingPrice ? Number(sellingPrice) : null,
            paymentMethod: paymentMethod?.trim() || null,
            customerName: customerName?.trim() || null,
            notes: notes?.trim() || null,
          },
        });



        return { newStock, delta };
      });

      res.json({ ok: true, newStock: result.newStock });
    } catch (e: any) {
      if (e?.message === "product_not_found") {
        return res.status(404).json({ error: "Product not found" });
      }
      if (e?.message === "stock_negative") {
        return res.status(400).json({ error: "Stock cannot be negative" });
      }
      if (e?.message === "out_of_stock") {
        return res.status(400).json({ error: "Product is out of stock" });
      }
      if (e?.message === "insufficient_stock") {
        return res.status(400).json({ error: "Not enough stock available" });
      }
      if (e?.message === "no_change") {
        return res.status(400).json({ error: "New stock is same as current stock" });
      }
      next(e);
    }
  }
);


// GET /shop/:slug/products/:id/performance

ownerProductsRouter.get(
  "/shop/:slug/products/:id/performance",
  resolveTenant,
  async (req: any, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const productId = String(req.params.id);

      // Only count orders that are actually completed / paid
      const items = await db.orderItem.findMany({
        where: {
          productId,
          order: {
            tenantId,
            status: {
              in: ["paid", "shipped", "completed"],
            },
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
        },
      });

      let soldUnits = 0;
      let revenue = 0;

      for (const it of items) {
        const qty = Number(it.quantity || 0);
        const price = Number(it.unitPrice || 0);
        soldUnits += qty;
        revenue += qty * price;
      }

      // ✅ single response path
      return res.json({
        soldUnits,
        revenue,
      });
    } catch (e) {
      // ✅ only error handler responds if something throws before res.json
      return next(e);
    }
  }
);




ownerProductsRouter.patch("/shop/:slug/products/:id", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const productId = req.params.id;
    const {
      title,
      price,
      currency,
      description,
      categoryId,
      stock,
      active,
      isPublished,
      imageIds,
      imagesReplace,
      brand,
      condition,
      sku,
      barcode,
      compareAtPrice,
    } = req.body || {};



    await db.$transaction(async (tx) => {
      const data: any = {};

      if (title !== undefined) data.title = String(title).trim();
      if (currency !== undefined) data.currency = currency;
      if (description !== undefined) data.description = description;
      if (categoryId !== undefined) data.categoryId = categoryId;
      if (active !== undefined) data.active = !!active;
      if (isPublished !== undefined) data.isPublished = !!isPublished;


      if (price !== undefined) {
        const priceNum = Number(price);
        if (Number.isNaN(priceNum) || priceNum < 0) {
          throw new Error("invalid_price");
        }
        data.price = priceNum;
      }

      if (stock !== undefined) {
        const stockNum = Number(stock);
        if (Number.isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
          throw new Error("invalid_stock");
        }
        data.stock = stockNum;
      }

      if (brand !== undefined) {
        data.brand = brand ? String(brand).trim() : null;
      }

      if (condition !== undefined) {
        data.condition =
          condition === "new" || condition === "used" || condition === "refurbished"
            ? condition
            : null;
      }

      if (sku !== undefined) {
        data.sku = sku ? String(sku).trim() : null;
      }

      if (barcode !== undefined) {
        data.barcode = barcode ? String(barcode).trim() : null;
      }

      if (compareAtPrice !== undefined) {
        if (compareAtPrice === null || compareAtPrice === "") {
          data.compareAtPrice = null;
        } else {
          const cmpNum = Number(compareAtPrice);
          if (Number.isNaN(cmpNum) || cmpNum < 0) {
            throw new Error("invalid_compare_at_price");
          }
          data.compareAtPrice = cmpNum;
        }
      }


      await tx.product.update({
        where: { id: productId, tenantId },
        data,
      });

      // images — keep your existing logic
      if (Array.isArray(imageIds)) {
        await tx.productImage.deleteMany({ where: { tenantId, productId } });
        for (let i = 0; i < imageIds.length; i++) {
          await tx.productImage.create({
            data: {
              tenantId,
              productId,
              imageId: imageIds[i],
              position: i,
            },
          });
        }

        if (imageIds.length === 0) {
          throw new Error("image_required");
        }

        return;
      }

      if (Array.isArray(imagesReplace)) {
        await tx.productImage.deleteMany({ where: { tenantId, productId } });

        for (let i = 0; i < imagesReplace.length; i++) {
          const item = imagesReplace[i];
          if (item.type === "existing") {
            const old = await tx.productImage.findUnique({
              where: { id: item.productImageId },
            });
            if (!old) continue;
            await tx.productImage.create({
              data: {
                tenantId,
                productId,
                imageId: old.imageId,
                url: old.url,
                tgFileId: old.tgFileId,
                position: i,
              },
            });
          } else if (item.type === "new") {
            await tx.productImage.create({
              data: {
                tenantId,
                productId,
                imageId: item.imageId,
                position: i,
              },
            });
          }
        }
      }
    });

    res.json({ ok: true });
  } catch (e: any) {
    if (e?.message === "invalid_price" || e?.message === "invalid_stock" || e?.message === "invalid_compare_at_price" ||
    e?.message === "image_required") {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
});

ownerProductsRouter.get("/products/:id/image", async (req, res) => {
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

ownerProductsRouter.delete("/shop/:slug/products/:id", resolveTenant, addUserRole, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const userRole = req.userRole;
    const productId = String(req.params.id);

    // Only OWNER can delete products
    if (!canDeleteProducts(userRole)) {
      return res.status(403).json({ error: "Permission denied: Only shop owner can delete products" });
    }

    const product = await db.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ error: "product_not_found" });
    }

    // Soft-delete: keep history & orders intact
    await db.product.update({
      where: { id: productId, tenantId },
      data: {
        active: false,
        isPublished: false,
        stock: 0,
        // if you added this field in schema:
        // isArchived: true,
      },
    });

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /shop/:slug/products/by-ids - Get multiple products by IDs
ownerProductsRouter.post("/shop/:slug/products/by-ids", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ products: [] });
    }

    const products = await db.product.findMany({
      where: {
        id: { in: ids },
        tenantId,
        active: true,
      },
      include: {
        images: {
          select: {
            id: true,
            imageId: true,
            url: true,
            image: { select: { mime: true } },
          },
          orderBy: { position: "asc" },
          take: 1,
        },
      },
      take: 50,
    });

    const mapped = products.map((p) => {
      const firstImg = p.images[0];
      let photoUrl: string | null = null;
      if (firstImg?.imageId) {
        const mime = firstImg.image?.mime?.toLowerCase?.() || "";
        let ext: "jpg" | "png" | "webp" = "jpg";
        if (mime.includes("png")) ext = "png";
        else if (mime.includes("webp")) ext = "webp";
        photoUrl = publicImageUrl(firstImg.imageId, ext);
      } else if (firstImg?.url) {
        photoUrl = firstImg.url;
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: p.currency,
        photoUrl,
        categoryId: p.categoryId,
      };
    });

    res.json({ products: mapped });
  } catch (e) {
    next(e);
  }
});


// GET /shop/:slug/inventory-history
ownerProductsRouter.get(
  "/shop/:slug/inventory-history",
  resolveTenant,
  async (req: any, res, next) => {
    try {
      const tenantId = req.tenantId!;

      const moves = await db.inventoryMove.findMany({
        where: { tenantId },
        include: {
          product: {
            select: {
              id: true,
              title: true,
            },
          },
          creator: {
            select: {
              tgId: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200, // Limit to last 200 moves
      });

      res.json({ moves });
    } catch (e) {
      next(e);
    }
  }
);


// GET /shop/:slug/my-role
ownerProductsRouter.get(
  "/shop/:slug/my-role",
  resolveTenant,
  addUserRole,
  async (req: any, res, next) => {
    try {
      const userRole = req.userRole;
      res.json({ role: userRole });
    } catch (e) {
      next(e);
    }
  }
);


// GET /shop/:slug/team-performance
ownerProductsRouter.get(
  "/shop/:slug/team-performance",
  resolveTenant,
  addUserRole,
  async (req: any, res, next) => {
    try {
      const tenantId = req.tenantId!;
      const userRole = req.userRole;

      // Only OWNER can view team performance
      if (userRole !== 'OWNER') {
        return res.status(403).json({ error: "Permission denied: Only shop owner can view team performance" });
      }

      // Get all team members
      const memberships = await db.membership.findMany({
        where: { tenantId },
        include: {
          user: {
            select: {
              tgId: true,
              name: true,
              username: true,
            },
          },
        },
      });

      // Get all inventory moves with user info
      const moves = await db.inventoryMove.findMany({
        where: { tenantId, createdBy: { not: null } },
        select: {
          id: true,
          createdBy: true,
          kind: true,
          quantity: true,
          sellingPrice: true,
          createdAt: true,
        },
      });

      // Calculate stats per user
      const userStats = new Map<string, {
        userId: string;
        name: string;
        username: string | null;
        role: string;
        totalActions: number;
        salesCount: number;
        salesRevenue: number;
        stockAdditions: number;
        stockAdded: number;
        adjustments: number;
        lastActivity: Date | null;
      }>();

      // Initialize stats for all members
      memberships.forEach(m => {
        userStats.set(m.userId, {
          userId: m.userId,
          name: m.user?.name || 'Unknown',
          username: m.user?.username || null,
          role: m.role,
          totalActions: 0,
          salesCount: 0,
          salesRevenue: 0,
          stockAdditions: 0,
          stockAdded: 0,
          adjustments: 0,
          lastActivity: null,
        });
      });

      // Process moves
      moves.forEach(move => {
        if (!move.createdBy) return;
        
        const stats = userStats.get(move.createdBy);
        if (!stats) return;

        stats.totalActions++;
        
        // Update last activity
        if (!stats.lastActivity || move.createdAt > stats.lastActivity) {
          stats.lastActivity = move.createdAt;
        }

        // Categorize by type
        if (move.kind === 'OUT') {
          // Sale
          stats.salesCount++;
          if (move.sellingPrice) {
            stats.salesRevenue += Number(move.sellingPrice) * Math.abs(move.quantity);
          }
        } else if (move.kind === 'IN') {
          // Stock addition
          stats.stockAdditions++;
          stats.stockAdded += move.quantity;
        } else if (move.kind === 'ADJUST') {
          // Adjustment
          stats.adjustments++;
        }
      });

      // Convert to array and sort by total actions
      const teamPerformance = Array.from(userStats.values())
        .sort((a, b) => b.totalActions - a.totalActions);

      // Calculate totals
      const totals = {
        totalMembers: memberships.length,
        totalActions: moves.length,
        totalSales: teamPerformance.reduce((sum, u) => sum + u.salesCount, 0),
        totalRevenue: teamPerformance.reduce((sum, u) => sum + u.salesRevenue, 0),
        totalStockAdditions: teamPerformance.reduce((sum, u) => sum + u.stockAdditions, 0),
        totalAdjustments: teamPerformance.reduce((sum, u) => sum + u.adjustments, 0),
      };

      res.json({
        teamPerformance,
        totals,
      });
    } catch (e) {
      next(e);
    }
  }
);
