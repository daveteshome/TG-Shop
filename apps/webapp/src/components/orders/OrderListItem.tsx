import React from "react";
import type { Order } from "../../lib/types";
import { money, dateTime } from "../../lib/format";

type Props = {
  order: Order;
  onClick: () => void;
  /**
   * buyer = end-user "My Orders" list
   * owner = shop admin orders list (shows extra info like buyer)
   */
  mode?: "buyer" | "owner";
};

export function OrderListItem({ order, onClick, mode = "buyer" }: Props) {
  const isOwner = mode === "owner";

  const shortId = order.id ? order.id.slice(0, 6) : "";

  const buyerLabel =
    isOwner && (order as any).shipName
      ? (order as any).shipName
      : isOwner && (order as any).shipPhone
      ? (order as any).shipPhone
      : isOwner && order.userId
      ? order.userId
      : null;

  return (
    <div style={row} onClick={onClick}>
      <div>
        <div style={{ fontWeight: 600 }}>#{shortId}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>{dateTime(order.createdAt)}</div>
        {isOwner && buyerLabel && (
          <div style={{ opacity: 0.8, fontSize: 11, marginTop: 2 }}>Buyer: {buyerLabel}</div>
        )}
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          {money(order.total, order.currency)}
        </div>
      </div>
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px dashed rgba(0,0,0,.06)",
  cursor: "pointer",
};
