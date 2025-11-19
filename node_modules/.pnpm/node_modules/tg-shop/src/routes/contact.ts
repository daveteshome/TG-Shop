import { Router } from "express";
import { db } from "../lib/db";

const contactRouter = Router();


// CONTACT INTENT from universal
contactRouter.post('/products/:productId/contact', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { type, buyerTgId } = req.body as { type: 'message' | 'call'; buyerTgId: string };

    if (type !== 'message' && type !== 'call') {
      return res.status(400).json({ error: 'type must be "message" or "call"' });
    }

    const product = await db.product.findUnique({ where: { id: productId }, select: { tenantId: true } });
    if (!product) return res.status(404).json({ error: 'not found' });

    await db.contactIntent.create({
      data: { tenantId: product.tenantId, productId, buyerTgId, type },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});


export default contactRouter;
