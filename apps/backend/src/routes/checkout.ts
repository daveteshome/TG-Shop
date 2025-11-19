import { Router } from "express";
import { getTenantId, getTenantSlugFromReq } from '../services/tenant.util';
import { OrdersService } from '../services/orders.service';
import { db } from '../lib/db';

export const checkoutRouter = Router();


// ---------- Checkout / Buy Now ----------
checkoutRouter.post('/checkout', async (req: any, res) => {
  const userId = req.userId!;
  const { shippingAddress, note } = req.body || {};

  try {
    // 🔹 Resolve the tenant from slug (same idea as /cart)
    const slug = getTenantSlugFromReq(req);
    if (!slug) {
      return res.status(400).json({ error: 'tenant_slug_required' });
    }

    const tenantId = await getTenantId(slug);

    // 🔹 Create order using the correct tenant
    const order = await OrdersService.checkoutFromCartWithDetails(
      userId,
      { shippingAddress, note },
      tenantId, // 👈 pass the tenant override
    );

    // 🔹 Normalize response to what frontend expects
    const total =
      (order.total as any)?.toString
        ? (order.total as any).toString()
        : String(order.total);

    res.json({
      orderId: order.id,
      shortCode: order.shortCode ?? null,
      status: order.status,
      total,
      currency: order.currency,
    });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'checkout failed' });
  }
});


// Single-item flow but same validations live in OrdersService
checkoutRouter.post('/buy-now', async (req: any, res) => {
  const userId = req.userId!;
  const { productId, shippingAddress, note } = req.body || {};
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const p = await db.product.findUnique({ where: { id: String(productId) } });
  if (!p || !p.active) return res.status(400).json({ error: 'product unavailable' });
  try {
    const order = await OrdersService.createSingleItemPending(
   userId,
   { id: p.id, title: p.title, price: p.price.toNumber(), currency: p.currency },
   { shippingAddress, note }
 );
    res.json(order);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'buy-now failed' });
  }
});