// apps/webapp/src/components/common/RightDrawer.tsx
import React, { useEffect } from "react";
import { lockScroll, unlockScroll } from "../../lib/dom/scrollLock";

type RightDrawerProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  maxWidth?: number;
  children: React.ReactNode;
};

export default function RightDrawer({
  open,
  onClose,
  width = "56vw",
  maxWidth = 270,
  children,
}: RightDrawerProps) {
  useEffect(() => {
    if (open) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => {
      unlockScroll();
    };
  }, [open]);

  if (!open) return null;

  // 🔑 Close on pointer/touch start, not on click, to avoid ghost taps
  const handleBackdropPointerDown = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  return (
    <>
      {/* Backdrop – eats the interaction BEFORE the browser fires a synthetic click */}
      <div
        onMouseDown={handleBackdropPointerDown}
        onTouchStart={handleBackdropPointerDown}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.35)",
          zIndex: 999,
          pointerEvents: "auto",
        }}
      />

      {/* Right drawer */}
      <div
        onClick={(e) => {
          // keep clicks inside drawer from bubbling up
          e.stopPropagation();
        }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          maxWidth,
          zIndex: 1000,
          background: "#fff",
          boxShadow: "-4px 0 12px rgba(15, 23, 42, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          overscrollBehavior: "contain",
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        }}
      >
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </>
  );
}
