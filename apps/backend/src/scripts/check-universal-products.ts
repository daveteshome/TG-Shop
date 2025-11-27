// Script to check why products aren't showing in universal
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkUniversalProducts() {
  console.log('\n=== Checking Universal Products ===\n');

  // Total products
  const totalProducts = await db.product.count();
  console.log(`📦 Total products in database: ${totalProducts}`);

  // Active products
  const activeProducts = await db.product.count({ where: { active: true } });
  console.log(`✅ Active products: ${activeProducts}`);

  // Products with publishToUniversal
  const publishedToUniversal = await db.product.count({ 
    where: { publishToUniversal: true } 
  });
  console.log(`🌍 Published to universal: ${publishedToUniversal}`);

  // Products with approved status
  const approvedProducts = await db.product.count({ 
    where: { reviewStatus: 'approved' } 
  });
  console.log(`👍 Approved products: ${approvedProducts}`);

  // Products that meet ALL universal criteria
  const universalProducts = await db.product.count({
    where: {
      active: true,
      publishToUniversal: true,
      reviewStatus: 'approved',
      tenant: {
        publishUniversal: true,
        deletedAt: null
      }
    }
  });
  console.log(`🎯 Products meeting ALL universal criteria: ${universalProducts}`);

  // Check shops
  const totalShops = await db.tenant.count();
  console.log(`\n🏪 Total shops: ${totalShops}`);

  const publishedShops = await db.tenant.count({ 
    where: { publishUniversal: true, deletedAt: null } 
  });
  console.log(`🌍 Shops published to universal: ${publishedShops}`);

  // Sample products that DON'T meet criteria
  console.log('\n=== Sample Products NOT in Universal ===');
  const notInUniversal = await db.product.findMany({
    where: {
      NOT: {
        AND: [
          { active: true },
          { publishToUniversal: true },
          { reviewStatus: 'approved' },
          { tenant: { publishUniversal: true, deletedAt: null } }
        ]
      }
    },
    take: 5,
    select: {
      id: true,
      title: true,
      active: true,
      publishToUniversal: true,
      reviewStatus: true,
      tenant: {
        select: {
          name: true,
          publishUniversal: true,
          deletedAt: true
        }
      }
    }
  });

  notInUniversal.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.title}`);
    console.log(`   - active: ${p.active}`);
    console.log(`   - publishToUniversal: ${p.publishToUniversal}`);
    console.log(`   - reviewStatus: ${p.reviewStatus}`);
    console.log(`   - shop: ${p.tenant.name}`);
    console.log(`   - shop.publishUniversal: ${p.tenant.publishUniversal}`);
    console.log(`   - shop.deletedAt: ${p.tenant.deletedAt}`);
  });

  await db.$disconnect();
}

checkUniversalProducts().catch(console.error);
