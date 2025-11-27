// Seed 30 products for testing
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const TENANT_ID = 'cmhlr8jpm0003f6x4cawg6sz7';

const CATEGORIES = {
  vehicles: 'cmhm141gs0001f6x4szm4clwf',
  motorbikes: 'cmhm141hs000df6x4h7eoebol',
  phones: 'cmhm141jh001tf6x46vaoujrn',
};

const VEHICLE_PRODUCTS = [
  { title: 'Toyota Corolla 2020', price: 450000, description: 'Well maintained sedan, low mileage' },
  { title: 'Honda Civic 2019', price: 420000, description: 'Excellent condition, single owner' },
  { title: 'Nissan Altima 2021', price: 480000, description: 'Like new, full service history' },
  { title: 'Hyundai Elantra 2018', price: 380000, description: 'Reliable family car' },
  { title: 'Mazda 3 2020', price: 410000, description: 'Sporty and fuel efficient' },
  { title: 'Volkswagen Jetta 2019', price: 430000, description: 'German engineering, great condition' },
  { title: 'Kia Optima 2020', price: 400000, description: 'Comfortable and spacious' },
  { title: 'Subaru Impreza 2021', price: 460000, description: 'AWD, perfect for all weather' },
  { title: 'Ford Focus 2018', price: 360000, description: 'Economical and practical' },
  { title: 'Chevrolet Cruze 2019', price: 390000, description: 'American classic, well maintained' },
];

const MOTORBIKE_PRODUCTS = [
  { title: 'Honda CBR 250R', price: 85000, description: 'Sport bike, excellent for beginners' },
  { title: 'Yamaha YZF-R3', price: 95000, description: 'Powerful and agile' },
  { title: 'Kawasaki Ninja 300', price: 92000, description: 'Iconic sport bike' },
  { title: 'Suzuki GSX-R150', price: 78000, description: 'Lightweight and fast' },
  { title: 'Bajaj Pulsar 200NS', price: 65000, description: 'Great for city riding' },
  { title: 'TVS Apache RTR 160', price: 58000, description: 'Reliable commuter bike' },
  { title: 'Hero Splendor Plus', price: 45000, description: 'Fuel efficient, perfect for daily use' },
  { title: 'Royal Enfield Classic 350', price: 120000, description: 'Vintage style, powerful engine' },
  { title: 'KTM Duke 200', price: 110000, description: 'Street fighter, aggressive styling' },
  { title: 'Honda Activa 125', price: 52000, description: 'Popular scooter, comfortable ride' },
];

const PHONE_PRODUCTS = [
  { title: 'iPhone 14 Pro Max', price: 65000, description: '256GB, Space Black, like new' },
  { title: 'Samsung Galaxy S23 Ultra', price: 58000, description: '512GB, Phantom Black' },
  { title: 'Google Pixel 7 Pro', price: 48000, description: '128GB, Obsidian' },
  { title: 'OnePlus 11', price: 42000, description: '256GB, Titan Black' },
  { title: 'Xiaomi 13 Pro', price: 45000, description: '256GB, Ceramic White' },
  { title: 'iPhone 13', price: 52000, description: '128GB, Midnight, excellent condition' },
  { title: 'Samsung Galaxy A54', price: 28000, description: '128GB, Awesome Violet' },
  { title: 'Oppo Find X5 Pro', price: 50000, description: '256GB, Glaze Black' },
  { title: 'Vivo X90 Pro', price: 47000, description: '256GB, Legendary Black' },
  { title: 'Realme GT 3', price: 35000, description: '256GB, Booster Black' },
];

async function seedProducts() {
  console.log('🌱 Starting product seeding...\n');

  // Check if tenant exists
  const tenant = await db.tenant.findUnique({
    where: { id: TENANT_ID },
    select: { id: true, name: true, slug: true }
  });

  if (!tenant) {
    console.error(`❌ Tenant ${TENANT_ID} not found!`);
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.slug})\n`);

  let created = 0;

  // Create vehicle products
  console.log('🚗 Creating vehicle products...');
  for (const product of VEHICLE_PRODUCTS) {
    await db.product.create({
      data: {
        ...product,
        tenantId: TENANT_ID,
        categoryId: CATEGORIES.vehicles,
        active: true,
        publishToUniversal: true,
        reviewStatus: 'approved',
        stock: Math.floor(Math.random() * 5) + 1,
        currency: 'ETB',
      }
    });
    created++;
    console.log(`  ✓ ${product.title}`);
  }

  // Create motorbike products
  console.log('\n🏍️  Creating motorbike products...');
  for (const product of MOTORBIKE_PRODUCTS) {
    await db.product.create({
      data: {
        ...product,
        tenantId: TENANT_ID,
        categoryId: CATEGORIES.motorbikes,
        active: true,
        publishToUniversal: true,
        reviewStatus: 'approved',
        stock: Math.floor(Math.random() * 5) + 1,
        currency: 'ETB',
      }
    });
    created++;
    console.log(`  ✓ ${product.title}`);
  }

  // Create phone products
  console.log('\n📱 Creating phone products...');
  for (const product of PHONE_PRODUCTS) {
    await db.product.create({
      data: {
        ...product,
        tenantId: TENANT_ID,
        categoryId: CATEGORIES.phones,
        active: true,
        publishToUniversal: true,
        reviewStatus: 'approved',
        stock: Math.floor(Math.random() * 10) + 1,
        currency: 'ETB',
      }
    });
    created++;
    console.log(`  ✓ ${product.title}`);
  }

  console.log(`\n✅ Successfully created ${created} products!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Vehicles: ${VEHICLE_PRODUCTS.length}`);
  console.log(`   - Motorbikes: ${MOTORBIKE_PRODUCTS.length}`);
  console.log(`   - Phones: ${PHONE_PRODUCTS.length}`);
  console.log(`   - Total: ${created}`);

  await db.$disconnect();
}

seedProducts().catch((error) => {
  console.error('❌ Error seeding products:', error);
  process.exit(1);
});
