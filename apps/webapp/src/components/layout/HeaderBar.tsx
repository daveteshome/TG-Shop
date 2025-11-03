import React from "react";

type HeaderBarProps = {
  title: string;
  onOpenMenu?: () => void;
  /** When provided, replaces the default right side (Cart) */
  rightOverride?: React.ReactNode;
  /** Makes the center title clickable */
  onTitleClick?: () => void;
  /** Default Cart click (used when rightOverride is NOT provided) */
  onCartClick?: () => void;
};

export default function HeaderBar({
  title,
  onOpenMenu,
  rightOverride,
  onTitleClick,
  onCartClick,
}: HeaderBarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: "1px solid rgba(0,0,0,.06)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--tg-theme-bg-color, #fff)",
      }}
    >
      {/* Left: hamburger */}
      <button
        type="button"
        aria-label="Menu"
        onClick={onOpenMenu}
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,.08)",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ☰
      </button>

      {/* Center: title (button if clickable) */}
      {onTitleClick ? (
        <button
          onClick={onTitleClick}
          title={title}
          aria-label={title}
          style={{
            fontWeight: 700,
            fontSize: 18,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {title}
        </button>
      ) : (
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
      )}

      {/* Right: override or default Cart */}
      <div style={{ minWidth: 34, display: "flex", justifyContent: "flex-end" }}>
        {rightOverride ?? (
          <button
            type="button"
            aria-label="Cart"
            onClick={onCartClick}
            title="Cart"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,.08)",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            🛒
          </button>
        )}
      </div>
    </header>
  );
}
