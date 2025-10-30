import { Router } from "express";
import { db } from "../lib/db";
import { getTenantId } from "../services/tenant.util";

const router = Router();

// POST /api/contact-intent  { productId, type: "message"|"call", buyerTgId }
router.post("/", async (req, res) => {
  const tenantId = await getTenantId();
  const { productId, type, buyerTgId } = req.body || {};

  if (!productId || !buyerTgId || (type !== "message" && type !== "call")) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const blocked = await db.blockList.findFirst({ where: { tenantId, buyerTgId } });
  if (blocked) return res.status(403).json({ error: "Blocked by shop" });

  const product = await db.product.findFirst({ where: { tenantId, id: productId } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  await db.contactIntent.create({ data: { tenantId, productId, buyerTgId, type } });
  res.json({ ok: true });
});

export default router;
