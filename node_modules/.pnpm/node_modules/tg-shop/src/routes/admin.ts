// Platform Admin API Routes
import { Router } from 'express';
import { db } from '../lib/db';
import { telegramAuth } from '../api/telegramAuth';
import { publicImageUrl } from '../lib/r2';
import { extFromMime } from './utils/ext';
import { cleanupExpiredShops } from '../services/cleanup.service';

export const adminRouter = Router();

// Middleware: Check if user is platform admin
async function requirePlatformAdmin(req: any, res: any, next: any) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const user = await db.user.findUnique({
      where: { tgId: userId },
      select: { platformRole: true },
    });

    if (!user || user.platformRole !== 'ADMIN') {
      return res.status(403).json({ error: 'forbidden_admin_only' });
    }

    next();
  } catch (e) {
    next(e);
  }
}

adminRouter.use(telegramAuth);
adminRouter.use(requirePlatformAdmin);

// GET /admin/stats - Platform overview
adminRouter.get('/admin/stats', async (req, res, next) => {
  try {
    const [
      totalShops,
      activeShops,
      totalUsers,
      totalProducts,
      totalOrders,
      recentShops,
      recentUsers,
      topShops,
    ] = await Promise.all([
      // Total shops
      db.tenant.count(),
      
      // Active shops
      db.tenant.count({ where: { status: 'open' } }),
      
      // Total users
      db.user.count(),
      
      // Total products
      db.product.count({ where: { active: true } }),
      
      // Total orders
      db.order.count(),
      
      // Recent shops (last 10)
      db.tenant.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
      }),
      
      // Recent users (last 10)
      db.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          tgId: true,
          name: true,
          username: true,
          createdAt: true,
        },
      }),
      
      // Top shops by revenue
      db.order.groupBy({
        by: ['tenantId'],
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    // Calculate total revenue
    const allOrders = await db.order.findMany({
      where: { status: { in: ['paid', 'completed'] } },
      select: { total: true },
    });
    const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total), 0);

    // Get tenant details for top shops
    const topShopsWithDetails = await Promise.all(
      topShops.map(async (shop) => {
        const tenant = await db.tenant.findUnique({
          where: { id: shop.tenantId },
          select: { id: true, name: true, slug: true },
        });
        return {
          ...tenant,
          revenue: Number(shop._sum.total || 0),
          ordersCount: shop._count.id,
        };
      })
    );

    res.json({
      totalShops,
      activeShops,
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentShops: recentShops.map((s) => ({
        ...s,
        productsCount: s._count.products,
        ordersCount: s._count.orders,
      })),
      recentUsers,
      topShops: topShopsWithDetails,
    });
  } catch (e) {
    next(e);
  }
});

// GET /admin/shops - List all shops
adminRouter.get('/admin/shops', async (req, res, next) => {
  try {
    const shops = await db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
        memberships: {
          where: { role: 'OWNER' },
          take: 1,
          select: {
            user: {
              select: {
                tgId: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Calculate revenue for each shop
    const shopsWithRevenue = await Promise.all(
      shops.map(async (shop) => {
        const orders = await db.order.findMany({
          where: {
            tenantId: shop.id,
            status: { in: ['paid', 'completed'] },
          },
          select: { total: true },
        });
        const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

        return {
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
          status: shop.status,
          createdAt: shop.createdAt,
          productsCount: shop._count.products,
          ordersCount: shop._count.orders,
          revenue,
          owner: shop.memberships[0]?.user || null,
        };
      })
    );

    res.json({ shops: shopsWithRevenue });
  } catch (e) {
    next(e);
  }
});

// GET /admin/users - List all users
adminRouter.get('/admin/users', async (req, res, next) => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        tgId: true,
        name: true,
        username: true,
        phone: true,
        platformRole: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            memberships: {
              where: { role: 'OWNER' },
            },
          },
        },
      },
    });

    // Calculate total spent for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orders = await db.order.findMany({
          where: {
            userId: user.tgId,
            status: { in: ['paid', 'completed'] },
          },
          select: { total: true },
        });
        const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);

        return {
          ...user,
          shopsOwned: user._count.memberships,
          ordersCount: user._count.orders,
          totalSpent,
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (e) {
    next(e);
  }
});

