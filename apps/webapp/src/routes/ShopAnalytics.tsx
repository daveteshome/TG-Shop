import React from "react";
import { useParams } from "react-router-dom";
export default function ShopAnalytics() {
  const { slug } = useParams();
  return <div style={{ padding: 16 }}>Demo page: <b>Analytics Overview</b> for <code>{slug}</code></div>;
}
