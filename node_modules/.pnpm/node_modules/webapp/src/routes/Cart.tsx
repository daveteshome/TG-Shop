// apps/webapp/src/routes/Cart.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

export default function Cart() {
  const { slug } = useParams<{ slug?: string }>();
  const nav = useNavigate();

  const [items, setItems] = useState<CartLine[]>([]);
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
      alert("Couldn't increase quantity. Please try again.");
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
      alert("Couldn't update item. Please try again.");
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
      alert("Couldn't remove item. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
  const currency = items[0]?.currency || "ETB";

  if (initialLoading) return <Loader />;
  if (err && !items.length) return <ErrorView error={err} />;

  return (
    <div style={{ padding: 10, paddingBottom: 90 }}>
      {!items.length ? (
        <div style={{ opacity: 0.7, padding: 20, textAlign: "center" }}>
          Your cart is empty.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it) => {
              const src = it.imageUrl || undefined;

              const handleOpen =
                it.productId && it.productId.length > 0
                  ? () => {
                      if (slug) {
                        // Buyer shop cart → buyer product detail
                        nav(`/s/${slug}/p/${it.productId}`);
                      } else {
                        // Global cart (if used) → universal product detail
                        nav(`/universal/p/${it.productId}`);
                      }
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
            })}
          </div>

          <div style={summary}>
            <div style={{ fontWeight: 700 }}>Total</div>
            <div style={{ fontWeight: 800 }}>{money(total, currency)}</div>
          </div>

          {/* Only for buyer-scoped cart (/s/:slug/cart) */}
          {slug && items.length > 0 && (
            <button
              type="button"
              onClick={() => nav(`/s/${slug}/checkout`)}
              style={checkoutBtn}
            >
              Proceed to checkout
            </button>
          )}
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

        <div style={{ fontWeight: 700 }}>{money(unitPrice, currency)}</div>

        <div style={qtyRow}>
          <button onClick={onDec} disabled={busy} style={qtyBtn}>
            −
          </button>
          <span style={qtyBadge}>{qty}</span>
          <button onClick={onInc} disabled={busy} style={qtyBtn}>
            +
          </button>
          <button onClick={onRemove} disabled={busy} style={removeBtn}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const row: React.CSSProperties = {
  display: "flex",
  gap: 10,
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 12,
  padding: 10,
  background: "var(--tg-theme-bg-color,#fff)",
  alignItems: "center",
};

const thumbWrap: React.CSSProperties = {
  width: 76,
  height: 76,
  flex: "0 0 76px",
  background: "#f2f2f2",
  borderRadius: 10,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: 4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const qtyRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 6,
};

const qtyBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,.15)",
  background: "var(--tg-theme-secondary-bg-color,#f5f7fa)",
  fontSize: 18,
  lineHeight: "26px",
  textAlign: "center",
};

const qtyBadge: React.CSSProperties = {
  minWidth: 28,
  textAlign: "center",
  fontWeight: 700,
};

const removeBtn: React.CSSProperties = {
  marginLeft: "auto",
  border: "none",
  background: "transparent",
  color: "#d33",
  fontSize: 12,
  textDecoration: "underline",
  cursor: "pointer",
};

const summary: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "rgba(0,0,0,.04)",
};

const checkoutBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};
