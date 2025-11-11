// apps/webapp/src/lib/wishlist.ts
export type WishItem = {
  id: string;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
  tenantName?: string | null;
};

const KEY = "tgshop:wishlist:v1";

function load(): WishItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const out = Array.isArray(arr) ? arr : [];
    // debug
    console.debug("[wishlist] load", { count: out.length, items: out });
    return out;
  } catch {
    return [];
  }
}

function save(list: WishItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    // debug
    console.debug("[wishlist] save", { count: list.length, items: list });
    window.dispatchEvent(new CustomEvent("tgshop:wishlist-updated", { detail: { count: list.length } }));
  } catch {}
}

export function list(): WishItem[] {
  return load();
}

export function count(): number {
  return load().length;
}

export function has(id: string): boolean {
  return load().some((x) => x.id === id);
}

export function add(item: WishItem) {
  const cur = load();
  if (cur.some((x) => x.id === item.id)) return;
  cur.unshift(item);
  save(cur);
}

export function remove(id: string) {
  const cur = load().filter((x) => x.id !== id);
  save(cur);
}

export function toggle(item: WishItem): boolean {
  if (has(item.id)) {
    remove(item.id);
    return false;
  } else {
    add(item);
    return true;
  }
}

// ---------- Optional React hooks ----------
import { useEffect, useState } from "react";

export function useWishlistCount(): number {
  const [n, setN] = useState(count());
  useEffect(() => {
    const onUpd = (e: any) => {
      const c = e?.detail?.count;
      setN(typeof c === "number" ? c : count());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setN(count());
    };
    window.addEventListener("tgshop:wishlist-updated", onUpd as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("tgshop:wishlist-updated", onUpd as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return n;
}
