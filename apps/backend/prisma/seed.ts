import { db } from "../src/lib/db";

type Node = { slug: string; name: string; icon?: string; children?: Node[] };

export const tree: Node[] = [
  {
    slug: "vehicles",
    name: "Vehicles",
    icon: "🚗",
    children: [
      { slug: "cars", name: "Cars" },
      { slug: "car-parts-accessories", name: "Car Parts & Accessories" },
      { slug: "motorbikes-scooters", name: "Motorbikes & Scooters" },
      { slug: "trucks-trailers", name: "Trucks & Trailers" },
      { slug: "buses", name: "Buses" },
      { slug: "heavy-equipment", name: "Heavy Equipment" },
      { slug: "boats-watercraft", name: "Boats & Watercraft" }
    ]
  },
  {
    slug: "property",
    name: "Property",
    icon: "🏠",
    children: [
      { slug: "houses-apartments-for-sale", name: "Houses & Apartments for Sale" },
      { slug: "houses-apartments-for-rent", name: "Houses & Apartments for Rent" },
      { slug: "land-plots-for-sale", name: "Land & Plots for Sale" },
      { slug: "land-plots-for-rent", name: "Land & Plots for Rent" },
      { slug: "commercial-property-for-sale", name: "Commercial Property for Sale" },
      { slug: "commercial-property-for-rent", name: "Commercial Property for Rent" },
      { slug: "short-let", name: "Short Let" }
    ]
  },
  {
    slug: "phones-tablets",
    name: "Phones & Tablets",
    icon: "📱",
    children: [
      { slug: "mobile-phones", name: "Mobile Phones" },
      { slug: "tablets", name: "Tablets" },
      { slug: "phone-tablet-accessories", name: "Accessories for Phones & Tablets" },
      { slug: "smart-watches", name: "Smart Watches" }
    ]
  },
  {
    slug: "electronics",
    name: "Electronics",
    icon: "💻",
    children: [
      { slug: "tv-audio-video", name: "TV, Audio & Video Equipment" },
      { slug: "cameras", name: "Cameras" },
      { slug: "video-game-consoles", name: "Video Game Consoles" },
      { slug: "laptops-computers", name: "Laptops & Computers" },
      { slug: "computer-accessories", name: "Computer Accessories" },
      { slug: "printers-scanners", name: "Printers & Scanners" },
      { slug: "networking-equipment", name: "Networking Equipment" },
      { slug: "security-surveillance", name: "Security & Surveillance" }
    ]
  },
  {
    slug: "home-furniture-appliances",
    name: "Home, Furniture & Appliances",
    icon: "🛋️",
    children: [
      { slug: "furniture", name: "Furniture" },
      { slug: "kitchen-appliances", name: "Kitchen Appliances" },
      { slug: "home-appliances", name: "Home Appliances" },
      { slug: "garden-outdoors", name: "Garden & Outdoors" },
      { slug: "household-supplies", name: "Household Supplies" }
    ]
  },
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    icon: "💄",
    children: [
      { slug: "makeup", name: "Makeup" },
      { slug: "skin-care", name: "Skin Care" },
      { slug: "hair-beauty", name: "Hair Beauty" },
      { slug: "fragrances", name: "Fragrances" },
      { slug: "tools-accessories", name: "Tools & Accessories" }
    ]
  },
  {
    slug: "fashion",
    name: "Fashion",
    icon: "👗",
    children: [
      { slug: "clothing", name: "Clothing" },
      { slug: "shoes", name: "Shoes" },
      { slug: "bags", name: "Bags" },
      { slug: "watches", name: "Watches" },
      { slug: "jewelry", name: "Jewelry" },
      { slug: "wedding-traditional", name: "Wedding & Traditional Wear" }
    ]
  },
  {
    slug: "leisure-activities",
    name: "Leisure & Activities",
    icon: "🏃",
    children: [
      { slug: "sports-equipment", name: "Sports Equipment" },
      { slug: "musical-instruments", name: "Musical Instruments" },
      { slug: "books-games", name: "Books & Games" },
      { slug: "camping-hiking", name: "Camping & Hiking" },
      { slug: "travel-accessories", name: "Travel Accessories" }
    ]
  },
  {
    slug: "seeking-work-cvs",
    name: "Seeking Work CVs",
    icon: "📄",
    children: [
      { slug: "accounting-finance-cvs", name: "Accounting & Finance CVs" },
      { slug: "driver-cvs", name: "Driver CVs" },
      { slug: "hotel-cvs", name: "Hotel CVs" },
      { slug: "housekeeping-cleaning-cvs", name: "Housekeeping & Cleaning CVs" },
      { slug: "computing-it-cvs", name: "Computing & IT CVs" },
      { slug: "other-cvs", name: "Other CVs" }
    ]
  },
  {
    slug: "services",
    name: "Services",
    icon: "🧰",
    children: [
      { slug: "repair-construction-services", name: "Repair & Construction" },
      { slug: "health-beauty-services", name: "Health & Beauty Services" },
      { slug: "logistics-transport", name: "Logistics & Transportation" },
      { slug: "classes-courses", name: "Classes & Courses" },
      { slug: "printing-services", name: "Printing Services" },
      { slug: "event-services", name: "Event Services" },
      { slug: "fitness-training", name: "Fitness & Personal Training" }
    ]
  },
  {
    slug: "jobs",
    name: "Jobs",
    icon: "💼",
    children: [
      { slug: "accounting-finance-jobs", name: "Accounting & Finance Jobs" },
      { slug: "driver-jobs", name: "Driver Jobs" },
      { slug: "hotel-jobs", name: "Hotel Jobs" },
      { slug: "housekeeping-cleaning-jobs", name: "Housekeeping & Cleaning Jobs" },
      { slug: "computing-it-jobs", name: "Computing & IT Jobs" },
      { slug: "other-jobs", name: "Other Jobs" }
    ]
  },
  {
    slug: "babies-kids",
    name: "Babies & Kids",
    icon: "🧸",
    children: [
      { slug: "childrens-clothing", name: "Children’s Clothing" },
      { slug: "toys", name: "Toys" },
      { slug: "childrens-furniture", name: "Children’s Furniture" },
      { slug: "maternity-pregnancy", name: "Maternity & Pregnancy" }
    ]
  },
  {
    slug: "pets",
    name: "Pets",
    icon: "🐶",
    children: [
      { slug: "dogs-puppies", name: "Dogs & Puppies" },
      { slug: "cats-kittens", name: "Cats & Kittens" },
      { slug: "birds", name: "Birds" },
      { slug: "fish-aquarium", name: "Fish & Aquarium" },
      { slug: "pet-accessories", name: "Pet’s Accessories" }
    ]
  },
  {
    slug: "food-agriculture-seeds",
    name: "Food, Agriculture & Seeds",
    icon: "🛒",
    children: [
      { slug: "meals-drinks", name: "Meals & Drinks" },
      { slug: "feeds-supplements", name: "Feeds & Supplements" },
      { slug: "seeds-seedlings", name: "Seeds & Seedlings" },
      { slug: "livestock-poultry", name: "Livestock & Poultry" },
      { slug: "farm-machinery-equipment", name: "Farm Machinery & Equipment" }
    ]
  },
  {
    slug: "commercial-equipment-tools",
    name: "Commercial Equipment & Tools",
    icon: "🏭",
    children: [
      { slug: "manufacturing-equipment", name: "Manufacturing Equipment" },
      { slug: "restaurant-catering", name: "Restaurant & Catering Equipment" },
      { slug: "salon-equipment", name: "Salon Equipment" },
      { slug: "medical-supplies", name: "Medical Supplies & Equipment" },
      { slug: "electrical-equipment", name: "Electrical Equipment" },
      { slug: "tools", name: "Tools" }
    ]
  },
  {
    slug: "repair-construction",
    name: "Repair & Construction",
    icon: "🦺",
    children: [
      { slug: "building-materials", name: "Building Materials" },
      { slug: "electricals", name: "Electricals" },
      { slug: "hand-tools", name: "Hand Tools" },
      { slug: "plumbing-water-supply", name: "Plumbing & Water Supply" },
      { slug: "safety-equipment", name: "Safety Equipment" }
    ]
  }
];

