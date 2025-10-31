import React from "react";
import { useNavigate } from "react-router-dom";
import { ready } from "../lib/telegram";

export default function Home() {
  const navigate = useNavigate();

  React.useEffect(() => {
    ready();
  }, []);

  return (
    <div style={page}>
      {/* 🌍 Universal Shop */}
      <section style={card}>
        <h2 style={title}>🌍 Universal Shop</h2>
        <p style={subtitle}>Browse all public products</p>
        <button onClick={() => navigate("/universal")} style={btn}>
          Open Universal
        </button>
      </section>

      {/* 🏪 My Shops */}
      <section style={card}>
        <h2 style={title}>🏪 My Shops</h2>
        <p style={subtitle}>View or manage the shops you created</p>
        <button onClick={() => navigate("/shops")} style={btn}>
          Open My Shops
        </button>
      </section>

      {/* 🤝 Joined Shops */}
      <section style={card}>
        <h2 style={title}>🤝 Joined Shops</h2>
        <p style={subtitle}>View shops you’ve joined by invitation</p>
        <button onClick={() => navigate("/shops")} style={btn}>
          View Joined Shops
        </button>
      </section>
    </div>
  );
}

/* --- styling --- */
const page: React.CSSProperties = {
  padding: "10px 12px 90px",
  display: "grid",
  gap: 16,
};

const card: React.CSSProperties = {
  background: "var(--tg-theme-secondary-bg-color, #fff)",
  borderRadius: 14,
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
};

const title: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  margin: "0 0 6px",
};

const subtitle: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.8,
  margin: "0 0 10px",
};

const btn: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  background: "var(--tg-theme-button-color, #2481cc)",
  color: "var(--tg-theme-button-text-color, #fff)",
  textDecoration: "none",
  cursor: "pointer",
};
