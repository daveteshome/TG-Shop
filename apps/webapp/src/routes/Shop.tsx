// apps/webapp/src/routes/Shop.tsx
import { useEffect, useState } from "react";
import { api } from "../lib/api/index";
import { refreshCartCount } from "../lib/store";
import { ProductGrid } from "../components/product/ProductGrid";
import type { Product } from "../lib/types";

type Props = { slug: string };

export default function Shop({ slug }: Props) {
  const [items, setItems] = useState<Product[]>([]);
  const [tenantName, setTenantName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // Backend returns: { items, tenant }
        const r = await api<{ items: any[]; tenant?: { name?: string } }>(
          `/shop/${encodeURIComponent(slug)}/products`
        );

        if (!alive) return;

        setItems(
          (r.items || []).map((p: any): Product => ({
            id: p.id,
            title: p.title,
            description: p.description ?? "",
            price: Number(p.price),
            currency: p.currency,
            stock: typeof p.stock === "number" ? p.stock : 0,
            isActive: Boolean(p.active),
            photoUrl: p.photoUrl ?? null,
          }))
        );
        setTenantName(r.tenant?.name ?? "");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load products");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // Matches ProductGrid type: (p: Product) => Promise<void>
  const handleAdd = async (p: Product) => {
    await api("/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: p.id, qty: 1 }),
    });
    await refreshCartCount();
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{tenantName || "Shop"}</h3>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "crimson" }}>Error: {err}</div>}

      {!loading && !err && (
        <>
          {items.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No products yet.</div>
          ) : (
            <ProductGrid products={items} onAdd={handleAdd} />
          )}
        </>
      )}
    </div>
  );
}
