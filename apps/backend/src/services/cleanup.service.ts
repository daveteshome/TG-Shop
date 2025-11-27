// apps/backend/src/services/cleanup.service.ts
import { db } from "../lib/db";

/**
 * Permanently deletes shops that have been soft-deleted for more than 30 days
 * This includes deleting all associated data:
 * - Cart Items (that reference products)
 * - Order Items (that reference products)
 * - Products
 * - Orders
 * - Memberships
 * - Images
 * - Category Requests
 */
export async function cleanupExpiredShops(): Promise<{
  deletedCount: number;
  shopIds: string[];
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log(`[Cleanup] Starting cleanup job at ${new Date().toISOString()}`);
  console.log(`[Cleanup] Looking for shops deleted before ${thirtyDaysAgo.toISOString()}`);

  try {
    // Find shops that have been deleted for more than 30 days
    const expiredShops = await db.tenant.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        deletedAt: true,
      },
    });

    if (expiredShops.length === 0) {
      console.log("[Cleanup] No expired shops found");
      return { deletedCount: 0, shopIds: [] };
    }

    console.log(`[Cleanup] Found ${expiredShops.length} expired shops to delete`);

    const shopIds = expiredShops.map((s) => s.id);
    const deletedShopInfo = expiredShops.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      deletedAt: s.deletedAt,
    }));

    // Log shops being deleted
    console.log("[Cleanup] Deleting shops:", JSON.stringify(deletedShopInfo, null, 2));

    // Perform deletion in a transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // 1. Get all product IDs from these shops
      const products = await tx.product.findMany({
        where: { tenantId: { in: shopIds } },
        select: { id: true },
      });
      const productIds = products.map(p => p.id);

      // 2. Delete cart items that reference these products
      if (productIds.length > 0) {
        const deletedCartItems = await tx.cartItem.deleteMany({
          where: { productId: { in: productIds } },
        });
        console.log(`[Cleanup] Deleted ${deletedCartItems.count} cart items`);
      }

      // 3. Delete order items that reference these products
      if (productIds.length > 0) {
        const deletedOrderItems = await tx.orderItem.deleteMany({
          where: { productId: { in: productIds } },
        });
        console.log(`[Cleanup] Deleted ${deletedOrderItems.count} order items`);
      }

      // 4. Delete all products associated with these shops
      const deletedProducts = await tx.product.deleteMany({
        where: { tenantId: { in: shopIds } },
      });
      console.log(`[Cleanup] Deleted ${deletedProducts.count} products`);

      // 5. Delete all orders associated with these shops
      const deletedOrders = await tx.order.deleteMany({
        where: { tenantId: { in: shopIds } },
      });
      console.log(`[Cleanup] Deleted ${deletedOrders.count} orders`);

      // 6. Delete all memberships associated with these shops
      const deletedMemberships = await tx.membership.deleteMany({
        where: { tenantId: { in: shopIds } },
      });
      console.log(`[Cleanup] Deleted ${deletedMemberships.count} memberships`);

      // 7. Delete all images associated with these shops
      const deletedImages = await tx.image.deleteMany({
        where: { tenantId: { in: shopIds } },
      });
      console.log(`[Cleanup] Deleted ${deletedImages.count} images`);

      // 8. Delete all category requests associated with these shops
      const deletedCategoryRequests = await tx.categoryRequest.deleteMany({
        where: { tenantId: { in: shopIds } },
      });
      console.log(`[Cleanup] Deleted ${deletedCategoryRequests.count} category requests`);

      // 9. Finally, delete the shops themselves
      const deletedShops = await tx.tenant.deleteMany({
        where: { id: { in: shopIds } },
      });
      console.log(`[Cleanup] Deleted ${deletedShops.count} shops`);
    });

    console.log(`[Cleanup] Successfully deleted ${expiredShops.length} expired shops`);

    return {
      deletedCount: expiredShops.length,
      shopIds,
    };
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
    throw error;
  }
}

/**
 * Run cleanup and return a summary
 */
export async function runCleanupJob(): Promise<string> {
  try {
    const result = await cleanupExpiredShops();
    
    if (result.deletedCount === 0) {
      return "Cleanup completed: No expired shops found";
    }
    
    return `Cleanup completed: ${result.deletedCount} shop(s) permanently deleted`;
  } catch (error: any) {
    const errorMsg = `Cleanup failed: ${error?.message || "Unknown error"}`;
    console.error(errorMsg, error);
    return errorMsg;
  }
}
