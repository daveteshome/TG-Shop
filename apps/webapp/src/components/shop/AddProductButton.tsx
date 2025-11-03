import React from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function AddProductButton({ to }: { to?: string }) {
  const nav = useNavigate();
  const { slug } = useParams();

  const href = to ?? `/shop/${slug}/products/new`;
  return (
    <button
      className="px-3 py-1 rounded-full bg-black text-white text-sm font-medium"
      onClick={() => nav(href)}
    >
      + Add product
    </button>
  );
}
