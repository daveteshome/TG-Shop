// apps/webapp/src/components/inventory/AdjustStockModal.tsx
import React, { useState } from "react";
import { api } from "../../lib/api/index";

type AdjustStockModalProps = {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    currency: string;
    stock?: number | null;
  };
  slug: string;
  onSuccess: () => void;
};

export default function AdjustStockModal({
  open,
  onClose,
  product,
  slug,
  onSuccess,
}: AdjustStockModalProps) {
  const [newStock, setNewStock] = useState(String(product.stock || 0));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const qty = parseInt(newStock);
    if (qty < 0 || Number.isNaN(qty)) {
      alert("Please enter a valid stock quantity (0 or more)");
      return;
    }

    const currentStock = product.stock || 0;
    if (qty === currentStock) {
      alert("New stock is the same as current stock. No adjustment needed.");
      return;
    }

    if (!reason.trim()) {
      alert("Please provide a reason for the adjustment");
      return;
    }

    setSaving(true);
    try {
      await api(`/shop/${slug}/products/${product.id}/stock-move`, {
        method: "POST",
        body: JSON.stringify({
          type: "set",
          quantity: qty,
          reason: reason.trim(),
          notes: notes.trim() || null,
        }),
      });

      const diff = qty - (product.stock || 0);
      const diffText = diff > 0 ? `+${diff}` : String(diff);
      alert(`Stock adjusted! New stock: ${qty} (${diffText})`);
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Adjust stock error:", e);
      alert(`Failed to adjust stock: ${e.message || "Please try again"}`);
    } finally {
      setSaving(false);
    }
  };

  const currentStock = product.stock || 0;
  const newStockNum = parseInt(newStock) || 0;
  const difference = newStockNum - currentStock;

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
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18 }}>⚙️ Adjust Stock</h2>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{product.title}</div>
          <div style={{ fontSize: 13, color: "#666" }}>
            Current stock: {currentStock} units
          </div>
        </div>

        <label style={label}>New Stock Quantity *</label>
        <input
          type="number"
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
          min="0"
          style={input}
        />

        {difference !== 0 && (
          <div
            style={{
              padding: 8,
              background: difference > 0 ? "#f0fdf4" : "#fef2f2",
              borderRadius: 8,
              marginTop: 8,
              fontSize: 13,
              color: difference > 0 ? "#16a34a" : "#dc2626",
            }}
          >
            {difference > 0 ? "+" : ""}
            {difference} units
          </div>
        )}

        <label style={label}>Reason for Adjustment *</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={input}
        >
          <option value="">Select reason...</option>
          <option value="Physical count correction">Physical count correction</option>
          <option value="Damaged goods">Damaged goods</option>
          <option value="Theft/Loss">Theft/Loss</option>
          <option value="Found missing items">Found missing items</option>
          <option value="Return from customer">Return from customer</option>
          <option value="Initial stock setup">Initial stock setup</option>
          <option value="Other">Other</option>
        </select>

        <label style={label}>Additional Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Provide more details about this adjustment..."
          rows={3}
          style={{ ...input, resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px",
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Adjusting..." : "Adjust Stock"}
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
