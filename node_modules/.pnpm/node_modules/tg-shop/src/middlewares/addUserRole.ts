// apps/backend/src/middlewares/addUserRole.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';

export async function addUserRole(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const tenantId = req.tenantId;

    if (!userId || !tenantId) {
      req.userRole = null;
      return next();
    }

    const membership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    req.userRole = membership?.role || null;
    next();
  } catch (error) {
    console.error('Error in addUserRole middleware:', error);
    req.userRole = null;
    next();
  }
}
