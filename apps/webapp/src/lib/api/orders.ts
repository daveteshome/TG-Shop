// apps/webapp/src/lib/api/orders.ts
import { api } from "./index";
import type { Order } from "../types";

export type WithTenantOpts = { tenantSlug?: string | null };

/**
 * Helper – add ?tenant_slug=... to a path if we have a tenantSlug
 */
function appendTenantSlug(path: string, opts: WithTenantOpts = {}): string {
  if (!opts.tenantSlug) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}tenant_slug=${encodeURIComponent(opts.tenantSlug)}`;
}

/* ---------------- Orders list / detail ---------------- */

export function listOrders(
  take = 20,
  extra?: { tenantSlug?: string }
): Promise<Order[]> {
  const qs = new URLSearchParams();
  qs.set("take", String(take));

  // 🔑 IMPORTANT: backend expects `tenant_slug`, not the header
  if (extra?.tenantSlug) {
    qs.set("tenant_slug", extra.tenantSlug);
  }

  return api<Order[]>(`/orders?${qs.toString()}`);
}

export function getOrder(id: string, opts: WithTenantOpts = {}): Promise<Order> {
  let url = `/orders/${id}`;
  // 🔑 important: backend expects tenant_slug in query
  url = appendTenantSlug(url, opts);
  return api<Order>(url);
}

/* ---------------- Checkout ---------------- */

export type CheckoutAddressPayload = {
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  country: string;
  postalCode?: string | null;
};

export type CheckoutResult = {
  orderId: string;
  shortCode: string | null;
  status: string;
  total: string;
  currency: string;
};

/**
 * For checkout we keep the old header-based behavior (in case your backend already
 * uses X-Tenant-Slug there). We don’t touch this to avoid breaking existing flow.
 */

function withTenantHeaders(init: RequestInit = {}, opts: WithTenantOpts = {}): RequestInit {
  const headers = new Headers(init.headers as HeadersInit);
  if (opts.tenantSlug) {
    headers.set("X-Tenant-Slug", opts.tenantSlug);
  }
  return { ...init, headers };
}

export function checkout(
  payload: {
    address: CheckoutAddressPayload;
    note?: string | null;
    payment?: { method: "COD" | "BANK"; ref?: string | null; receiptImageId?: string | null };
  },
  opts: WithTenantOpts = {}
): Promise<CheckoutResult> {
  const body = JSON.stringify({
    address: payload.address,
    note: payload.note ?? null,
    payment: payload.payment ?? { method: "COD" },
  });

  return api<CheckoutResult>(
    "/checkout",
    withTenantHeaders({ method: "POST", body }, opts)
  );
}