/** Build a flat list of all slugs we expect from the seed tree */
function collectSlugs(nodes: Node[], out = new Set<string>()): Set<string> {
  for (const n of nodes) {
    out.add(n.slug);
    if (n.children?.length) collectSlugs(n.children, out);
  }
  return out;
}


async function upsertNode(node: Node, parentId: string | null, level: number, position: number) {
  const cat = await db.category.upsert({
    where: { slug: node.slug },
    update: {
      name: node.name,
      icon: node.icon ?? null,          // ✅ write icon on update
      parentId,
      level,
      position,
      isActive: true,
    },
    create: {
      slug: node.slug,
      name: node.name,
      icon: node.icon ?? null,          // ✅ write icon on create
      parentId,
      level,
      position,
      isActive: true,
    },
  });

  await db.categoryName.upsert({
    where: { categoryId_locale: { categoryId: cat.id, locale: "en" } },
    update: { name: node.name },
    create: { categoryId: cat.id, locale: "en", name: node.name },
  });

  for (let i = 0; i < (node.children?.length || 0); i++) {
    await upsertNode(node.children![i], cat.id, level + 1, i);
  }
}

/**
 * Reconcile strategy:
 *   - Upsert all seed nodes (updates names/parents/positions)
 *   - Does NOT delete extra categories
 */
export async function seedCategoriesReconcile() {
  for (let i = 0; i < tree.length; i++) {
    await upsertNode(tree[i], null, 0, i);
  }
  console.log("[seed] categories reconciled (no deletions)");
}

/**
 * Reset strategy (DEV ONLY):
 *   - Null product.categoryId for categories NOT in seed
 *   - Delete CategoryName/Synonym for categories to be removed
 *   - Delete those categories
 *   - Upsert seed tree fresh
 */
export async function seedCategoriesReset() {
  const keep = collectSlugs(tree);
  const existing = await db.category.findMany({ select: { id: true, slug: true } });
  const remove = existing.filter(c => !keep.has(c.slug)).map(c => c.id);

  await db.$transaction(async (tx) => {
    if (remove.length) {
      // detach products pointing to categories we plan to delete
      await tx.product.updateMany({
        where: { categoryId: { in: remove } },
        data: { categoryId: null },
      });
      // delete i18n/synonyms first (onDelete: Cascade would also handle if set)
      await tx.categoryName.deleteMany({ where: { categoryId: { in: remove } } });
      await tx.categorySynonym.deleteMany({ where: { categoryId: { in: remove } } });
      // finally delete the categories
      await tx.category.deleteMany({ where: { id: { in: remove } } });
    }
  });

  // now upsert seed fresh
  for (let i = 0; i < tree.length; i++) {
    await upsertNode(tree[i], null, 0, i);
  }

  console.log(
    `[seed] categories reset: removed=${remove.length}, seeded=${collectSlugs(tree).size}`
  );
}

/** Convenience: choose strategy based on env var */
export async function seedCategories() {
  const strategy = (process.env.SEED_STRATEGY || "reconcile").toLowerCase();
  if (strategy === "reset") {
    await seedCategoriesReset();
  } else {
    await seedCategoriesReconcile();
  }
}
