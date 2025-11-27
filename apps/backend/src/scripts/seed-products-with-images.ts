// Seed products with placeholder images
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { randomUUID } from 'crypto';

const db = new PrismaClient();

const TENANT_ID = 'cmhlr8jpm0003f6x4cawg6sz7';

const CATEGORIES = {
  vehicles: 'cmhm141gs0001f6x4szm4clwf',
  motorbikes: 'cmhm141hs000df6x4h7eoebol',
  phones: 'cmhm141jh001tf6x46vaoujrn',
};

// Unsplash image IDs for realistic product photos
const VEHICLE_IMAGES = [
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
  'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
  'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
  'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
  'https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800',
  'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
];

const MOTORBIKE_IMAGES = [
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
  'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800',
  'https://images.unsplash.com/photo-1599819177795-d9eb6c22e4b7?w=800',
  'https://images.unsplash.com/photo-1609630875303-2e4c14c8e1e0?w=800',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
  'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
  'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800',
];

const PHONE_IMAGES = [
  'https://images.unsplash.com/photo-1592286927505-4fd4d3d4ef9f?w=800',
  'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800',
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
  'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800',
  'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800',
  'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800',
  'https://images.unsplash.com/photo-1603921326210-6edd2d60ca68?w=800',
  'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800',
  'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=800',
];

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

async function createProductWithImage(
  productData: any,
  categoryId: string,
  imageUrl: string
) {
  // Create product
  const product = await db.product.create({
    data: {
      ...productData,
      tenantId: TENANT_ID,
      categoryId,
      active: true,
      publishToUniversal: true,
      reviewStatus: 'approved',
      stock: Math.floor(Math.random() * 10) + 1,
      currency: 'ETB',
    }
  });

  // Create image record with URL (no R2 upload needed for external URLs)
  await db.productImage.create({
    data: {
      productId: product.id,
      url: imageUrl,
      position: 0,
    }
  });

  return product;
}

async function seedProducts() {
  console.log('🌱 Starting product seeding with images...\n');

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
  console.log('🚗 Creating vehicle products with images...');
  for (let i = 0; i < VEHICLE_PRODUCTS.length; i++) {
    const product = VEHICLE_PRODUCTS[i];
    const imageUrl = VEHICLE_IMAGES[i % VEHICLE_IMAGES.length];
    await createProductWithImage(product, CATEGORIES.vehicles, imageUrl);
    created++;
    console.log(`  ✓ ${product.title} [with image]`);
  }

  // Create motorbike products
  console.log('\n🏍️  Creating motorbike products with images...');
  for (let i = 0; i < MOTORBIKE_PRODUCTS.length; i++) {
    const product = MOTORBIKE_PRODUCTS[i];
    const imageUrl = MOTORBIKE_IMAGES[i % MOTORBIKE_IMAGES.length];
    await createProductWithImage(product, CATEGORIES.motorbikes, imageUrl);
    created++;
    console.log(`  ✓ ${product.title} [with image]`);
  }

  // Create phone products
  console.log('\n📱 Creating phone products with images...');
  for (let i = 0; i < PHONE_PRODUCTS.length; i++) {
    const product = PHONE_PRODUCTS[i];
    const imageUrl = PHONE_IMAGES[i % PHONE_IMAGES.length];
    await createProductWithImage(product, CATEGORIES.phones, imageUrl);
    created++;
    console.log(`  ✓ ${product.title} [with image]`);
  }

  console.log(`\n✅ Successfully created ${created} products with images!`);
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
