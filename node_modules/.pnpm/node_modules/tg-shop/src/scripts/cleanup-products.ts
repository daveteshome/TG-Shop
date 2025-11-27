// Clean up products without images
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function cleanupProducts() {
  console.log('🧹 Cleaning up products...\n');

  // Delete all products (this will cascade delete images too)
  const result = await db.product.deleteMany({});

  console.log(`✅ Deleted ${result.count} products\n`);

  await db.$disconnect();
}

cleanupProducts().catch((error) => {
  console.error('❌ Error cleaning up products:', error);
  process.exit(1);
});
