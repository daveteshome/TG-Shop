// apps/webapp/src/components/inventory/AddStockModal.tsx
import React, { useState } from "react";
import { api } from "../../lib/api/index";

type AddStockModalProps = {
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

export default function AddStockModal({
  open,
  onClose,
  product,
  slug,
  onSuccess,
}: AddStockModalProps) {
  const [quantity, setQuantity] = useState("1");
  const [supplierName, setSupplierName] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0 || Number.isNaN(qty)) {
      alert("Please enter a valid quantity (must be greater than 0)");
      return;
    }

    setSaving(true);
    try {
      await api(`/shop/${slug}/products/${product.id}/stock-move`, {
        method: "POST",
        body: JSON.stringify({
          type: "add",
          quantity: qty,
          reason: "Stock received from supplier",
          supplierName: supplierName.trim() || null,
          invoiceRef: invoiceRef.trim() || null,
          costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
          notes: notes.trim() || null,
        }),
      });

      alert(`Stock added! ${qty} unit(s) received`);
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Add stock error:", e);
      alert(`Failed to add stock: ${e.message || "Please try again"}`);
    } finally {
      setSaving(false);
    }
  };

  const totalCost = (parseFloat(costPerUnit) || 0) * (parseInt(quantity) || 0);

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
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18 }}>📦 Add Stock</h2>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{product.title}</div>
          <div style={{ fontSize: 13, color: "#666" }}>
            Current stock: {product.stock || 0} units
          </div>
        </div>

        <label style={label}>Quantity to Add *</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="1"
          style={input}
        />

        <label style={label}>Supplier Name (optional)</label>
        <input
          type="text"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="e.g., ABC Suppliers"
          style={input}
        />

        <label style={label}>Invoice/Reference # (optional)</label>
        <input
          type="text"
          value={invoiceRef}
          onChange={(e) => setInvoiceRef(e.target.value)}
          placeholder="e.g., INV-2024-001"
          style={input}
        />

        <label style={label}>Cost per Unit (optional)</label>
        <input
          type="number"
          value={costPerUnit}
          onChange={(e) => setCostPerUnit(e.target.value)}
          step="0.01"
          placeholder="Purchase cost"
          style={input}
        />

        <label style={label}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
          style={{ ...input, resize: "vertical" }}
        />

        {costPerUnit && (
          <div
            style={{
              padding: 12,
              background: "#f0fdf4",
              borderRadius: 8,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Total Cost</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>
              {totalCost.toFixed(2)} {product.currency}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Adding..." : "Add Stock"}
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
