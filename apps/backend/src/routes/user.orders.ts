// apps/backend/src/routes/user.orders.ts
import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";

const userOrdersRouter = Router();

userOrdersRouter.use(telegramAuth);

// GET /api/user/orders/all - Get all orders for current user (buyer + owner)
userOrdersRouter.get("/user/orders/all", async (req: any, res, next) => {
  try {
    const userId = req.userId!; // tgId from telegramAuth

    // 1. Get orders I made as a buyer
    const buyerOrders = await db.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoImageId: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // 2. Get shops I own/manage
    const myMemberships = await db.membership.findMany({
      where: {
        userId,
        role: {
          in: ["OWNER", "HELPER", "COLLABORATOR"],
        },
      },
      select: {
        tenantId: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoImageId: true,
          },
        },
      },
    });

    const myTenantIds = myMemberships.map((m) => m.tenantId);

    // 3. Get orders received in my shops
    const ownerOrders = await db.order.findMany({
      where: {
        tenantId: { in: myTenantIds },
      },
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoImageId: true,
          },
        },
        user: {
          select: {
            tgId: true,
            name: true,
            username: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Group buyer orders by shop
    const buyerByShop: Record<string, any[]> = {};
    for (const order of buyerOrders) {
      const shopId = order.tenant.id;
      if (!buyerByShop[shopId]) {
        buyerByShop[shopId] = [];
      }
      buyerByShop[shopId].push({
        id: order.id,
        shortCode: order.shortCode,
        status: order.status,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        itemCount: order.items.length,
        shop: order.tenant,
      });
    }

    // Group owner orders by shop
    const ownerByShop: Record<string, any[]> = {};
    for (const order of ownerOrders) {
      const shopId = order.tenant.id;
      if (!ownerByShop[shopId]) {
        ownerByShop[shopId] = [];
      }
      ownerByShop[shopId].push({
        id: order.id,
        shortCode: order.shortCode,
        status: order.status,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        itemCount: order.items.length,
        buyer: order.user,
        shop: order.tenant,
      });
    }

    res.json({
      buyer: {
        byShop: buyerByShop,
        total: buyerOrders.length,
      },
      owner: {
        byShop: ownerByShop,
        total: ownerOrders.length,
        shops: myMemberships.map((m) => m.tenant),
      },
    });
  } catch (e) {
    next(e);
  }
});

export { userOrdersRouter };
