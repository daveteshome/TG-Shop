// apps/backend/src/routes/cleanup.ts
import { Router } from "express";
import { runCleanupJob } from "../services/cleanup.service";

export const cleanupRouter = Router();

/**
 * POST /api/cleanup/expired-shops
 * Manually trigger cleanup of expired shops
 * This endpoint can be called by:
 * 1. Admin users manually
 * 2. External cron job services (like cron-job.org, EasyCron, etc.)
 * 3. Cloud scheduler (AWS EventBridge, Google Cloud Scheduler, etc.)
 */
cleanupRouter.post("/cleanup/expired-shops", async (req, res, next) => {
  try {
    console.log("[Cleanup Endpoint] Cleanup job triggered");
    
    const result = await runCleanupJob();
    
    res.json({
      success: true,
      message: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Cleanup Endpoint] Error:", error);
    next(error);
  }
});

/**
 * GET /api/cleanup/status
 * Check cleanup service status
 */
cleanupRouter.get("/cleanup/status", async (req, res) => {
  res.json({
    status: "operational",
    message: "Cleanup service is ready",
    timestamp: new Date().toISOString(),
  });
});
