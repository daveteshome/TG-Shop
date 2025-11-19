import { Router } from 'express';
import { db } from '../lib/db';

import { resolveTenant } from '../middlewares/resolveTenant';
import { telegramAuth } from '../api/telegramAuth';



export const ownerOrdersRouter = Router();
ownerOrdersRouter.use(telegramAuth);


function int(v: any, d: number) { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : d; }


// ---------- Shop Orders (OWNER side) ----------
ownerOrdersRouter.get("/shop/:slug/orders", resolveTenant, async (req: any, res) => {
  try {
    const tenantId = req.tenantId as string;
    const rawTake =
      (req.query.take as string | undefined) ??
      (req.query.limit as string | undefined);
    const take = int(rawTake, 50);

    // TODO (optional): verify req.userId has OWNER/HELPER role for this tenant
    // const userId = req.userId!;
    // const membership = await db.membership.findFirst({ where: { tenantId, userId } });
    // if (!membership || membership.role !== "OWNER") return res.status(403).json({ error: "forbidden" });

    const orders = await db.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take,
    });

    res.json(orders); // same shape your frontend Order type expects
  } catch (e: any) {
    console.error("[shop orders] list error", e);
    res.status(400).json({ error: e?.message || "shop_orders_failed" });
  }
});

ownerOrdersRouter.patch(
  "/shop/:slug/orders/:orderId",
  resolveTenant,
  async (req, res) => {
    try {
      const { orderId } = req.params as { orderId: string };
      const { status } = req.body as { status?: string };

      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }

      const allowed = ["pending", "paid", "shipped", "completed", "cancelled"];
      if (!allowed.includes(status)) {
        return res
          .status(400)
          .json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` });
      }

      const tenantId = (req as any).tenantId || (req as any).tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant not resolved" });
      }

      // 🔹 Load existing order to check current status
      const existing = await db.order.findFirst({
        where: {
          id: orderId,
          tenantId,
        },
      });

      if (!existing) {
        return res.status(404).json({ error: "Order not found" });
      }

      // 🔒 Business rule:
      // once it's NOT pending anymore, never allow going back to pending
      if (status === "pending" && existing.status !== "pending") {
        return res.status(400).json({
          error: "Cannot move this order back to pending once it has been paid or processed.",
        });
      }

      const updated = await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: status as any, // works for now with your current schema
        },
      });

      return res.json(updated);
    } catch (err) {
      console.error("PATCH /shop/:slug/orders/:orderId error", err);
      return res.status(500).json({ error: "Failed to update order status" });
    }
  }
);

ownerOrdersRouter.get("/shop/:slug/orders/:id", resolveTenant, async (req: any, res) => {
  try {
    const tenantId = req.tenantId as string;
    const id = String(req.params.id);

    // Again: this is owner view → filter by tenantId, not by userId
    const order = await db.order.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ error: "not found" });

    res.json(order);
  } catch (e: any) {
    console.error("[shop orders] get error", e);
    res.status(400).json({ error: e?.message || "shop_order_failed" });
  }
});