// apps/backend/src/index.ts
import 'dotenv/config';
import { createApp } from './app';
import { db } from "../src/lib/db";

import { seedCategories } from "../../backend/prisma/seed";

async function maybeSeedCategories() {
  const env = process.env.NODE_ENV || "development"; // treat undefined as dev
  console.log(`[seed] NODE_ENV=${env}`);
  const count = await db.category.count();
  console.log(`[seed] Category.count=${count}`);

  // Seed if empty or explicitly asked to reset
  if (count === 0 || String(process.env.SEED_STRATEGY).toLowerCase() === "reset") {
    console.log("[seed] Seeding categories… strategy=", process.env.SEED_STRATEGY || "reconcile");
    await seedCategories();
    const after = await db.category.count();
    console.log(`[seed] Done. Category.count=${after}`);
  } else {
    console.log("[seed] Skipped (table not empty and no reset requested).");
  }
}

(async () => {
  try {
    await maybeSeedCategories();
    const { start } = createApp();

    // Start the HTTP server + webhook (handled inside start()).
    await start();

    // Basic safety nets
    process.on('unhandledRejection', (reason) => {
      console.error('[backend] Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('[backend] Uncaught Exception:', err);
      // Consider whether you want to exit here or keep running.
      // process.exit(1);
    });

    // Graceful shutdown hooks (optional)
    const shutdown = (signal: string) => {
      console.log(`[backend] Received ${signal}. Shutting down gracefully...`);
      // If you later return a server instance from createApp(), you can close it here.
      // Also consider deleting webhook if you switch to long polling, etc.
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[backend] Fatal startup error:', err);
    process.exit(1);
  }
})();