// GET /admin/products - List all products
adminRouter.get('/admin/products', async (req, res, next) => {
  try {
    const products = await db.product.findMany({
      where: { publishToUniversal: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        stock: true,
        isPublished: true,
        publishToUniversal: true,
        reviewStatus: true,
        createdAt: true,
        categoryId: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        images: {
          take: 1,
          orderBy: { position: 'asc' },
          select: {
            imageId: true,
            url: true,
            image: { select: { mime: true } },
          },
        },
      },
    });

    // Add image URLs
    const productsWithImages = products.map((p) => ({
      ...p,
      images: p.images.map((img) => {
        if (img.imageId) {
          const ext = extFromMime(img.image?.mime);
          return { webUrl: publicImageUrl(img.imageId, ext) };
        }
        if (img.url) {
          return { webUrl: img.url };
        }
        return { webUrl: null };
      }),
    }));

    res.json({ products: productsWithImages });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/products/:id/review - Approve/reject product
adminRouter.patch('/admin/products/:id/review', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { reviewStatus } = req.body;

    if (!['approved', 'rejected'].includes(reviewStatus)) {
      return res.status(400).json({ error: 'invalid_review_status' });
    }

    const product = await db.product.update({
      where: { id },
      data: {
        reviewStatus,
        reviewedAt: new Date(),
        reviewedBy: req.userId,
      },
    });

    res.json({ product });
  } catch (e) {
    next(e);
  }
});

// DELETE /admin/products/:id - Delete product (admin only)
adminRouter.delete('/admin/products/:id', async (req: any, res, next) => {
  try {
    const { id } = req.params;

    // Delete the product (cascade will handle related records)
    await db.product.delete({
      where: { id },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/shops/:slug/status - Update shop status
adminRouter.patch('/admin/shops/:slug/status', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    if (!['open', 'closed', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'invalid_status' });
    }

    const shop = await db.tenant.update({
      where: { slug },
      data: { status },
    });

    res.json({ shop });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/users/:tgId/role - Update user platform role
adminRouter.patch('/admin/users/:tgId/role', async (req, res, next) => {
  try {
    const { tgId } = req.params;
    const { platformRole } = req.body;

    if (!['USER', 'MOD', 'ADMIN'].includes(platformRole)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    const user = await db.user.update({
      where: { tgId },
      data: { platformRole },
    });

    res.json({ user });
  } catch (e) {
    next(e);
  }
});

// DELETE /admin/products/:id - Delete product (admin override)
adminRouter.delete('/admin/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await db.product.update({
      where: { id },
      data: {
        active: false,
        isPublished: false,
        publishToUniversal: false,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// GET /admin/shops/:slug/detail - Shop detail
adminRouter.get('/admin/shops/:slug/detail', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const shop = await db.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        autoApproveProducts: true,
        description: true,
        location: true,
        publicPhone: true,
        publicTelegramLink: true,
        createdAt: true,
        memberships: {
          where: { role: 'OWNER' },
          take: 1,
          select: {
            user: {
              select: {
                tgId: true,
                name: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
            memberships: true,
          },
        },
        products: {
          where: { active: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            stock: true,
            createdAt: true,
          },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({ error: 'shop_not_found' });
    }

    // Calculate stats
    const activeProducts = await db.product.count({
      where: { tenantId: shop.id, active: true },
    });

    const completedOrders = await db.order.count({
      where: { tenantId: shop.id, status: 'completed' },
    });

    const revenueOrders = await db.order.findMany({
      where: {
        tenantId: shop.id,
        status: { in: ['paid', 'completed'] },
      },
      select: { total: true },
    });
    const revenue = revenueOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const pendingProducts = await db.product.count({
      where: {
        tenantId: shop.id,
        publishToUniversal: true,
        reviewStatus: 'pending',
      },
    });

    res.json({
      ...shop,
      owner: shop.memberships[0]?.user || null,
      stats: {
        productsCount: shop._count.products,
        activeProducts,
        ordersCount: shop._count.orders,
        completedOrders,
        revenue,
        members: shop._count.memberships,
        pendingProducts,
      },
      recentProducts: shop.products,
      recentOrders: shop.orders,
    });
  } catch (e) {
    next(e);
  }
});

// GET /admin/users/:tgId/detail - User detail
adminRouter.get('/admin/users/:tgId/detail', async (req, res, next) => {
  try {
    const { tgId } = req.params;

    const user = await db.user.findUnique({
      where: { tgId },
      select: {
        tgId: true,
        name: true,
        username: true,
        phone: true,
        platformRole: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            tenant: {
              select: {
                id: true,
                slug: true,
                name: true,
                _count: {
                  select: {
                    products: true,
                    orders: true,
                  },
                },
              },
            },
          },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            currency: true,
            status: true,
            createdAt: true,
            tenant: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            favorites: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    // Calculate total spent
    const spentOrders = await db.order.findMany({
      where: {
        userId: tgId,
        status: { in: ['paid', 'completed'] },
      },
      select: { total: true },
    });
    const totalSpent = spentOrders.reduce((sum, o) => sum + Number(o.total), 0);

    // Count shops owned
    const shopsOwned = user.memberships.filter((m) => m.role === 'OWNER').length;

    res.json({
      ...user,
      stats: {
        shopsOwned,
        ordersCount: user._count.orders,
        totalSpent,
        favoritesCount: user._count.favorites,
      },
      shops: user.memberships.map((m) => ({
        id: m.tenant.id,
        slug: m.tenant.slug,
        name: m.tenant.name,
        role: m.role,
        productsCount: m.tenant._count.products,
        ordersCount: m.tenant._count.orders,
      })),
      recentOrders: user.orders.map((o) => ({
        ...o,
        shopName: o.tenant.name,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// DELETE /admin/shops/:slug - Delete shop
adminRouter.delete('/admin/shops/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    await db.tenant.delete({
      where: { slug },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /admin/users/:tgId/ban - Ban user
adminRouter.post('/admin/users/:tgId/ban', async (req, res, next) => {
  try {
    const { tgId } = req.params;

    // Close all user's shops
    const memberships = await db.membership.findMany({
      where: { userId: tgId, role: 'OWNER' },
      select: { tenantId: true },
    });

    for (const m of memberships) {
      await db.tenant.update({
        where: { id: m.tenantId },
        data: { status: 'closed' },
      });
    }

    // You could also add a "banned" field to User model
    // For now, we just close their shops

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/shops/:slug/trusted - Grant/revoke trusted status
adminRouter.patch('/admin/shops/:slug/trusted', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { autoApproveProducts } = req.body;

    if (typeof autoApproveProducts !== 'boolean') {
      return res.status(400).json({ error: 'invalid_value' });
    }

    const shop = await db.tenant.update({
      where: { slug },
      data: { autoApproveProducts },
    });

    res.json({ shop });
  } catch (e) {
    next(e);
  }
});


// GET /admin/reports - List all reports
adminRouter.get('/admin/reports', async (req, res, next) => {
  try {
    const reports = await db.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json({ reports });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/reports/:id/resolve - Mark report as resolved
adminRouter.patch('/admin/reports/:id/resolve', async (req: any, res, next) => {
  try {
    const { id } = req.params;

    const report = await db.report.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedBy: req.userId,
      },
    });

    res.json({ report });
  } catch (e) {
    next(e);
  }
});


// POST /api/reports/product/:id - Report a product
adminRouter.post('/reports/product/:id', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const reporterTgId = req.userId;

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

    res.json({ report });
  } catch (e) {
    next(e);
  }
});

// POST /api/reports/shop/:slug - Report a shop
adminRouter.post('/reports/shop/:slug', async (req: any, res, next) => {
  try {
    const { slug } = req.params;
    const { reason } = req.body;
    const reporterTgId = req.userId;

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

    res.json({ report });
  } catch (e) {
    next(e);
  }
});


// GET /admin/universal/stats - Universal shop statistics
adminRouter.get('/admin/universal/stats', async (req, res, next) => {
  try {
    const [
      totalProducts,
      approvedProducts,
      pendingProducts,
      rejectedProducts,
      totalShopsPublishing,
      trustedShops,
      totalViews,
      totalContacts,
      categoryStats,
    ] = await Promise.all([
      // Total products requesting universal
      db.product.count({ where: { publishToUniversal: true } }),
      
      // Approved products
      db.product.count({ 
        where: { publishToUniversal: true, reviewStatus: 'approved' } 
      }),
      
      // Pending products
      db.product.count({ 
        where: { publishToUniversal: true, reviewStatus: 'pending' } 
      }),
      
      // Rejected products
      db.product.count({ 
        where: { publishToUniversal: true, reviewStatus: 'rejected' } 
      }),
      
      // Shops publishing to universal
      db.tenant.count({ where: { publishUniversal: true } }),
      
      // Trusted shops
      db.tenant.count({ where: { autoApproveProducts: true } }),
      
      // Total views (if tracked)
      db.productView.count({ where: { source: 'universal' } }),
      
      // Total contacts (if tracked)
      db.contactIntent.count(),
      
      // Products by category
      db.product.groupBy({
        by: ['categoryId'],
        where: { publishToUniversal: true },
        _count: { id: true },
      }),
    ]);

    // Get category details
    const categoryIds = categoryStats
      .filter((c) => c.categoryId)
      .map((c) => c.categoryId!);
    
    const categories = await db.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    // Count approved products per category
    const approvedByCategory = await db.product.groupBy({
      by: ['categoryId'],
      where: { 
        publishToUniversal: true, 
        reviewStatus: 'approved',
      },
      _count: { id: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const approvedMap = new Map(
      approvedByCategory.map((c) => [c.categoryId, c._count.id])
    );

    const categoriesWithStats = categoryStats
      .filter((c) => c.categoryId)
      .map((c) => ({
        id: c.categoryId!,
        name: categoryMap.get(c.categoryId!) || 'Unknown',
        productsCount: c._count.id,
        approvedCount: approvedMap.get(c.categoryId!) || 0,
      }))
      .sort((a, b) => b.productsCount - a.productsCount)
      .slice(0, 10); // Top 10 categories

    res.json({
      stats: {
        totalProducts,
        approvedProducts,
        pendingProducts,
        rejectedProducts,
        totalShopsPublishing,
        trustedShops,
        totalViews,
        totalContacts,
      },
      categories: categoriesWithStats,
    });
  } catch (e) {
    next(e);
  }
});


// GET /admin/categories - List all categories with hierarchy
adminRouter.get('/admin/categories', async (req, res, next) => {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ level: 'asc' }, { position: 'asc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Build hierarchy
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id);
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    res.json({ categories: rootCategories });
  } catch (e) {
    next(e);
  }
});

// POST /admin/categories - Create category
adminRouter.post('/admin/categories', async (req, res, next) => {
  try {
    const { name, slug, icon, parentId, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Generate slug if not provided
    const categorySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Calculate level
    let level = 0;
    if (parentId) {
      const parent = await db.category.findUnique({
        where: { id: parentId },
        select: { level: true },
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const category = await db.category.create({
      data: {
        name,
        slug: categorySlug,
        icon: icon || null,
        parentId: parentId || null,
        level,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.json({ category });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/categories/:id - Update category
adminRouter.patch('/admin/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, icon, parentId, isActive } = req.body;

    // Calculate new level if parent changed
    let level = 0;
    if (parentId) {
      const parent = await db.category.findUnique({
        where: { id: parentId },
        select: { level: true },
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const category = await db.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(parentId !== undefined && { parentId: parentId || null, level }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ category });
  } catch (e) {
    next(e);
  }
});

// DELETE /admin/categories/:id - Delete category
adminRouter.delete('/admin/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Delete category (cascade will handle children)
    await db.category.delete({
      where: { id },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ===== Category Requests Management =====

// GET /admin/category-requests - List all category requests
adminRouter.get('/admin/category-requests', async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const requests = await db.categoryRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Get tenant names for display
    const tenantIds = [...new Set(requests.map(r => r.tenantId))];
    const tenants = await db.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, slug: true },
    });
    const tenantMap = new Map(tenants.map(t => [t.id, t]));

    const enriched = requests.map(r => ({
      ...r,
      tenant: tenantMap.get(r.tenantId),
    }));

    res.json({ requests: enriched });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/category-requests/:id/approve - Approve a category request
adminRouter.patch('/admin/category-requests/:id/approve', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, parentId } = req.body;
    const userId = req.userId;

    const request = await db.categoryRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Use edited values if provided, otherwise use original request values
    const finalName = name || request.name;
    const finalDescription = description !== undefined ? description : request.description;
    const finalIcon = icon !== undefined ? icon : request.icon;
    const finalParentId = parentId !== undefined ? parentId : request.parentId;

    // Create the category
    const category = await db.category.create({
      data: {
        name: finalName,
        slug: finalName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: finalDescription,
        icon: finalIcon,
        parentId: finalParentId,
        isActive: true,
      },
    });

    // Update the request
    await db.categoryRequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: userId,
        categoryId: category.id,
      },
    });

    res.json({ success: true, category });
  } catch (e) {
    next(e);
  }
});

// PATCH /admin/category-requests/:id/reject - Reject a category request
adminRouter.patch('/admin/category-requests/:id/reject', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userId = req.userId;

    const request = await db.categoryRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    await db.categoryRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: userId,
        rejectNote: note || null,
      },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});


// GET /admin/deleted-shops - List all deleted shops
adminRouter.get('/admin/deleted-shops', async (req, res, next) => {
  try {
    const deletedShops = await db.tenant.findMany({
      where: {
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
      include: {
        memberships: {
          where: { role: 'OWNER' },
          include: {
            user: {
              select: {
                tgId: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Calculate days since deletion and days remaining
    const shopsWithDetails = deletedShops.map((shop) => {
      const deletedAt = shop.deletedAt!;
      const daysSinceDeletion = Math.floor(
        (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = Math.max(0, 30 - daysSinceDeletion);
      const isExpired = daysSinceDeletion > 30;

      return {
        id: shop.id,
        slug: shop.slug,
        name: shop.name,
        deletedAt: deletedAt.toISOString(),
        daysSinceDeletion,
        daysRemaining,
        isExpired,
        owner: shop.memberships[0]?.user || null,
      };
    });

    res.json({ deletedShops: shopsWithDetails });
  } catch (e) {
    next(e);
  }
});

// POST /admin/cleanup/expired - Delete all shops older than 30 days
adminRouter.post('/admin/cleanup/expired', async (req, res, next) => {
  try {
    const result = await cleanupExpiredShops();
    
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      shopIds: result.shopIds,
      message: result.deletedCount === 0 
        ? 'No expired shops found' 
        : `Successfully deleted ${result.deletedCount} expired shop(s)`,
    });
  } catch (e) {
    next(e);
  }
});

// DELETE /admin/shops/:slug/permanent - Permanently delete a specific shop (admin override)
adminRouter.delete('/admin/shops/:slug/permanent', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const shop = await db.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, deletedAt: true },
    });

    if (!shop) {
      return res.status(404).json({ error: 'shop_not_found' });
    }

    // Delete all associated data in transaction
    await db.$transaction(async (tx) => {
      // First, get all product IDs from this shop
      const products = await tx.product.findMany({
        where: { tenantId: shop.id },
        select: { id: true },
      });
      const productIds = products.map(p => p.id);

      // Delete cart items that reference these products
      if (productIds.length > 0) {
        await tx.cartItem.deleteMany({
          where: { productId: { in: productIds } },
        });
      }

      // Delete order items that reference these products
      if (productIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { productId: { in: productIds } },
        });
      }

      // Delete products
      await tx.product.deleteMany({
        where: { tenantId: shop.id },
      });

      // Delete orders
      await tx.order.deleteMany({
        where: { tenantId: shop.id },
      });

      // Delete memberships
      await tx.membership.deleteMany({
        where: { tenantId: shop.id },
      });

      // Delete images
      await tx.image.deleteMany({
        where: { tenantId: shop.id },
      });

      // Delete category requests
      await tx.categoryRequest.deleteMany({
        where: { tenantId: shop.id },
      });

      // Delete shop
      await tx.tenant.delete({
        where: { id: shop.id },
      });
    });

    res.json({
      success: true,
      message: `Shop "${shop.name}" permanently deleted`,
    });
  } catch (e) {
    next(e);
  }
});
