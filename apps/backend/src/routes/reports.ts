// Public Reports API
import { Router } from 'express';
import { db } from '../lib/db';
import { telegramAuth } from '../api/telegramAuth';

export const reportsRouter = Router();

reportsRouter.use(telegramAuth);

// POST /api/reports/product/:id - Report a product
reportsRouter.post('/reports/product/:id', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const reporterTgId = req.userId;

    if (!reporterTgId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const product = await db.product.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const report = await db.report.create({
      data: {
        target: 'PRODUCT',
        tenantId: product.tenantId,
        productId: id,
        reporterTgId,
        reason: reason || null,
      },
    });

    res.json({ report, message: 'Report submitted successfully' });
  } catch (e) {
    next(e);
  }
});

// POST /api/reports/shop/:slug - Report a shop
reportsRouter.post('/reports/shop/:slug', async (req: any, res, next) => {
  try {
    const { slug } = req.params;
    const { reason } = req.body;
    const reporterTgId = req.userId;

    if (!reporterTgId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const report = await db.report.create({
      data: {
        target: 'TENANT',
        tenantId: tenant.id,
        reporterTgId,
        reason: reason || null,
      },
    });

    res.json({ report, message: 'Report submitted successfully' });
  } catch (e) {
    next(e);
  }
});
