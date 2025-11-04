import React from "react";
import { useParams } from "react-router-dom";
export default function ShopCategories() {
  const { slug } = useParams();
  return <div style={{ padding: 16 }}>Demo page: <b>Categories</b> for <code>{slug}</code></div>;
}
