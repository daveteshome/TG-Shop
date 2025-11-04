import React from "react";
import { useParams } from "react-router-dom";
export default function ShopOrders() {
  const { slug } = useParams();
  return <div style={{ padding: 16 }}>Demo page: <b>Orders</b> for <code>{slug}</code></div>;
}
