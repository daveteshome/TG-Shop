// apps/webapp/src/routes/Universal.tsx
import { useEffect, useState } from "react";
import { fetchUniversal, logContactIntent } from "../lib/api/universal";
import { getTelegramWebApp } from "../lib/telegram";
import { ProductCard } from "../components/product/ProductCard";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string;

export default function Universal() {
  const [items, setItems] = useState<any[]>([]);
  const tgUserId = String(getTelegramWebApp()?.initDataUnsafe?.user?.id ?? "");

  useEffect(() => {
    fetchUniversal().then((r) => setItems(r.items));
  }, []);

  function openBotContact(tenantId: string, productId: string) {
    const url = `https://t.me/${BOT_USERNAME}?start=contact_${tenantId}_${productId}`;
    // @ts-ignore
    if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(url);
    else window.open(url, "_blank");
  }

  if (!items.length) return <div style={{ padding: 12 }}>No products yet.</div>;

  return (
    <div style={{ display: "grid", gap: 12, padding: 12 }}>
      {items.map((p) => (
        <ProductCard
          key={p.id}
          p={{
            id: p.id,
            title: p.title,
            price: p.price,
            currency: p.currency,
            isActive: p.isActive,
            stock: 0,                 // ✅ pass a number, not undefined
            description: "",          // ✅ if your Product type requires string, pass empty string
          }}
          mode="universal"
          shopName={p.shopName}
          shopPhone={p.shopPhone}
          image={p.image}
          onMessage={async () => {
            await logContactIntent(p.id, "message", tgUserId);
            openBotContact(p.tenantId, p.id); // ✅ use tenantId returned by API
          }}
          onCall={async () => {
            if (!p.shopPhone) return;
            await logContactIntent(p.id, "call", tgUserId);
            window.location.href = `tel:${p.shopPhone}`;
          }}
        />
      ))}
    </div>
  );
}
