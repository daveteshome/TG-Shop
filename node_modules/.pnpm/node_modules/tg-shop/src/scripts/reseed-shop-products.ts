// Reseed products for an existing shop with R2 images
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { upsertImageFromBytes } from '../lib/r2';

const db = new PrismaClient();

const SHOP_ID = 'cmhlr8jpm0003f6x4cawg6sz7';
const PRODUCT_COUNT = 100;

// Expanded product data with more variety
const PRODUCT_DATA = {
  electronics: [
    { title: 'iPhone 14 Pro Max 256GB', price: 85000, desc: 'Brand new, Space Black, 1 year warranty', img: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=800&q=80' },
    { title: 'Samsung Galaxy S23 Ultra', price: 75000, desc: '512GB, Phantom Black, excellent condition', img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80' },
    { title: 'iPhone 13 128GB', price: 55000, desc: 'Midnight color, like new', img: 'https://images.unsplash.com/photo-1592286927505-4fd4d3d4ef9f?w=800&q=80' },
    { title: 'Xiaomi Redmi Note 12 Pro', price: 18000, desc: '256GB, great for daily use', img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80' },
    { title: 'Samsung Galaxy A54', price: 25000, desc: '128GB, Awesome Violet', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80' },
    { title: 'Tecno Spark 10 Pro', price: 12000, desc: 'Perfect budget phone', img: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&q=80' },
    { title: 'Infinix Note 30', price: 14000, desc: '256GB storage, fast charging', img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&q=80' },
    { title: 'Oppo Reno 8', price: 32000, desc: 'Great camera, 256GB', img: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80' },
    { title: 'Vivo Y35', price: 16000, desc: 'Long battery life', img: 'https://images.unsplash.com/photo-1603921326210-6edd2d60ca68?w=800&q=80' },
    { title: 'Realme 10 Pro', price: 22000, desc: '256GB, 5G ready', img: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800&q=80' },
    { title: 'Nokia G42', price: 15000, desc: 'Durable and reliable', img: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=800&q=80' },
    { title: 'OnePlus Nord CE 3', price: 28000, desc: 'Fast performance', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80' },
    { title: 'Google Pixel 7a', price: 42000, desc: 'Best camera in class', img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80' },
    { title: 'Motorola Edge 40', price: 35000, desc: 'Premium design', img: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&q=80' },
    { title: 'Itel S23', price: 8000, desc: 'Entry level smartphone', img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&q=80' },
    { title: 'iPhone 12 Pro', price: 62000, desc: '256GB, Pacific Blue', img: 'https://images.unsplash.com/photo-1592286927505-4fd4d3d4ef9f?w=800&q=80' },
    { title: 'Samsung Galaxy Z Flip 4', price: 68000, desc: 'Foldable phone, unique design', img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80' },
    { title: 'Huawei P50 Pro', price: 45000, desc: 'Excellent camera system', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80' },
    { title: 'Sony Xperia 5 IV', price: 52000, desc: 'Compact flagship', img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80' },
    { title: 'Asus ROG Phone 6', price: 58000, desc: 'Gaming powerhouse', img: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&q=80' },
  ],

  vehicles: [
    { title: 'Toyota Corolla 2020', price: 1200000, desc: 'Excellent condition, 45,000 km', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80' },
    { title: 'Toyota Yaris 2019', price: 950000, desc: 'Fuel efficient, well maintained', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80' },
    { title: 'Honda Civic 2021', price: 1350000, desc: 'Like new, single owner', img: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80' },
    { title: 'Hyundai Elantra 2018', price: 850000, desc: 'Reliable family car', img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80' },
    { title: 'Suzuki Swift 2020', price: 750000, desc: 'Compact and economical', img: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80' },
    { title: 'Nissan Sentra 2019', price: 980000, desc: 'Comfortable sedan', img: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80' },
    { title: 'Mazda 3 2020', price: 1100000, desc: 'Sporty and fun to drive', img: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80' },
    { title: 'Volkswagen Polo 2019', price: 820000, desc: 'German quality', img: 'https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80' },
    { title: 'Kia Rio 2020', price: 880000, desc: 'Great value', img: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80' },
    { title: 'Ford Focus 2018', price: 780000, desc: 'Practical hatchback', img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80' },
    { title: 'Toyota RAV4 2021', price: 1450000, desc: 'SUV, perfect for families', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80' },
    { title: 'Honda CR-V 2020', price: 1380000, desc: 'Spacious and comfortable', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80' },
    { title: 'Nissan X-Trail 2019', price: 1250000, desc: '7-seater SUV', img: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80' },
    { title: 'Mitsubishi Outlander 2020', price: 1180000, desc: 'Reliable SUV', img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80' },
    { title: 'Subaru Forester 2021', price: 1420000, desc: 'AWD, great for rough roads', img: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80' },
  ],

  motorbikes: [
    { title: 'Bajaj Boxer 150', price: 45000, desc: 'Most popular in Ethiopia', img: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80' },
    { title: 'TVS Apache RTR 160', price: 52000, desc: 'Sporty and reliable', img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80' },
    { title: 'Yamaha YBR 125', price: 48000, desc: 'Fuel efficient commuter', img: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80' },
    { title: 'Honda CG 125', price: 46000, desc: 'Classic and durable', img: 'https://images.unsplash.com/photo-1599819177795-d9eb6c22e4b7?w=800&q=80' },
    { title: 'Bajaj Pulsar 180', price: 58000, desc: 'Powerful engine', img: 'https://images.unsplash.com/photo-1609630875303-2e4c14c8e1e0?w=800&q=80' },
    { title: 'Hero Splendor Plus', price: 42000, desc: 'Best mileage', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    { title: 'Suzuki GS 150', price: 50000, desc: 'Smooth ride', img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80' },
    { title: 'Lifan KP 150', price: 38000, desc: 'Affordable option', img: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&q=80' },
    { title: 'Qlink Ranger 200', price: 55000, desc: 'Off-road capable', img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80' },
    { title: 'Dayun DY 150', price: 40000, desc: 'Good value for money', img: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80' },
    { title: 'Royal Enfield Classic 350', price: 125000, desc: 'Vintage style cruiser', img: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80' },
    { title: 'KTM Duke 200', price: 115000, desc: 'Street fighter bike', img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80' },
  ],

  fashion: [
    { title: 'Traditional Habesha Kemis', price: 3500, desc: 'Handwoven, beautiful design', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80' },
    { title: 'Men\'s Suit - Italian Style', price: 8500, desc: 'Perfect for weddings', img: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80' },
    { title: 'Women\'s Dress - Evening Gown', price: 4500, desc: 'Elegant and stylish', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80' },
    { title: 'Leather Jacket', price: 6500, desc: 'Genuine leather', img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80' },
    { title: 'Jeans - Levi\'s 501', price: 2800, desc: 'Classic fit', img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80' },
    { title: 'Nike Air Max Sneakers', price: 4200, desc: 'Comfortable and stylish', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
    { title: 'Adidas Tracksuit', price: 3200, desc: 'Perfect for sports', img: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80' },
    { title: 'Traditional Netela', price: 1200, desc: 'White cotton shawl', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80' },
    { title: 'Men\'s Shirt - Formal', price: 1800, desc: 'Cotton, various colors', img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80' },
    { title: 'Women\'s Handbag', price: 2500, desc: 'Leather, multiple compartments', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80' },
    { title: 'Sunglasses - Ray-Ban', price: 3500, desc: 'UV protection', img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80' },
    { title: 'Watch - Casio G-Shock', price: 4500, desc: 'Water resistant', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80' },
    { title: 'Winter Coat', price: 7500, desc: 'Warm and stylish', img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80' },
    { title: 'Running Shoes - Puma', price: 3800, desc: 'Lightweight and comfortable', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
    { title: 'Backpack - North Face', price: 4200, desc: 'Durable travel backpack', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80' },
  ],

  furniture: [
    { title: 'Sofa Set - 3+2+1', price: 45000, desc: 'Comfortable fabric sofa', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80' },
    { title: 'Dining Table with 6 Chairs', price: 28000, desc: 'Solid wood', img: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80' },
    { title: 'King Size Bed', price: 35000, desc: 'With mattress included', img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80' },
    { title: 'Wardrobe - 4 Doors', price: 22000, desc: 'Spacious storage', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80' },
    { title: 'Coffee Table', price: 8500, desc: 'Modern design', img: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800&q=80' },
    { title: 'TV Stand', price: 12000, desc: 'Fits up to 65" TV', img: 'https://images.unsplash.com/photo-1565183928294-7d22f2d8c29f?w=800&q=80' },
    { title: 'Office Desk', price: 15000, desc: 'With drawers', img: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80' },
    { title: 'Bookshelf', price: 9500, desc: '5 shelves, sturdy', img: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800&q=80' },
    { title: 'Recliner Chair', price: 18000, desc: 'Comfortable leather recliner', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80' },
    { title: 'Shoe Rack', price: 4500, desc: '10-tier storage', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80' },
  ],

  appliances: [
    { title: 'Samsung 55" Smart TV', price: 45000, desc: '4K UHD, HDR', img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80' },
    { title: 'LG Refrigerator 350L', price: 38000, desc: 'Energy efficient', img: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80' },
    { title: 'Washing Machine - 7kg', price: 22000, desc: 'Front load, automatic', img: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80' },
    { title: 'Microwave Oven', price: 8500, desc: '20L capacity', img: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&q=80' },
    { title: 'Air Conditioner 1.5 Ton', price: 28000, desc: 'Split AC, inverter', img: 'https://images.unsplash.com/photo-1631545806609-c2f1e5a0e17c?w=800&q=80' },
    { title: 'Blender', price: 3500, desc: 'Multi-speed', img: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80' },
    { title: 'Rice Cooker', price: 2800, desc: '1.8L capacity', img: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80' },
    { title: 'Vacuum Cleaner', price: 8500, desc: 'Powerful suction', img: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80' },
    { title: 'Water Dispenser', price: 6500, desc: 'Hot and cold', img: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&q=80' },
    { title: 'Electric Kettle', price: 1500, desc: 'Fast boiling', img: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80' },
  ],

  computers: [
    { title: 'MacBook Air M2', price: 95000, desc: '256GB SSD, 8GB RAM', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80' },
    { title: 'Dell XPS 13', price: 75000, desc: 'i7, 512GB SSD', img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80' },
    { title: 'HP Pavilion 15', price: 45000, desc: 'i5, 8GB RAM, 256GB SSD', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80' },
    { title: 'Lenovo ThinkPad', price: 55000, desc: 'Business laptop, durable', img: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80' },
    { title: 'Asus VivoBook', price: 38000, desc: 'Lightweight, good battery', img: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80' },
    { title: 'Acer Aspire 5', price: 42000, desc: 'Great for students', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80' },
    { title: 'Gaming PC - RTX 3060', price: 85000, desc: 'i7, 16GB RAM, 1TB SSD', img: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&q=80' },
    { title: 'iPad Pro 11"', price: 65000, desc: 'M2 chip, 256GB', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80' },
    { title: 'Microsoft Surface Pro 9', price: 72000, desc: '2-in-1 laptop/tablet', img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80' },
    { title: 'MacBook Pro 14"', price: 145000, desc: 'M2 Pro chip, 512GB', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80' },
  ],
};

const imageCache = new Map<string, { imageId: string; mime: string }>();

async function downloadAndUploadImage(imageUrl: string, tenantId: string): Promise<{ imageId: string; mime: string }> {
  if (imageCache.has(imageUrl)) {
    return imageCache.get(imageUrl)!;
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';

    const result = await upsertImageFromBytes(buffer, contentType, tenantId);
    const cached = { imageId: result.id, mime: result.mime };
    imageCache.set(imageUrl, cached);

    return cached;
  } catch (error) {
    console.error(`    ❌ Failed to download/upload image:`, error);
    throw error;
  }
}

async function reseedShop() {
  console.log('🌱 Reseeding shop products with R2 images...\n');
  console.log(`🏪 Shop ID: ${SHOP_ID}\n`);

  // Verify shop exists
  const shop = await db.tenant.findUnique({
    where: { id: SHOP_ID },
    select: { id: true, name: true, slug: true },
  });

  if (!shop) {
    console.error(`❌ Shop ${SHOP_ID} not found!`);
    process.exit(1);
  }

  console.log(`✅ Found shop: ${shop.name} (${shop.slug})\n`);

  // Deactivate existing products (can't delete due to order references)
  console.log('🔄 Deactivating existing products...');
  const deactivated = await db.product.updateMany({
    where: { tenantId: SHOP_ID },
    data: { 
      active: false,
      publishToUniversal: false,
    },
  });
  console.log(`  ✓ Deactivated ${deactivated.count} products\n`);

  // Get categories
  const categories = await db.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true, name: true },
    take: 20,
  });

  if (categories.length === 0) {
    console.error('❌ No categories found!');
    process.exit(1);
  }

  console.log(`📂 Found ${categories.length} categories\n`);

  // Collect all products
  const allProducts: any[] = [];
  Object.values(PRODUCT_DATA).forEach((categoryProducts: any) => {
    allProducts.push(...categoryProducts);
  });

  // Shuffle for variety
  const shuffled = allProducts.sort(() => Math.random() - 0.5);

  console.log(`📦 Creating ${PRODUCT_COUNT} products with images...\n`);

  let created = 0;
  for (let i = 0; i < Math.min(PRODUCT_COUNT, shuffled.length); i++) {
    const product = shuffled[i];
    const category = categories[Math.floor(Math.random() * categories.length)];

    console.log(`  [${i + 1}/${PRODUCT_COUNT}] ${product.title}`);

    // Create product
    const createdProduct = await db.product.create({
      data: {
        title: product.title,
        description: product.desc,
        price: product.price,
        tenantId: SHOP_ID,
        categoryId: category.id,
        active: true,
        publishToUniversal: true,
        reviewStatus: 'approved',
        stock: Math.floor(Math.random() * 20) + 5,
        currency: 'ETB',
      },
    });

    // Download and upload image
    try {
      const { imageId } = await downloadAndUploadImage(product.img, SHOP_ID);

      await db.productImage.create({
        data: {
          productId: createdProduct.id,
          tenantId: SHOP_ID,
          imageId: imageId,
          position: 0,
        },
      });

      console.log(`    ✓ Image uploaded to R2`);
    } catch (error) {
      console.log(`    ⚠️  Skipping image`);
    }

    created++;
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ SHOP RESEEDING COMPLETE!');
  console.log('='.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   - Shop: ${shop.name}`);
  console.log(`   - Products created: ${created}`);
  console.log(`   - All images uploaded to R2!`);
  console.log(`\n🎉 Shop is ready with fresh products!`);

  await db.$disconnect();
}

reseedShop().catch((error) => {
  console.error('❌ Error reseeding shop:', error);
  process.exit(1);
});
