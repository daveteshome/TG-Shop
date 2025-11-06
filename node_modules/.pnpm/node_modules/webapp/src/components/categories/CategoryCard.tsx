import React from "react";

export type Category = {
  id: string;
  title: string;
  iconUrl?: string | null;
  emoji?: string;
};

type Props = {
  category: Category;
  active?: boolean;
  onClick?: () => void; // used on desktop via wrapper
};

function formatTitleForTwoLines(raw: string): React.ReactNode {
  if (!raw) return null;
  const commaIdx = raw.indexOf(",");
  const ampIdx = raw.indexOf("&");

  let first = raw;
  let second = "";

  if (commaIdx >= 0) {
    first = raw.slice(0, commaIdx + 1).trim();
    second = raw.slice(commaIdx + 1).trim();
  } else if (ampIdx > 0) {
    first = raw.slice(0, ampIdx + 1).trim();
    second = raw.slice(ampIdx + 1).trim();
  }

  if (!second) {
    return (
      <span
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          wordBreak: "break-word",
          whiteSpace: "normal",
        }}
      >
        {raw}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
        wordBreak: "break-word",
        whiteSpace: "normal",
      }}
    >
      <span>{first}</span>
      <br />
      <span>{second}</span>
    </span>
  );
}

export function CategoryCard({ category, active }: Props) {
  const [imgOk, setImgOk] = React.useState(true);

  return (
    <div
      // Button-like but avoid native focus/callout on mobile
      role="button"
      aria-pressed={active ? "true" : "false"}
      tabIndex={-1}
      style={{
        cursor: "grab",
        textAlign: "center",
        borderRadius: 12,
        padding: "12px 4px",
        background: active ? "rgba(0,0,0,0.05)" : "var(--tg-theme-bg-color, #fff)",
        boxShadow: active ? "0 0 0 2px #0088cc inset" : "none",
        transition: "background 0.15s ease",
        border: "none",
        minWidth: 0,
        touchAction: "none", // let parent handle touch gestures
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {category.iconUrl && imgOk ? (
        <img
          src={category.iconUrl}
          alt={category.title}
          draggable={false} // prevent image drag ghost
          onError={() => setImgOk(false)}
          style={{
            width: 36,
            height: 36,
            objectFit: "contain",
            marginBottom: 6,
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
        />
      ) : (
        <div
          style={{
            fontSize: 36,
            lineHeight: "36px",
            marginBottom: 6,
            pointerEvents: "none",
          }}
        >
          {category.emoji || "📦"}
        </div>
      )}

      <div
        style={{
          fontSize: 12.5,
          color: "var(--tg-theme-text-color, #111)",
          padding: "0 2px",
          minWidth: 0,
        }}
      >
        {formatTitleForTwoLines(category.title)}
      </div>
    </div>
  );
}
