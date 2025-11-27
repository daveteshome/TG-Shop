// apps/webapp/src/components/inventory/RecordSaleModal.tsx
import React, { useState } from "react";
import { api } from "../../lib/api/index";

type RecordSaleModalProps = {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    price: number;
    currency: string;
    stock?: number | null;
  };
  slug: string;
  onSuccess: () => void;
};

export default function RecordSaleModal({
  open,
  onClose,
  product,
  slug,
  onSuccess,
}: RecordSaleModalProps) {
  const [quantity, setQuantity] = useState("1");
  const [sellingPrice, setSellingPrice] = useState(product.price.toString());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0 || Number.isNaN(qty)) {
      alert("Please enter a valid quantity (must be greater than 0)");
      return;
    }

    const availableStock = product.stock || 0;
    if (availableStock === 0) {
      alert("Cannot record sale: Product is out of stock!");
      return;
    }

    if (availableStock < qty) {
      alert(`Not enough stock! You can only sell up to ${availableStock} unit(s). Available: ${availableStock}`);
      return;
    }

    setSaving(true);
    try {
      await api(`/shop/${slug}/products/${product.id}/stock-move`, {
        method: "POST",
        body: JSON.stringify({
          type: "remove",
          quantity: qty,
          reason: "Manual sale",
          sellingPrice: parseFloat(sellingPrice),
          paymentMethod,
          customerName: customerName.trim() || null,
        }),
      });

      alert(`Sale recorded! ${qty} unit(s) sold for ${sellingPrice} ${product.currency}`);
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Record sale error:", e);
      alert(`Failed to record sale: ${e.message || "Please try again"}`);
    } finally {
      setSaving(false);
    }
  };

  const total = (parseFloat(sellingPrice) || 0) * (parseInt(quantity) || 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 20,
          maxWidth: 400,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18 }}>💰 Record Sale</h2>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{product.title}</div>
          <div style={{ fontSize: 13, color: "#666" }}>
            Available stock: {product.stock || 0} units
          </div>
        </div>

        <label style={label}>Quantity *</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="1"
          max={product.stock || 0}
          style={input}
          placeholder="Enter quantity to sell"
        />
        {parseInt(quantity) > (product.stock || 0) && (
          <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
            ⚠️ Cannot sell more than available stock ({product.stock || 0} units)
          </div>
        )}

        <label style={label}>Selling Price (per unit) *</label>
        <input
          type="number"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
          step="0.01"
          style={input}
        />

        <label style={label}>Payment Method *</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={input}
        >
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
          <option value="mobile_money">📱 Mobile Money</option>
          <option value="bank_transfer">🏦 Bank Transfer</option>
        </select>

        <label style={label}>Customer Name (optional)</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g., John Doe"
          style={input}
        />

        <div
          style={{
            padding: 12,
            background: "#f0f9ff",
            borderRadius: 8,
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total Amount</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0369a1" }}>
            {total.toFixed(2)} {product.currency}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Recording..." : "Record Sale"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "12px 20px",
              background: "#fff",
              color: "#666",
              border: "1px solid #ddd",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const label: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 13,
  marginBottom: 4,
  marginTop: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};
