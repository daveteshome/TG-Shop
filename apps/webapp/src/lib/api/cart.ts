import { api } from "./index";
import type { Cart } from "../types";
type Opt = { tenantSlug?: string };

function withTenant(h: HeadersInit | undefined, tenantSlug?: string): HeadersInit | undefined {
  if (!tenantSlug) return h;
  return { ...(h || {}), "X-Tenant-Slug": tenantSlug };
}

export function getCart(opt: Opt = {}): Promise<Cart> {
  return api<Cart>("/cart", { headers: withTenant(undefined, opt.tenantSlug) });
}
export function addItem(productId: string, qty = 1, opt: Opt = {}): Promise<Cart> {
  return api<Cart>("/cart/items", {
    method: "POST",
    headers: withTenant({ "Content-Type": "application/json" }, opt.tenantSlug),
    body: JSON.stringify({ productId, qty }),
  });
}

// apps/webapp/src/lib/api/cart.ts
export function patchItem(
  itemId: string,
  qtyDelta: number,
  opt: { tenantSlug?: string } = {}
) {
  return api(`/cart/items/${itemId}`, {
    method: "PATCH",
    headers: withTenant({ "Content-Type": "application/json" }, opt.tenantSlug),
    body: JSON.stringify({ qtyDelta }),
  });
}

export function removeItem(itemId: string, opt: Opt = {}): Promise<{ ok: true }> {
  return api<{ ok: true }>(`/cart/items/${itemId}`, {
    method: "DELETE",
    headers: withTenant(undefined, opt.tenantSlug),
  });
}
