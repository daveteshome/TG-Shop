// apps/webapp/src/routes/Cart.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { money } from "../lib/format";
import { getCart, patchItem, removeItem } from "../lib/api/cart";
import { refreshCartCount } from "../lib/store";

type CartLine = {
  itemId: string;
  productId: string;
  title: string;
  unitPrice: number;
  currency: string;
  qty: number;
  imageUrl: string | null;
};

function mapApiItem(i: any): CartLine {
  const itemId = String(i.itemId ?? i.id);
  const productId = String(i.productId ?? i.product_id ?? i.pid ?? "");
  const title = String(i.title ?? i.name ?? i.product?.title ?? i.product?.name ?? "");
  const unitPrice = Number(i.unitPrice ?? i.price ?? i.product?.price ?? 0);
  const currency = String(i.currency ?? i.product?.currency ?? "ETB");
  const qty = Number(i.qty ?? i.quantity ?? 1);

  const imageUrl =
    i.imageUrl ??
    i.thumbUrl ??
    i.product?.images?.[0]?.webUrl ??
    i.product?.images?.[0]?.url ??
    null;

  return { itemId, productId, title, unitPrice, currency, qty, imageUrl };
}

type ShopInfo = {
  shippingInfo?: string | null;
  paymentMethods?: "cod" | "prepay" | "both" | null;
  bankAccounts?: Array<{ id: string; bank: string; accountName: string; accountNumber: string }>;
};

