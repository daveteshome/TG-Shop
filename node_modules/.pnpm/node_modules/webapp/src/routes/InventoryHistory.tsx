// apps/webapp/src/routes/InventoryHistory.tsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";

type InventoryMove = {
  id: string;
  kind: "IN" | "OUT" | "ADJUST";
  quantity: number;
  reason: string | null;
  createdAt: string;
  sellingPrice: number | null;
  paymentMethod: string | null;
  customerName: string | null;
  supplierName: string | null;
  invoiceRef: string | null;
  costPerUnit: number | null;
  notes: string | null;
  createdBy: string | null;
  creator?: {
    tgId: string;
    name: string | null;
    username: string | null;
  } | null;
  product: {
    id: string;
    title: string;
  };
};

export default function InventoryHistory() {
  const { slug } = useParams();
  const location = useLocation();
  const [moves, setMoves] = useState<InventoryMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "IN" | "OUT" | "ADJUST">("all");

  // Get search query from URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get("q") || "";

  useEffect(() => {
    if (!slug) return;
    loadHistory();
  }, [slug]);

  const loadHistory = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await api<{ moves: InventoryMove[] }>(`/shop/${slug}/inventory-history`);
      setMoves(data.moves);
    } catch (e: any) {
      setErr(e.message || "Failed to load inventory history");
    } finally {
      setLoading(false);
    }
  };

  // Filter by type
  let filteredMoves = filter === "all" ? moves : moves.filter((m) => m.kind === filter);

  // Filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredMoves = filteredMoves.filter((move) => {
      return (
        move.product.title.toLowerCase().includes(q) ||
        (move.reason && move.reason.toLowerCase().includes(q)) ||
        (move.creator?.name && move.creator.name.toLowerCase().includes(q)) ||
        (move.creator?.username && move.creator.username.toLowerCase().includes(q)) ||
        (move.customerName && move.customerName.toLowerCase().includes(q)) ||
        (move.supplierName && move.supplierName.toLowerCase().includes(q))
      );
    });
  }

  if (loading) return <Loader />;
  if (err) return <ErrorView error={err} />;

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>📦 Inventory History</h1>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
        {[
          { key: "all", label: "All" },
          { key: "IN", label: "Stock In" },
          { key: "OUT", label: "Sales" },
          { key: "ADJUST", label: "Adjust" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: filter === tab.key ? "#2563eb" : "#fff",
              color: filter === tab.key ? "#fff" : "#666",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History List */}
      {filteredMoves.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          No inventory movements yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredMoves.map((move) => (
            <div key={move.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                    {move.kind === "IN" ? "📦" : move.kind === "OUT" ? "💰" : "⚙️"} {move.product.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {new Date(move.createdAt).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: move.quantity > 0 ? "#16a34a" : "#dc2626",
                  }}
                >
                  {move.quantity > 0 ? "+" : ""}
                  {move.quantity}
                </div>
              </div>

              {move.reason && (
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  {move.reason}
                </div>
              )}

              {/* Sale details */}
              {move.kind === "OUT" && move.sellingPrice && (
                <div style={{ fontSize: 12, color: "#666" }}>
                  Price: {move.sellingPrice} ETB × {Math.abs(move.quantity)} = {(move.sellingPrice * Math.abs(move.quantity)).toLocaleString()} ETB
                </div>
              )}

              {/* Stock-in details */}
              {move.kind === "IN" && move.costPerUnit && (
                <div style={{ fontSize: 12, color: "#666" }}>
                  Cost: {move.costPerUnit} ETB × {move.quantity} = {(move.costPerUnit * move.quantity).toLocaleString()} ETB
                </div>
              )}

              <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>
                By: {move.creator?.name || move.creator?.username || "System"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
};
