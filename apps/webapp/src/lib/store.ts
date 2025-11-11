import { useEffect, useState } from "react";
import { getCart } from "./api/cart";

let _cartCount = 0;
const listeners = new Set<(n: number) => void>();

export function onCartCountChange(fn: (n: number) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); }; // return void
}
function setCartCount(n: number) {
  _cartCount = n;
  listeners.forEach((fn) => fn(n));
}

/** Tenant-aware refresh */
export async function refreshCartCount(tenantSlug?: string): Promise<void> {
  try {
    const cart = await getCart({ tenantSlug });
    const n = (cart?.items ?? []).reduce((s: number, it: any) => s + (it.qty ?? it.quantity ?? 1), 0);
    setCartCount(n);
  } catch {}
}

/** Optimistic local bump (e.g., after add to cart succeeds) */
export function optimisticBumpCart(by: number) {
  setCartCount(Math.max(0, _cartCount + by));
}

export function useCartCount() {
  const [n, setN] = useState(_cartCount);
  useEffect(() => onCartCountChange(setN), []);
  return n;
}

/** Global event listener: `new CustomEvent("tgshop:cart-updated", { detail:{ tenantSlug } })` */
if (typeof window !== "undefined") {
  window.addEventListener("tgshop:cart-updated", (e: any) => {
    const slug = e?.detail?.tenantSlug as string | undefined;
    refreshCartCount(slug);
  });
}
