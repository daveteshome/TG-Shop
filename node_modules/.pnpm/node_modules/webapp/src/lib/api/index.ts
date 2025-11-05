// apps/webapp/src/lib/api/index.ts
import { getInitDataRaw } from "../telegram";

const API_BASE =  '/api';

// --- add near your other exported types/helpers ---

// --- Add in apps/webapp/src/lib/api/index.ts ---

export type CreateTenantPayload = {
  name: string;
  publicPhone?: string | null;
  description?: string | null;
  publishUniversal?: boolean;
  logoImageId?: string | null;
};

export type TenantDTO = {
  id: string;
  slug: string;
  name: string;
  publicPhone?: string | null;
  description?: string | null;
  publishUniversal?: boolean;
  logoImageId?: string | null;
  // logoWebUrl?: string | null; // include if your backend returns it
};

export async function createTenantFull(
  payload: CreateTenantPayload
): Promise<{ tenant: TenantDTO }> {
  return api("/tenants", {
    method: "POST",
    // ✅ ensure JSON header is set (your api() may do it, but be explicit)
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}


export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers as HeadersInit);

  const raw = getInitDataRaw();
  
  if (raw && !headers.has("Authorization")) {
    headers.set("Authorization", `tma ${raw}`);
  } else if (!raw) {
    console.log('API Call - No initData available for Authorization');
  }

  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }


  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });

    
    if (!res.ok) {
      const text = await res.text();
      console.error('API Call - Error response:', text);
      throw new Error(text || `${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API Call - Fetch error:', error);
    throw error;
  }
}