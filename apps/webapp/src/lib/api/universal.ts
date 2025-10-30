import { api } from "./index";

export async function fetchUniversal(page = 1, perPage = 20, q?: string, category?: string) {
  const qs = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (q) qs.set("q", q);
  if (category) qs.set("category", category);
  return api<{ page: number; perPage: number; total: number; items: any[] }>(`/universal/products?${qs}`);
}

export async function fetchUniversalProduct(id: string) {
  return api<any>(`/universal/products/${id}`);
}

export async function logContactIntent(productId: string, type: "message" | "call", buyerTgId: string) {
  return api(`/contact-intent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, type, buyerTgId }),
  });
}
