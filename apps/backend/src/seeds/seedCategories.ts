import { db } from "../lib/db";

type Node = { slug: string; name: string; children?: Node[] };

const tree: Node[] = [
  { slug: "electronics", name: "Electronics", children: [
    { slug: "phones", name: "Phones", children: [
      { slug: "accessories", name: "Accessories" },
    ]},
    { slug: "computers", name: "Computers" },
  ]},
  { slug: "fashion", name: "Fashion", children: [
    { slug: "men", name: "Men" },
    { slug: "women", name: "Women" },
  ]},
];

/** Build a flat list of all slugs we expect from the seed tree */
function collectSlugs(nodes: Node[], out = new Set<string>()): Set<string> {
  for (const n of nodes) {
    out.add(n.slug);
    if (n.children?.length) collectSlugs(n.children, out);
  }
  return out;
}

/** Upsert one node and recurse on children */
async function upsertNode(node: Node, parentId: string | null, level: number, position: number) {
  const cat = await db.category.upsert({
    where: { slug: node.slug }, // requires Category.slug @unique (global)
    update: { parentId, level, position, isActive: true, name: node.name },
    create: { slug: node.slug, name: node.name, parentId, level, position, isActive: true },
  });

  // optional i18n name for "en"
  await db.categoryName.upsert({
    where: { categoryId_locale: { categoryId: cat.id, locale: "en" } },
    update: { name: node.name },
    create: { categoryId: cat.id, locale: "en", name: node.name },
  });

  if (node.children?.length) {
    for (let i = 0; i < node.children.length; i++) {
      await upsertNode(node.children[i], cat.id, level + 1, i);
    }
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
