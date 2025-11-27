// Category Request routes - for shop owners to request new categories
import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";

const router = Router();

// Apply auth middleware to all routes
router.use(telegramAuth);

// Shop owner: Create a category request
router.post("/", async (req: any, res) => {
  try {
    const { name, description, icon, parentId, tenantId } = req.body;
    const userId = req.userId;

    if (!name || !tenantId) {
      return res.status(400).json({ error: "Name and tenantId required" });
    }

    // Verify user is owner/admin of the shop
    const membership = await db.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!membership || !["OWNER", "HELPER"].includes(membership.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const request = await db.categoryRequest.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        parentId: parentId || null,
        requestedBy: userId,
        tenantId,
        status: "pending",
      },
    });

    res.json({ request });
  } catch (e: any) {
    console.error("Create category request error:", e);
    res.status(500).json({ error: e.message || "Failed to create request" });
  }
});

// Shop owner: Get their category requests
router.get("/my-requests", async (req: any, res) => {
  try {
    const userId = req.userId;
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({ error: "tenantId required" });
    }

    // Verify user is member of the shop
    const membership = await db.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!membership) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const requests = await db.categoryRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ requests });
  } catch (e: any) {
    console.error("Get my requests error:", e);
    res.status(500).json({ error: e.message || "Failed to load requests" });
  }
});

// Shop owner: Delete their category request
router.delete("/:id", async (req: any, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Find the request
    const request = await db.categoryRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Verify user is the requester or shop owner/admin
    const membership = await db.membership.findUnique({
      where: { tenantId_userId: { tenantId: request.tenantId, userId } },
    });

    const isRequester = request.requestedBy === userId;
    const isShopAdmin = membership && ["OWNER", "HELPER"].includes(membership.role);

    if (!isRequester && !isShopAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete the request
    await db.categoryRequest.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("Delete category request error:", e);
    res.status(500).json({ error: e.message || "Failed to delete request" });
  }
});

export default router;
