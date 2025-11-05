import React from "react";
import { api } from "../lib/api/index";
import { useTranslation } from "react-i18next";

/** Backend payload shape expected from GET /categories */
type Cat = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level?: number | null;
};

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function CategoryCascader({ value, onChange, placeholder, disabled }: Props) {
  const { t } = useTranslation();

  const [all, setAll] = React.useState<Cat[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // which node are we “inside” (null = at root showing only parents)
  const [currentParentId, setCurrentParentId] = React.useState<string | null>(null);

  // cache maps
  const byId = React.useMemo(() => {
    const m = new Map<string, Cat>();
    for (const c of all) m.set(c.id, c);
    return m;
  }, [all]);

  const childrenOf = React.useCallback(
    (pid: string | null) => all.filter((c) => c.parentId === pid),
    [all]
  );

  const hasChildren = React.useCallback(
    (id: string) => all.some((c) => c.parentId === id),
    [all]
  );

  // selected label
  const selectedLabel = React.useMemo(() => (value ? byId.get(value)?.name ?? "" : ""), [value, byId]);

  // load categories once
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await api<Cat[]>("/categories");
        if (!cancel) setAll(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancel) setAll([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // reset drill when panel opens
  React.useEffect(() => {
    if (open) setCurrentParentId(null);
  }, [open]);

  // derive current view list:
  //  - at root → only parents (parentId=null)
  //  - inside a parent → show [parent itself] and its children
  const currentParent = currentParentId ? byId.get(currentParentId) ?? null : null;
  const atRoot = !currentParent;
  const parents = React.useMemo(() => childrenOf(null), [childrenOf]);
  const currentChildren = React.useMemo(
    () => (currentParent ? childrenOf(currentParent.id) : []),
    [currentParent, childrenOf]
  );

  function handlePick(id: string) {
    // pick & close
    onChange(id);
    setOpen(false);
  }

  function handleParentClick(p: Cat) {
    // Drill into that parent (show "Parent" then its children).
    setCurrentParentId(p.id);
  }

  function handleChildClick(c: Cat) {
    if (hasChildren(c.id)) {
      // drill deeper
      setCurrentParentId(c.id);
    } else {
      // leaf → select
      handlePick(c.id);
    }
  }

  function handleSelectCurrentParent() {
    if (currentParent) {
      handlePick(currentParent.id);
    }
  }

  function handleClear(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    onChange(null);
    setOpen(false);
    setCurrentParentId(null);
  }

  const triggerLabel =
    selectedLabel || placeholder || t("ph_select_category", "Select category");

  return (
    <div style={{ position: "relative" }}>
      {/* trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,.08)",
          background: disabled ? "#f5f5f5" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 14,
        }}
      >
        {selectedLabel ? selectedLabel : triggerLabel}
      </button>

      {/* panel */}
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid rgba(0,0,0,.08)",
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 8px 22px rgba(0,0,0,.08)",
          }}
        >
          {/* header row: back (if inside), clear (always), no “Done” */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {!atRoot && (
                <button
                  type="button"
                  onClick={() => {
                    const parent = currentParent?.parentId ?? null;
                    setCurrentParentId(parent);
                  }}
                  aria-label={t("btn_back", "Back")}
                  style={plainIconBtn}
                >
                  ←
                </button>
              )}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {atRoot ? t("lbl_choose_parent", "Choose a category") : (currentParent?.name || "")}
              </div>
            </div>
            <button type="button" onClick={handleClear} style={clearBtn}>
              {t("btn_clear", "Clear")}
            </button>
          </div>

          {/* body list — indentation only, NO lines */}
          <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
            {loading ? (
              <div style={muted}>{t("state_loading", "Loading…")}</div>
            ) : atRoot ? (
              parents.length ? (
                parents
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <ListRow
                      key={p.id}
                      depth={0}
                      label={p.name}
                      onClick={() => handleParentClick(p)}
                    />
                  ))
              ) : (
                <div style={muted}>{t("state_empty", "No categories")}</div>
              )
            ) : (
              <>
                {/* current parent as a selectable row */}
                <ListRow
                  depth={0}
                  label={currentParent?.name || ""}
                  onClick={handleSelectCurrentParent}
                />
                {/* its children (depth=1) */}
                {currentChildren.length ? (
                  currentChildren
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <ListRow
                        key={c.id}
                        depth={1}
                        label={c.name}
                        onClick={() => handleChildClick(c)}
                      />
                    ))
                ) : (
                  <div style={{ ...muted, paddingLeft: 16 }}>
                    {t("state_no_children", "No subcategories")}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Row with indentation only (no borders/lines) */
function ListRow({
  depth,
  label,
  onClick,
}: {
  depth: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 10px",
        paddingLeft: 10 + depth * 18,
        borderRadius: 8,
        border: "none",
        background: "transparent",
        textAlign: "left",
        cursor: "pointer",
        fontSize: 14,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget.style.background as any) = "rgba(0,0,0,.035)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style.background as any) = "transparent";
      }}
    >
      {label}
    </button>
  );
}

const muted: React.CSSProperties = { fontSize: 13, opacity: 0.65 };

const clearBtn: React.CSSProperties = {
  fontSize: 12,
  border: "none",
  background: "transparent",
  color: "#2563eb",
  cursor: "pointer",
  padding: "6px 8px",
  borderRadius: 8,
};

const plainIconBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 16,
  width: 28,
  height: 28,
  borderRadius: 8,
};
