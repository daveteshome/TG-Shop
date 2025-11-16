// apps/webapp/src/routes/ShopOrders.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopBar } from "../components/layout/TopBar";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { OrderListItem } from "../components/orders/OrderListItem";
import { useAsync } from "../lib/hooks/useAsync";
import { api } from "../lib/api/index";
import type { Order } from "../lib/types";

export default function ShopOrders() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  const q = useAsync<Order[]>(
    async () => {
      if (!slug) return [];

      const qs = new URLSearchParams();
      qs.set("take", "50");

      // 🔑 owner list: use the owner endpoint /shop/:slug/orders
      const res: any = await api<any>(`/shop/${slug}/orders?${qs.toString()}`);

      // backend might return [] or { items: [...] }
      const raw: any[] = Array.isArray(res) ? res : res?.items ?? [];
      return raw as Order[];
    },
    [slug]
  );

  return (
    <div>
      <TopBar title="Shop Orders" />

      {q.loading ? <Loader /> : <ErrorView error={q.error} />}

      <div>
        {(q.data || []).map((o) => (
          <OrderListItem
            key={o.id}
            order={o}
            onClick={() => {
              if (!slug) return;
              // if/when you add owner detail route, update this to:
              // nav(`/shop/${slug}/orders/${o.id}`);
              nav(`/shop/${slug}/orders/${o.id}`);
            }}
          />
        ))}

        {(q.data || []).length === 0 && !q.loading && !q.error && (
          <div style={{ opacity: 0.7, padding: 16 }}>No orders yet.</div>
        )}
      </div>
    </div>
  );
}
