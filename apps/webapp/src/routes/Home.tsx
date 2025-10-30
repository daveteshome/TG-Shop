// src/routes/Home.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

const cardBase: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.05)",
  borderRadius: 14,
  padding: "16px 14px",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(15,23,42,.03)",
  cursor: "pointer",
};

export default function Home() {
  const nav = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: "4px 0 8px" }}>Welcome 👋</h2>
      <p style={{ margin: 0, opacity: 0.6 }}>
        Choose what you want to open.
      </p>

      {/* 1. Universal */}
      <div onClick={() => nav("/universal")} style={cardBase}>
        <div style={{ fontSize: 20 }}>🌍 Universal Shop</div>
        <div style={{ opacity: 0.7, marginTop: 4 }}>
          Browse all public products
        </div>
      </div>

      {/* 2. My shops */}
      <div onClick={() => nav("/shops?mine=1")} style={cardBase}>
        <div style={{ fontSize: 20 }}>🏪 My Shops</div>
        <div style={{ opacity: 0.7, marginTop: 4 }}>
          Shops you created / own
        </div>
      </div>

      {/* 3. Joined shops */}
      <div onClick={() => nav("/shops?joined=1")} style={cardBase}>
        <div style={{ fontSize: 20 }}>🤝 Joined Shops</div>
        <div style={{ opacity: 0.7, marginTop: 4 }}>
          Shops you were invited to
        </div>
      </div>
    </div>
  );
}