export default function Cart() {
  const { slug } = useParams<{ slug?: string }>();
  const nav = useNavigate();
  const { t } = useTranslation();

  const [items, setItems] = useState<CartLine[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const api = await getCart({ tenantSlug: slug });
      const rows: CartLine[] = (api?.items ?? []).map(mapApiItem);
      setItems(rows);
      setCountBadgeFrom(rows);

      // Fetch shop info if we're in a shop context
      if (slug) {
        try {
          const shopRes = await fetch(`/api/shop/${slug}`);
          if (shopRes.ok) {
            const shopData = await shopRes.json();
            const tenant = shopData?.tenant ?? shopData?.shop ?? shopData;
            setShopInfo({
              shippingInfo: tenant?.shippingInfo ?? null,
              paymentMethods: tenant?.paymentMethods ?? null,
              bankAccounts: Array.isArray(tenant?.bankAccounts) ? tenant.bankAccounts : [],
            });
          }
        } catch (e) {
          console.error("Failed to fetch shop info:", e);
        }
      }
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : String(e));
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [slug]);

  function setCountBadgeFrom(itemsNow: CartLine[]) {
    const count = itemsNow.reduce((s, it) => s + it.qty, 0);
    try {
      (window as any).Telegram?.WebApp?.MainButton?.setText?.(`Cart ${count}`);
    } catch {}
    try {
      const p = (refreshCartCount as any)?.(slug);
      if (p?.catch) p.catch(() => {});
    } catch {}
  }

  async function onInc(line: CartLine) {
    if (busyId) return;
    setBusyId(line.itemId);

    const prev = items;
    const optimistic = prev.map((it) =>
      it.itemId === line.itemId ? { ...it, qty: it.qty + 1 } : it
    );
    setItems(optimistic);
    setCountBadgeFrom(optimistic);

    try {
      await patchItem(line.itemId, +1, { tenantSlug: slug });
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");

      getCart({ tenantSlug: slug })
        .then((api) => {
          const rows: CartLine[] = (api?.items ?? []).map(mapApiItem);
          setItems(rows);
          setCountBadgeFrom(rows);
        })
        .catch(() => {});
    } catch {
      setItems(prev);
      setCountBadgeFrom(prev);
      alert(t('cart_qty_increase_error'));
    } finally {
      setBusyId(null);
    }
  }

  async function onDec(line: CartLine) {
    if (busyId) return;
    setBusyId(line.itemId);

    const prev = items;
    let optimistic: CartLine[];
    if (line.qty > 1) {
      optimistic = prev.map((it) =>
        it.itemId === line.itemId ? { ...it, qty: it.qty - 1 } : it
      );
    } else {
      optimistic = prev.filter((it) => it.itemId !== line.itemId);
    }
    setItems(optimistic);
    setCountBadgeFrom(optimistic);

    try {
      if (line.qty > 1) await patchItem(line.itemId, -1, { tenantSlug: slug });
      else await removeItem(line.itemId, { tenantSlug: slug });

      getCart({ tenantSlug: slug })
        .then((api) => {
          const rows: CartLine[] = (api?.items ?? []).map(mapApiItem);
          setItems(rows);
          setCountBadgeFrom(rows);
        })
        .catch(() => {});
    } catch {
      setItems(prev);
      setCountBadgeFrom(prev);
      alert(t('cart_update_error'));
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(line: CartLine) {
    if (busyId) return;
    setBusyId(line.itemId);

    const prev = items;
    const optimistic = prev.filter((it) => it.itemId !== line.itemId);
    setItems(optimistic);
    setCountBadgeFrom(optimistic);

    try {
      await removeItem(line.itemId, { tenantSlug: slug });
      getCart({ tenantSlug: slug })
        .then((api) => {
          const rows: CartLine[] = (api?.items ?? []).map(mapApiItem);
          setItems(rows);
          setCountBadgeFrom(rows);
        })
        .catch(() => {});
    } catch {
      setItems(prev);
      setCountBadgeFrom(prev);
      alert(t('cart_remove_error'));
    } finally {
      setBusyId(null);
    }
  }

  const loc = useLocation();
  const params = new URLSearchParams(loc.search || "");
  const q = (params.get("q") || "").trim().toLowerCase();
  const hasFilter = q.length > 0;

  const filteredItems = !hasFilter
    ? items
    : items.filter((it) =>
        (it.title || "").toLowerCase().includes(q)
      );


  const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
  const currency = items[0]?.currency || "ETB";

  if (initialLoading) return <Loader />;
  if (err && !items.length) return <ErrorView error={err} />;

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      {!items.length ? (
        <div style={emptyState}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 8 }}>
            {t('empty_cart_message')}
          </div>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
            {t('cart_add_items_hint')}
          </div>
          <button
            onClick={() => {
              if (slug) nav(`/s/${slug}`);
              else nav("/universal");
            }}
            style={{
              background: "#000",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t('btn_continue_shopping')}
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 4 }}>
              🛒 {t('title_cart')}
            </h1>
            <div style={{ fontSize: 13, color: "#666" }}>
              {items.length} {items.length === 1 ? t('cart_item_singular') : t('cart_items_plural')}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                {t('cart_no_match')}
              </div>
            ) : (
              filteredItems.map((it) => {
                const src = it.imageUrl || undefined;

                const handleOpen =
                  it.productId && it.productId.length > 0
                    ? () => {
                        if (slug) nav(`/s/${slug}/p/${it.productId}`);
                        else nav(`/universal/p/${it.productId}`);
                      }
                    : undefined;

                return (
                  <CartRow
                    key={it.itemId}
                    title={it.title}
                    unitPrice={it.unitPrice}
                    currency={it.currency}
                    qty={it.qty}
                    imgSrc={src}
                    busy={busyId === it.itemId}
                    onInc={() => onInc(it)}
                    onDec={() => onDec(it)}
                    onRemove={() => onRemove(it)}
                    onOpen={handleOpen}
                  />
                );
              })
            )}
          </div>

          {/* Summary */}
          <div style={summaryCard}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: "#666" }}>{t('subtotal')}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{money(total, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{t('total')}</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{money(total, currency)}</span>
            </div>

            {/* Shop configuration validation */}
            {slug && shopInfo && (!shopInfo.shippingInfo || !shopInfo.paymentMethods) && (
              <div style={{
                padding: "12px",
                background: "#FEF3C7",
                border: "1px solid #F59E0B",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
                color: "#92400E",
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ {t('checkout_unavailable', 'Checkout Unavailable')}</div>
                <div>
                  {!shopInfo.shippingInfo && (
                    <div>• {t('shop_no_delivery_regions', 'Shop has not configured delivery regions')}</div>
                  )}
                  {!shopInfo.paymentMethods && (
                    <div>• {t('shop_no_payment_methods', 'Shop has not configured payment methods')}</div>
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                  {t('contact_shop_owner', 'Please contact the shop owner to complete their shop setup.')}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (slug) nav(`/s/${slug}/checkout`);
                else nav("/checkout");
              }}
              disabled={Boolean(slug && shopInfo && (!shopInfo.shippingInfo || !shopInfo.paymentMethods))}
              style={{
                ...checkoutButton,
                opacity: slug && shopInfo && (!shopInfo.shippingInfo || !shopInfo.paymentMethods) ? 0.5 : 1,
                cursor: slug && shopInfo && (!shopInfo.shippingInfo || !shopInfo.paymentMethods) ? 'not-allowed' : 'pointer',
              }}
            >
              {t('btn_proceed_checkout')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Item row ---------- */

type CartRowProps = {
  title: string;
  unitPrice: number;
  currency: string;
  qty: number;
  imgSrc?: string;
  busy?: boolean;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  onOpen?: () => void;
};

function CartRow({
  title,
  unitPrice,
  currency,
  qty,
  imgSrc,
  busy,
  onInc,
  onDec,
  onRemove,
  onOpen,
}: CartRowProps) {
  return (
    <div style={row}>
      <div
        style={{
          ...thumbWrap,
          cursor: onOpen ? "pointer" : undefined,
          backgroundImage: imgSrc ? `url(${imgSrc})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onClick={onOpen}
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : -1}
        onKeyDown={(e) => {
          if (!onOpen) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ ...titleStyle, cursor: onOpen ? "pointer" : undefined }}
          title={title}
          onClick={onOpen}
          role={onOpen ? "button" : undefined}
          tabIndex={onOpen ? 0 : -1}
          onKeyDown={(e) => {
            if (!onOpen) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen();
            }
          }}
        >
          {title}
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, marginBottom: 8 }}>
          {money(unitPrice, currency)}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={qtyRow}>
            <button onClick={onDec} disabled={busy} style={qtyBtn}>
              −
            </button>
            <span style={qtyBadge}>{qty}</span>
            <button onClick={onInc} disabled={busy} style={qtyBtn}>
              +
            </button>
          </div>
          <button onClick={onRemove} disabled={busy} style={removeBtn}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const row: React.CSSProperties = {
  display: "flex",
  gap: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
  alignItems: "flex-start",
};

const thumbWrap: React.CSSProperties = {
  width: 70,
  height: 70,
  flex: "0 0 70px",
  background: "#f5f5f5",
  borderRadius: 10,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "#111",
};

const qtyRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "#f5f5f5",
  borderRadius: 8,
  padding: "2px",
};

const qtyBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "none",
  background: "#fff",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const qtyBadge: React.CSSProperties = {
  minWidth: 32,
  textAlign: "center",
  fontWeight: 600,
  fontSize: 14,
};

const removeBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
  padding: 4,
  opacity: 0.6,
};

const summaryCard: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
};

const checkoutButton: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: 10,
  border: "none",
  background: "#000",
  color: "#fff",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

const emptyState: React.CSSProperties = {
  textAlign: "center",
  padding: "60px 20px",
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  marginTop: 40,
};
