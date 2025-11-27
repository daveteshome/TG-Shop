// apps/webapp/src/routes/Checkout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { FormField, inputStyle, textareaStyle } from "../components/common/FormField";
import { money } from "../lib/format";
import { getCart } from "../lib/api/cart";
import { checkout } from "../lib/api/orders";
import { getProfile } from "../lib/api/profile";
import { api } from "../lib/api/index";
import { ETHIOPIAN_REGIONS, getCitiesForRegion } from "../lib/ethiopiaLocations";
import { getInitDataRaw } from "../lib/telegram";
import type { Profile } from "../lib/types";
import ShopProfileDrawer from "../components/shop/ShopProfileDrawer";

type CheckoutItem = {
  itemId: string;
  productId: string;
  title: string;
  unitPrice: number;
  currency: string;
  qty: number;
};

type ShopInfo = {
  id: string;
  slug: string;
  name: string;
  shippingInfo?: string | null;
  deliveryMode?: string | null;
  paymentMethods?: "cod" | "prepay" | "both";
  bankAccounts?: Array<{
    id: string;
    bank: string;
    accountName: string;
    accountNumber: string;
  }>;
  publicPhone?: string | null;
  publicTelegramLink?: string | null;
  description?: string | null;
  location?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  returnPolicy?: string | null;
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
  const { t } = useTranslation();

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [regionId, setRegionId] = useState("");
  const [cityId, setCityId] = useState("");
  const [woreda, setWoreda] = useState("");
  const [specialReference, setSpecialReference] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BANK">("COD");
  const [transactionRef, setTransactionRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showShopInfo, setShowShopInfo] = useState(false);

  // Parse available delivery regions from shop info
  const availableRegions = useMemo(() => {
    if (!shopInfo?.shippingInfo) return ETHIOPIAN_REGIONS;
    const deliveryRegionNames = shopInfo.shippingInfo.split(",").map(r => r.trim()).filter(r => r);
    return ETHIOPIAN_REGIONS.filter(r => deliveryRegionNames.includes(r.name));
  }, [shopInfo]);

  // Get cities for selected region
  const availableCities = useMemo(() => {
    if (!regionId) return [];
    return getCitiesForRegion(regionId);
  }, [regionId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchShopInfo(s: string): Promise<ShopInfo | null> {
      try {
        const res: any = await api<any>(`/shop/${s}`);
        const t = res?.tenant ?? res?.shop ?? (res?.slug && res?.name ? res : null);
        if (t?.slug && t?.name) {
          return {
            id: t.id || "",
            slug: t.slug,
            name: t.name,
            shippingInfo: t.shippingInfo ?? null,
            deliveryMode: t.deliveryMode ?? null,
            paymentMethods: t.paymentMethods ?? "both",
            bankAccounts: Array.isArray(t.bankAccounts) ? t.bankAccounts : [],
            publicPhone: t.publicPhone ?? null,
            publicTelegramLink: t.publicTelegramLink ?? null,
            description: t.description ?? null,
            location: t.location ?? null,
            instagramUrl: t.instagramUrl ?? null,
            facebookUrl: t.facebookUrl ?? null,
            twitterUrl: t.twitterUrl ?? null,
            returnPolicy: t.returnPolicy ?? null,
          };
        }
      } catch {}
      return null;
    }

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const [cartResp, prof, shop] = await Promise.all([
          getCart({ tenantSlug: slug }),
          getProfile().catch(() => null),
          slug ? fetchShopInfo(slug) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const rows: CheckoutItem[] = (cartResp?.items ?? []).map(mapCartItem);
        setItems(rows);

        if (!rows.length) {
          setErr(t('cart_empty'));
        }

        if (prof) {
          setProfile(prof);
          setPhone(prof.phone || "");
          // Note: We don't pre-fill region/city from profile since we need proper IDs
          setWoreda(prof.place || "");
          setSpecialReference(prof.specialReference || "");
        }

        if (shop) {
          setShopInfo(shop);
          // Set default payment method based on shop configuration
          if (shop.paymentMethods === "cod") {
            setPaymentMethod("COD");
          } else if (shop.paymentMethods === "prepay") {
            setPaymentMethod("BANK");
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ? String(e.message) : t('checkout_failed'));
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

    if (!regionId) {
      setSubmitError(t('select_region_error'));
      return;
    }

    if (!cityId) {
      setSubmitError(t('select_city_error'));
      return;
    }

    if (!woreda.trim()) {
      setSubmitError(t('specify_woreda_error'));
      return;
    }

    if (paymentMethod === "BANK" && !transactionRef.trim()) {
      setSubmitError(t('transaction_ref_error'));
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSuccessMsg(null);

      // Upload receipt if provided
      let receiptImageId: string | null = null;
      if (paymentMethod === "BANK" && receiptFile) {
        try {
          const initData = getInitDataRaw();
          const fd = new FormData();
          fd.append("file", receiptFile);
          
          const uploadRes = await fetch("/api/uploads/image", {
            method: "POST",
            headers: initData ? { Authorization: `tma ${initData}` } : undefined,
            body: fd,
          });

          if (!uploadRes.ok) {
            const errorText = await uploadRes.text().catch(() => "");
            console.error("Receipt upload failed:", uploadRes.status, errorText);
            throw new Error(t('receipt_upload_failed'));
          }

          const uploadData = await uploadRes.json();
          receiptImageId = uploadData.imageId || null;
          console.log("Receipt uploaded successfully:", receiptImageId);
        } catch (uploadErr) {
          console.error("Receipt upload error:", uploadErr);
          // Continue with checkout even if receipt upload fails
        }
      }

      const selectedRegion = ETHIOPIAN_REGIONS.find(r => r.id === regionId);
      const selectedCity = availableCities.find(c => c.id === cityId);
      
      const address = {
        label: "Checkout",
        line1: woreda.trim(),
        line2: specialReference.trim() || null,
        city: selectedCity?.name || "",
        region: selectedRegion?.name || "",
        country: "ET",
        postalCode: null,
      } as const;

      const result = await checkout(
        {
          address,
          note: note.trim() || null,
          payment: { 
            method: paymentMethod,
            ref: paymentMethod === "BANK" ? transactionRef.trim() : null,
            receiptImageId: receiptImageId
          },
        },
        { tenantSlug: slug }
      );

      setSuccessMsg(
        `${t('order_placed_success')} (#${result.shortCode || result.orderId.slice(0, 6)}).`
      );

      // Simple UX: go back to shop shortly after success
      setTimeout(() => {
        if (slug) nav(`/s/${slug}`, { replace: true });
        else nav("/universal", { replace: true });
      }, 800);
    } catch (e: any) {
      setSubmitError(e?.message ? String(e.message) : t('checkout_failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader />;
  if (err && !items.length) return <ErrorView error={err} />;

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 4 }}>
          📋 {t('checkout_title')}
        </h1>
        <div style={{ fontSize: 13, color: "#666" }}>
          {t('checkout_subtitle')}
        </div>
      </div>

      {/* Order summary */}
      <div style={section}>
        <div style={sectionHeader}>
          <span>🛒</span>
          <span>{t('order_summary')}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => (
            <div key={it.itemId} style={orderItem}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={orderItemTitle}>{it.title}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {it.qty} × {money(it.unitPrice, it.currency)}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {money(it.unitPrice * it.qty, it.currency)}
              </div>
            </div>
          ))}
        </div>
        <div style={totalRow}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{t('total')}</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{money(total, currency)}</span>
        </div>
      </div>

      {/* Shop configuration check */}
      {slug && shopInfo && (!shopInfo.shippingInfo || !shopInfo.paymentMethods) ? (
        <div style={{
          padding: "20px",
          background: "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)",
          border: "2px solid #EF4444",
          borderRadius: 12,
          textAlign: "center",
          marginTop: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#991B1B", marginBottom: 8 }}>
            {t('checkout_unavailable', 'Checkout Unavailable')}
          </div>
          <div style={{ fontSize: 14, color: "#7F1D1D", lineHeight: 1.6, marginBottom: 16 }}>
            {t('shop_not_configured', 'This shop has not completed their setup yet. Please contact the shop owner.')}
          </div>
          <div style={{ fontSize: 13, color: "#991B1B", background: "rgba(0,0,0,0.05)", padding: 10, borderRadius: 8 }}>
            {!shopInfo.shippingInfo && <div>• {t('missing_delivery_regions', 'Missing delivery regions')}</div>}
            {!shopInfo.paymentMethods && <div>• {t('missing_payment_methods', 'Missing payment methods')}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
            <button
              onClick={() => setShowShopInfo(true)}
              style={{
                padding: "10px 20px",
                background: "#fff",
                color: "#EF4444",
                border: "2px solid #EF4444",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ℹ️ {t('btn_shop_info', 'Shop Info')}
            </button>
            <button
              onClick={() => nav(-1)}
              style={{
                padding: "10px 20px",
                background: "#EF4444",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t('btn_go_back', 'Go Back')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
        {/* Contact */}
        <div style={section}>
          <div style={sectionHeader}>
            <span>📞</span>
            <span>{t('contact')}</span>
          </div>
          <FormField label={t('phone_number')}>
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
        <div style={section}>
          <div style={sectionHeader}>
            <span>📍</span>
            <span>{t('delivery_address')}</span>
          </div>
          
          <FormField label={t('region')}>
            <select
              style={inputStyle}
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setCityId(""); // Reset city when region changes
                setWoreda("");
              }}
              required
            >
              <option value="">{t('select_region')}</option>
              {availableRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>

          {regionId && (
            <FormField label={t('city')}>
              <select
                style={inputStyle}
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                required
              >
                <option value="">{t('select_city')}</option>
                {availableCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {cityId && (
            <FormField label={t('woreda_label')}>
              <input
                style={inputStyle}
                value={woreda}
                onChange={(e) => setWoreda(e.target.value)}
                placeholder={
                  cityId === "other"
                    ? t('woreda_placeholder_other')
                    : t('woreda_placeholder')
                }
                required
              />
            </FormField>
          )}

          <FormField label={t('special_reference')}>
            <textarea
              style={textareaStyle}
              rows={2}
              value={specialReference}
              onChange={(e) => setSpecialReference(e.target.value)}
              placeholder={t('special_reference_placeholder')}
            />
          </FormField>
        </div>

        {/* Note */}
        <div style={section}>
          <div style={sectionHeader}>
            <span>💬</span>
            <span>{t('order_note')}</span>
          </div>
          <textarea
            style={textareaStyle}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('order_note_placeholder')}
          />
        </div>

        {/* Payment Options */}
        {shopInfo && (
          <div style={section}>
            <div style={sectionHeader}>
              <span>💳</span>
              <span>{t('payment_method')}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Cash on Delivery */}
              {(shopInfo.paymentMethods === "cod" || shopInfo.paymentMethods === "both") && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px",
                    borderRadius: 8,
                    border: paymentMethod === "COD" ? "2px solid #4CAF50" : "1px solid #ddd",
                    background: paymentMethod === "COD" ? "#E8F5E9" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      💵 {t('cash_on_delivery')}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {t('cash_on_delivery_desc')}
                    </div>
                  </div>
                </label>
              )}

              {/* Prepayment */}
              {(shopInfo.paymentMethods === "prepay" || shopInfo.paymentMethods === "both") && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px",
                    borderRadius: 8,
                    border: paymentMethod === "BANK" ? "2px solid #2196F3" : "1px solid #ddd",
                    background: paymentMethod === "BANK" ? "#E3F2FD" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "BANK"}
                    onChange={() => setPaymentMethod("BANK")}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      🏦 {t('bank_transfer')}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {t('bank_transfer_desc')}
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Bank Account Details (shown when prepayment is selected) */}
            {paymentMethod === "BANK" && shopInfo.bankAccounts && shopInfo.bankAccounts.length > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: "#F0F9FF", borderRadius: 8, border: "1px solid #BAE6FD" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "#0369A1" }}>
                  📋 {t('payment_instructions')}
                </div>
                <div style={{ fontSize: 12, color: "#0C4A6E", marginBottom: 12 }}>
                  {t('please_transfer')} <strong>{money(total, currency)}</strong> {t('to_following_accounts')}
                </div>
                
                {shopInfo.bankAccounts.map((account, idx) => (
                  <div
                    key={account.id || idx}
                    style={{
                      padding: 10,
                      background: "#fff",
                      borderRadius: 6,
                      marginBottom: idx < shopInfo.bankAccounts!.length - 1 ? 8 : 0,
                      border: "1px solid #E0F2FE",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>
                        {account.bank === "Telebirr" ? "📱" : "🏦"}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{account.bank}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
                      <strong>{t('account_name')}:</strong> {account.accountName}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      <strong>{account.bank === "Telebirr" ? t('phone') : t('account_number')}:</strong>{" "}
                      <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {account.accountNumber}
                      </span>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 12, fontSize: 11, color: "#0369A1", fontStyle: "italic" }}>
                  💡 {t('after_payment_note')}
                </div>
              </div>
            )}

            {/* Transaction Reference & Receipt Upload (shown when bank payment is selected) */}
            {paymentMethod === "BANK" && (
              <div style={{ marginTop: 16 }}>
                <FormField label={t('transaction_ref')}>
                  <input
                    style={inputStyle}
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder={t('transaction_ref_placeholder')}
                    required
                  />
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                    {t('transaction_ref_hint')}
                  </div>
                </FormField>

                <FormField label={t('payment_receipt')}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Check file size (max 5MB)
                          if (file.size > 5 * 1024 * 1024) {
                            alert(t('file_size_error'));
                            e.target.value = "";
                            return;
                          }
                          setReceiptFile(file);
                        }
                      }}
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        fontSize: 13,
                        background: "#fff",
                      }}
                    />
                    {receiptFile && (
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 8,
                        padding: "8px 10px",
                        background: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        borderRadius: 6,
                        fontSize: 12,
                      }}>
                        <span>✓</span>
                        <span style={{ flex: 1, color: "#166534" }}>{receiptFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setReceiptFile(null)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#DC2626",
                            cursor: "pointer",
                            fontSize: 16,
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#666" }}>
                      {t('upload_receipt')}
                    </div>
                  </div>
                </FormField>
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div style={{ color: "#EF4444", marginBottom: 12, fontSize: 13, padding: "10px 12px", background: "#FEE2E2", borderRadius: 8 }}>
            {submitError}
          </div>
        )}
        {successMsg && (
          <div style={{ color: "#10B981", marginBottom: 12, fontSize: 13, padding: "10px 12px", background: "#D1FAE5", borderRadius: 8 }}>
            ✓ {successMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !items.length}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 10,
            border: "none",
            background: submitting ? "#999" : "#000",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            cursor: submitting ? "default" : "pointer",
          }}
        >
          {submitting ? t('placing_order') : `${t('place_order')} • ${money(total, currency)}`}
        </button>
      </form>
      )}

      {/* Shop Profile Drawer */}
      {shopInfo && (
        <ShopProfileDrawer
          open={showShopInfo}
          onClose={() => setShowShopInfo(false)}
          tenant={shopInfo}
        />
      )}
    </div>
  );
}

/* ---------- Styles ---------- */

const section: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  marginBottom: 16,
  background: "#fff",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
  fontSize: 15,
  marginBottom: 12,
  color: "#111",
};

const orderItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  paddingBottom: 10,
  borderBottom: "1px solid #f5f5f5",
};

const orderItemTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const totalRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 12,
  paddingTop: 12,
  borderTop: "2px solid #e5e7eb",
};
