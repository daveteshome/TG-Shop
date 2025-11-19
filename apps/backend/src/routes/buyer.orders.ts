// apps/backend/src/server/routes.ts
import { Router } from 'express';

import { OrdersService } from '../services/orders.service';
import { db } from '../lib/db';
import { telegramAuth } from '../api/telegramAuth';
import { getTenantId } from '../services/tenant.util';


export const buyerOrdersRouter = Router();
buyerOrdersRouter.use(telegramAuth);


function int(v: any, d: number) { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : d; }

// ---------- Orders ----------
buyerOrdersRouter.get("/orders", async (req: any, res) => {
  try {
    const userId = req.userId!;

    // support both ?take= and ?limit=
    const rawTake =
      (req.query.take as string | undefined) ??
      (req.query.limit as string | undefined);
    const take = int(rawTake, 20);

    // 👇 NEW: tenant_slug → tenantIdOverride
    const slugRaw = req.query.tenant_slug as string | undefined;
    const slug = slugRaw && slugRaw.trim() ? slugRaw.trim() : undefined;

    const tenantIdOverride = slug ? await getTenantId(slug) : undefined;

    const orders = await OrdersService.listUserOrders(
      userId,
      take,
      tenantIdOverride
    );

    // keep old response shape: plain array
    res.json(orders);
  } catch (e: any) {
    console.error("[orders] list error", e);
    res.status(400).json({ error: e?.message || "orders_failed" });
  }
});

buyerOrdersRouter.get("/orders/:id", async (req: any, res) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const order = await db.order.findUnique({
      where: { id, userId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: "not found" });
    res.json(order);
  } catch (e: any) {
    console.error("[orders] get error", e);
    res.status(400).json({ error: e?.message || "order_failed" });
  }
});