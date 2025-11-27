import React, { useEffect, useRef, useState } from "react";

type Scope = "universal" | "owner" | "buyer";

export default function SearchBox({
  scope,
  tenantSlug,
  placeholder = "Search…",
  onSubmit,
  defaultValue = "",
  autoFocus = false,
  onSelectItem,
  inHeader = false,
}: {
  scope: Scope;
  tenantSlug?: string;
  placeholder?: string;
  onSubmit?: (q: string) => void;
  defaultValue?: string;
  autoFocus?: boolean;
  onSelectItem?: (item: any) => void;
  inHeader?: boolean;
}) {
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false); // hide list but keep text
      }
    }
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);


  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      setOpen(false);
      abortRef.current?.abort();
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const url = `/api/search/suggest?scope=${scope}&q=${encodeURIComponent(q)}${
          tenantSlug ? `&tenantSlug=${encodeURIComponent(tenantSlug)}` : ""
        }`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("suggest failed");
        const data = await res.json();
        setItems(data.items || []);
        setOpen(true);
      } catch {
        if (!ctrl.signal.aborted) {
          setItems([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [q, scope, tenantSlug]);

  function submit(val?: string) {
    const term = (val ?? q).trim();
    if (!term) return;
    setOpen(false);
    
    // Track search for personalization
    import('../../lib/browsingHistory').then(({ trackSearch }) => {
      trackSearch(term);
    });
    
    onSubmit?.(term);
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") setOpen(false); // hide on Esc
      }}
      onBlur={() => {
        // allow click on a suggestion to register before we hide
        window.setTimeout(() => setOpen(false), 120);
      }}
      onFocus={() => {
        // if we already have items for current text, show them again
        if (q.trim() && items.length > 0) setOpen(true);
      }}
      className={inHeader ? "header-search-input" : undefined}
      style={inHeader ? {
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: 14,
        color: "#fff",
        fontWeight: 500,
      } : {
        width: "100%", padding: "10px 12px", borderRadius: 10,
        border: "1px solid rgba(0,0,0,.15)", fontSize: 16,
      }}
    />

      {open && (
        <div
          style={{
            position: "absolute", zIndex: 20, top: "110%", left: 0, right: 0,
            background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            border: "1px solid rgba(0,0,0,.08)", overflow: "hidden",
          }}
        >
          {loading && items.length === 0 ? (
            <div style={{ padding: 12, fontSize: 14 }}>Searching…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 12, fontSize: 14 }}>No matches</div>
          ) : (
            <>
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => {
                    if (onSelectItem) {
                      onSelectItem(it);      // open product detail
                      setOpen(false);
                    } else {
                      submit(it.title);      // fallback: go to results page
                    }
                  }}

                  style={{
                    display: "flex", gap: 10, width: "100%", textAlign: "left",
                    padding: 10, background: "transparent", border: "none", cursor: "pointer",
                    borderBottom: "1px solid rgba(0,0,0,.05)",
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f2f2f2",
                    backgroundImage: it.photoUrl ? `url(${it.photoUrl})` : undefined,
                    backgroundSize: "cover", backgroundPosition: "center"
                  }} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 14 }}>{it.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {it.price} {it.currency} {it.tenant?.name ? `· ${it.tenant.name}` : ""}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => submit()}
                style={{
                  width: "100%", padding: 10, border: "none", background: "#fafafa",
                  cursor: "pointer", fontSize: 14,
                }}
              >
                See all results for “{q}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
