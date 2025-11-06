import React from "react";
import type { Category } from "./CategoryCard";
import { CategoryCard } from "./CategoryCard";

type Props = {
  categories: Category[];
  activeId?: string;
  onPick?: (id: string) => void;
};

export function CategoryGrid({ categories, activeId, onPick }: Props) {
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))", // 4 per row
        gap: 10,
        marginTop: 8,
        overflowX: "hidden", // ensure no horizontal scroll
      }}
    >
      {categories.map((c) => (
        <CategoryCard
          key={c.id}
          category={c}
          active={activeId === c.id}
          onClick={() => onPick?.(c.id)}
        />
      ))}
    </div>
  );
}
