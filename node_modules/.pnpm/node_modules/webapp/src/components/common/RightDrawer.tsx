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
    if (open) lockScroll();
    return () => unlockScroll();
  }, [open]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            zIndex: 100,
            // Prevent rubber-band scrolling on iOS behind the sheet
            overscrollBehavior: "contain",
          }}
        />
      )}

      <div
        role="dialog"
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width,
          maxWidth,
          background: "#fff",
          borderLeft: "1px solid rgba(0,0,0,.1)",
          boxShadow: open ? "-3px 0 12px rgba(0,0,0,.25)" : "none",
          transform: open ? "translateX(0)" : "translateX(110%)",
          transition: "transform 0.2s ease-out",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          // Ensure the drawer itself scrolls, not the page
          overflow: "hidden",
          overscrollBehavior: "contain",
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        }}
      >
        {/* Make inner content scrollable */}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </>
  );
}
