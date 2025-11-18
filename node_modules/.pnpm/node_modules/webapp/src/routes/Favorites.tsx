import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { list as wishList } from "../lib/wishlist";
import type { WishItem } from "../lib/wishlist";
import { ProductCard } from "../components/product/ProductCard";

export default function Favorites() {
  const nav = useNavigate();
  const loc = useLocation();
  const [items, setItems] = useState<WishItem[]>([]);

  // Read ?q= from URL
  const params = new URLSearchParams(loc.search || "");
  const q = (params.get("q") || "").trim().toLowerCase();

  // Filter favorites by title / tenantName / id
  const filteredItems = !q
    ? items
    : items.filter((p) => {
        const title = (p.title || "").toLowerCase();
        const tenant = (p.tenantName || "").toLowerCase();
        const id = (p.id || "").toLowerCase();
        return (
          title.includes(q) ||
          tenant.includes(q) ||
          id.includes(q)
        );
      });

  useEffect(() => {
    const loadNow = () => setItems(wishList());
    loadNow(); // initial
    const onUpd = () => loadNow();
    window.addEventListener("tgshop:wishlist-updated", onUpd as any);
    return () =>
      window.removeEventListener(
        "tgshop:wishlist-updated",
        onUpd as any
      );
  }, []);

  const hasAny = items.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: "4px 0 0", fontSize: 16 }}>Favorites</h2>

      {!hasAny ? (
        <div style={{ opacity: 0.6 }}>No favorites yet.</div>
      ) : filteredItems.length === 0 ? (
        <div style={{ opacity: 0.6 }}>No favorites match your search.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {filteredItems.map((it) => {
            const p = {
              id: it.id,
              title: it.title || "",
              price: it.price ?? null,
              currency: it.currency ?? null,
              photoUrl: it.image ?? null,
              images: it.image ? [{ webUrl: it.image }] : [],
              tenant: { name: it.tenantName ?? undefined } as any,
            };
            return (
              <div
                key={it.id}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e as any).defaultPrevented) return;
                  e.preventDefault();
                  e.stopPropagation();
                  nav(`/universal/p/${it.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    nav(`/universal/p/${it.id}`);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <ProductCard
                  p={p as any}
                  mode="universal"
                  image={it.image ?? undefined}
                  shopName={it.tenantName ?? undefined}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
