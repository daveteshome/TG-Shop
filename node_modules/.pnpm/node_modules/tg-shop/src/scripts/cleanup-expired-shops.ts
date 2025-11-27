#!/usr/bin/env node
/**
 * Cleanup Script for Expired Shops
 * 
 * This script permanently deletes shops that have been soft-deleted for more than 30 days.
 * 
 * Usage:
 *   npm run cleanup:shops
 *   or
 *   node dist/scripts/cleanup-expired-shops.js
 * 
 * Can be scheduled as a cron job:
 *   0 2 * * * cd /path/to/app && npm run cleanup:shops
 *   (Runs daily at 2 AM)
 */

import { runCleanupJob } from "../services/cleanup.service";

async function main() {
  console.log("=".repeat(60));
  console.log("Starting Expired Shops Cleanup Job");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  try {
    const result = await runCleanupJob();
    console.log("");
    console.log("=".repeat(60));
    console.log("Result:", result);
    console.log("=".repeat(60));
    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("=".repeat(60));
    console.error("FATAL ERROR:", error);
    console.error("=".repeat(60));
    process.exit(1);
  }
}

main();
