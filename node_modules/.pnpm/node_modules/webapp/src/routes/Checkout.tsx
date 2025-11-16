// apps/webapp/src/routes/Checkout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { FormField, inputStyle, textareaStyle } from "../components/common/FormField";
import { AddressForm } from "../components/profile/AddressForm";
import { money } from "../lib/format";
import { getCart } from "../lib/api/cart";
import { checkout } from "../lib/api/orders";
import { getProfile } from "../lib/api/profile";
import type { Profile } from "../lib/types";

type CheckoutItem = {
  itemId: string;
  productId: string;
  title: string;
  unitPrice: number;
  currency: string;
  qty: number;
};

type CartApiItem = any;

function mapCartItem(i: CartApiItem): CheckoutItem {
  const itemId = String(i.itemId ?? i.id);
  const productId = String(i.productId ?? i.product_id ?? i.pid ?? "");
  const title = String(i.title ?? i.name ?? i.product?.title ?? i.product?.name ?? "");
  const unitPrice = Number(i.unitPrice ?? i.price ?? i.product?.price ?? 0);
  const currency = String(i.currency ?? i.product?.currency ?? "ETB");
  const qty = Number(i.qty ?? i.quantity ?? 1);
  return { itemId, productId, title, unitPrice, currency, qty };
}

export default function Checkout() {
  const { slug } = useParams<{ slug?: string }>();
  const nav = useNavigate();

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [city, setCity] = useState("");
  const [place, setPlace] = useState("");
  const [specialReference, setSpecialReference] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const [cartResp, prof] = await Promise.all([
          getCart({ tenantSlug: slug }),
          getProfile().catch(() => null),
        ]);

        if (cancelled) return;

        const rows: CheckoutItem[] = (cartResp?.items ?? []).map(mapCartItem);
        setItems(rows);

        if (!rows.length) {
          setErr("Your cart is empty.");
        }

        if (prof) {
          setProfile(prof);
          setPhone(prof.phone || "");
          setCity(prof.city || "");
          setPlace(prof.place || "");
          setSpecialReference(prof.specialReference || "");
        }
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ? String(e.message) : "Failed to load checkout data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0),
    [items]
  );
  const currency = items[0]?.currency || "ETB";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;

    if (!city.trim() || !place.trim()) {
      setSubmitError("Please fill in at least city and place for delivery.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSuccessMsg(null);

      const address = {
        label: "Checkout",
        line1: place.trim(),
        line2: specialReference.trim() || null,
        city: city.trim(),
        region: null,
        country: "ET",
        postalCode: null,
      } as const;

      const result = await checkout(
        {
          address,
          note: note.trim() || null,
          // For now we hard-code COD. Later we can expose payment options.
          payment: { method: "COD" },
        },
        { tenantSlug: slug }
      );

      setSuccessMsg(
        `Order placed successfully (#${result.shortCode || result.orderId.slice(0, 6)}).`
      );

      // Simple UX: go back to shop shortly after success
      setTimeout(() => {
        if (slug) nav(`/s/${slug}`, { replace: true });
        else nav("/universal", { replace: true });
      }, 800);
    } catch (e: any) {
      setSubmitError(e?.message ? String(e.message) : "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader />;
  if (err && !items.length) return <ErrorView error={err} />;

  return (
    <div style={{ padding: 10, paddingBottom: 90 }}>
      <h2 style={{ margin: "4px 0 12px", fontSize: 18 }}>Checkout</h2>

      {/* Order summary */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,.08)",
          borderRadius: 12,
          padding: 10,
          marginBottom: 16,
          background: "var(--tg-theme-bg-color,#fff)",
        }}
      >
        {items.map((it) => (
          <div
            key={it.itemId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 14,
            }}
          >
            <div style={{ maxWidth: "70%" }}>
              <div
                style={{
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.title}
              </div>
              <div style={{ opacity: 0.7 }}>
                Qty {it.qty} × {money(it.unitPrice, it.currency)}
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>
              {money(it.unitPrice * it.qty, it.currency)}
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 8,
            borderTop: "1px dashed rgba(0,0,0,.1)",
            paddingTop: 8,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 700 }}>Total</div>
          <div style={{ fontWeight: 800 }}>{money(total, currency)}</div>
        </div>
      </div>

      {/* Delivery + contact form */}
      <form onSubmit={onSubmit}>
        {/* Contact */}
        <div
          style={{
            border: "1px solid rgba(0,0,0,.08)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            background: "var(--tg-theme-bg-color,#fff)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Contact</div>
          <FormField label="Phone number">
            <input
              style={inputStyle}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+251..."
            />
          </FormField>
        </div>

        {/* Address */}
        <div
          style={{
            border: "1px solid rgba(0,0,0,.08)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            background: "var(--tg-theme-bg-color,#fff)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Delivery address</div>
          <AddressForm
            city={city}
            place={place}
            specialReference={specialReference}
            onChange={(f) => {
              setCity(f.city);
              setPlace(f.place);
              setSpecialReference(f.specialReference);
            }}
          />
        </div>

        {/* Note */}
        <div
          style={{
            border: "1px solid rgba(0,0,0,.08)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            background: "var(--tg-theme-bg-color,#fff)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Note to shop (optional)</div>
          <textarea
            style={textareaStyle}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any extra details for this order…"
          />
        </div>

        {submitError && (
          <div style={{ color: "#b00", marginBottom: 8, fontSize: 13 }}>{submitError}</div>
        )}
        {successMsg && (
          <div style={{ color: "#067d3b", marginBottom: 8, fontSize: 13 }}>{successMsg}</div>
        )}

        <button
          type="submit"
          disabled={submitting || !items.length}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            background: submitting ? "#999" : "#111",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: submitting ? "default" : "pointer",
          }}
        >
          {submitting ? "Placing order…" : `Place order (${money(total, currency)})`}
        </button>
      </form>
    </div>
  );
}
