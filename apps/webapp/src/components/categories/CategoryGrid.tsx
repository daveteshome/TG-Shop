import React from "react";
import { CategoryCard } from "./CategoryCard";
import type { Category } from "./CategoryCard";

type Props = {
  categories: Category[];
  activeId?: string;
  onPick?: (id: string) => void;
  onReorder?: (idsInNewOrder: string[]) => void;
};

export function CategoryGrid({ categories, activeId, onPick, onReorder }: Props) {
  const dragIndex = React.useRef<number | null>(null);
  const didDrag = React.useRef(false);

  function handleDragStart(e: React.DragEvent, index: number) {
    if (isTouchDevice()) return;
    dragIndex.current = index;
    didDrag.current = false;
    e.dataTransfer.effectAllowed = "move";
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.setData("text/plain", String(categories[index].id));
  }

  function handleDragOver(e: React.DragEvent) {
    if (isTouchDevice()) return;
    e.preventDefault();
  }

  function handleDrag(e: React.DragEvent) {
    if (isTouchDevice()) return;
    didDrag.current = true;
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    if (isTouchDevice()) return;
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === dropIndex) return;

    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    didDrag.current = false;
    onReorder?.(next.map((c) => c.id));
  }

  function handleClick(id: string) {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    onPick?.(id);
  }

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const longPressTimer = React.useRef<number | null>(null);
  const startPoint = React.useRef<{ x: number; y: number } | null>(null);
  const movedBeforeLongPress = React.useRef(false);

  const [metrics, setMetrics] = React.useState<{
    left: number;
    top: number;
    cellW: number;
    cellH: number;
    gapX: number;
    gapY: number;
    cols: number;
  } | null>(null);

  React.useLayoutEffect(() => {
    function measure() {
      const cont = containerRef.current;
      if (!cont) return;
      const rect = cont.getBoundingClientRect();
      const first = cont.children[0] as HTMLElement | undefined;
      if (!first) return;

      const fr = first.getBoundingClientRect();
      const styles = getComputedStyle(cont);
      const gapX = parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const gapY = parseFloat(styles.rowGap || styles.gap || "0") || 0;
      const cols = 4;

      setMetrics({
        left: rect.left,
        top: rect.top,
        cellW: fr.width,
        cellH: fr.height,
        gapX,
        gapY,
        cols,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [categories.length]);

  const [touchDrag, setTouchDrag] = React.useState<{
    active: boolean;
    draggedId: string;
    baseOrder: Category[];
    previewOrder: Category[];
    ghostX: number;
    ghostY: number;
    ghostW: number;
    ghostH: number;
    ghostOffsetX: number;
    ghostOffsetY: number;
  } | null>(null);

  function isTouchDevice(): boolean {
    return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function snappedIndexFromPoint(x: number, y: number, count: number): number {
    if (!metrics) return -1;
    const { left, top, cellW, cellH, gapX, gapY, cols } = metrics;
    const lx = x - left;
    const ly = y - top;
    const pitchX = cellW + gapX;
    const pitchY = cellH + gapY;
    let col = Math.floor(lx / pitchX);
    let row = Math.floor(ly / pitchY);
    col = clamp(col, 0, cols - 1);
    if (row < 0) row = 0;
    const idx = row * cols + col;
    return clamp(idx, 0, count - 1);
  }

  function onTouchStart(e: React.TouchEvent, index: number) {
    if (!isTouchDevice()) return;
    movedBeforeLongPress.current = false;
    const t = e.touches[0];
    startPoint.current = { x: t.clientX, y: t.clientY };
    clearLongPressTimer();

    longPressTimer.current = window.setTimeout(() => {
      if (movedBeforeLongPress.current) return;
      const cont = containerRef.current;
      if (!cont) return;
      const cell = cont.children[index] as HTMLElement;
      if (!cell) return;

      const rect = cell.getBoundingClientRect();
      const offsetX = t.clientX - rect.left;
      const offsetY = t.clientY - rect.top;
      const draggedId = categories[index].id;

      setTouchDrag({
        active: true,
        draggedId,
        baseOrder: categories,
        previewOrder: categories,
        ghostX: t.clientX,
        ghostY: t.clientY,
        ghostW: rect.width,
        ghostH: rect.height,
        ghostOffsetX: offsetX,
        ghostOffsetY: offsetY,
      });
    }, 180);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isTouchDevice()) return;
    const t = e.touches[0];
    const x = t.clientX;
    const y = t.clientY;

    if (!touchDrag?.active) {
      const sp = startPoint.current;
      if (sp) {
        const dx = Math.abs(x - sp.x);
        const dy = Math.abs(y - sp.y);
        if (dx > 6 || dy > 6) {
          movedBeforeLongPress.current = true;
          clearLongPressTimer();
        }
      }
      return;
    }

    e.preventDefault();
    setTouchDrag(prev => (prev ? { ...prev, ghostX: x, ghostY: y } : prev));

    const targetIdx = snappedIndexFromPoint(x, y, categories.length);
    if (targetIdx < 0) return;

    setTouchDrag(prev => {
      if (!prev) return prev;
      const base = prev.baseOrder;
      const draggedId = prev.draggedId;
      const without = base.filter(c => c.id !== draggedId);
      const clampedTarget = clamp(targetIdx, 0, without.length);
      const draggedItem = base.find(c => c.id === draggedId)!;
      const preview = [...without];
      preview.splice(clampedTarget, 0, draggedItem);
      return { ...prev, previewOrder: preview };
    });
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!isTouchDevice()) return;
    clearLongPressTimer();

    if (touchDrag?.active) {
      const ids = touchDrag.previewOrder.map(c => c.id);
      setTouchDrag(null);
      onReorder?.(ids);
      return;
    }

    const t = e.changedTouches[0];
    const idx = indexFromPointNearest(t.clientX, t.clientY);
    if (idx >= 0) onPick?.(categories[idx].id);
  }

  function indexFromPointNearest(x: number, y: number): number {
    const cont = containerRef.current;
    if (!cont) return -1;
    const children = Array.from(cont.children) as HTMLElement[];
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  const isTouch = isTouchDevice();
  const renderCats: Category[] = touchDrag?.active ? touchDrag.previewOrder : categories;
  const hiddenId = touchDrag?.active ? touchDrag.draggedId : null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 10,
        marginTop: 8,
        overflowX: "hidden",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        position: "relative",
      }}
      onDragOver={handleDragOver}
      onDrag={handleDrag}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {renderCats.map((c, i) => (
        <div
          key={c.id}
          draggable={!isTouch}
          onDragStart={(e) => handleDragStart(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onTouchStart={(e) => onTouchStart(e, i)}
          style={{ minWidth: 0, visibility: hiddenId === c.id ? "hidden" : "visible" }}
          onClick={() => {
            if (!isTouch) handleClick(c.id);
          }}
        >
          <CategoryCard category={c} active={activeId === c.id} />
        </div>
      ))}

      {touchDrag?.active && (
        <div
          style={{
            position: "fixed",
            left: touchDrag.ghostX - touchDrag.ghostOffsetX,
            top: touchDrag.ghostY - touchDrag.ghostOffsetY,
            width: touchDrag.ghostW,
            height: touchDrag.ghostH,
            pointerEvents: "none",
            zIndex: 1000,
            transform: "scale(1.02)",
            opacity: 0.96,
            boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
            borderRadius: 12,
            background: "var(--tg-theme-bg_color, #fff)",
          }}
        >
          <GhostCard category={categories.find(c => c.id === touchDrag.draggedId)!} />
        </div>
      )}
    </div>
  );
}

function GhostCard({ category }: { category: Category }) {
  const glyph = category.emoji ?? category.icon ?? "📦"; // ✅ same fallback logic
  return (
    <div style={{ textAlign: "center", borderRadius: 12, padding: "12px 4px" }}>
      {category.iconUrl ? (
        <img
          src={category.iconUrl}
          alt={category.title}
          draggable={false}
          style={{ width: 36, height: 36, objectFit: "contain", marginBottom: 6, pointerEvents: "none" }}
        />
      ) : (
        <div style={{ fontSize: 36, lineHeight: "36px", marginBottom: 6, pointerEvents: "none" }}>
          {glyph}
        </div>
      )}
      <div
        style={{
          fontSize: 12.5,
          color: "var(--tg-theme-text-color, #111)",
          padding: "0 2px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {category.title}
      </div>
    </div>
  );
}
