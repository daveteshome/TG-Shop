import React from "react";
import { useParams } from "react-router-dom";
export default function ShopTopProducts() {
  const { slug } = useParams();
  return <div style={{ padding: 16 }}>Demo page: <b>Top Products</b> for <code>{slug}</code></div>;
}
