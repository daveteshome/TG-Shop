import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  photoUrl?: string | null;
};

type Tenant = {
  id: string;
  slug: string;
  name: string;
};

type Category = {
  id: string;
  title: string;
};

export default function Shop() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // create product UI
  const [showCreate, setShowCreate] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCurrency, setPCurrency] = useState("ETB");
  const [pCategory, setPCategory] = useState<string | null>(null);
  const [pDesc, setPDesc] = useState("");
  const [pStock, setPStock] = useState("0");
  const [pImageFile, setPImageFile] = useState<File | null>(null); // 👈 real file, not URL
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // load products (kept same as your working version)
  async function loadProducts(shopSlug: string) {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ items: Product[]; tenant: Tenant }>(`/shop/${shopSlug}/products`);
      setProducts(r.items || []);
      setTenant(r.tenant || null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    if (!slug) return;
    loadProducts(slug);
  }, [slug]);

  // load categories (for dropdown)
  useEffect(() => {
    (async () => {
      try {
        const r = await api<Category[]>(`/categories`);
        setCategories(r || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function handleCreateProduct() {
    if (!slug) return;
    if (!pTitle.trim()) {
      setSaveErr("Title is required");
      return;
    }
    if (!pPrice.trim() || isNaN(Number(pPrice))) {
      setSaveErr("Valid price is required");
      return;
    }

    setSaving(true);
    setSaveErr(null);

    try {
      // 1) if the user picked an image → upload to backend (R2)
      let imageId: string | null = null;
      if (pImageFile) {
        const fd = new FormData();
        fd.append("file", pImageFile);
        const initData = getInitDataRaw();
        console.log("[UPLOAD] on shop.tsx");


        const uploadRes = await fetch("/api/uploads/image", {
          method: "POST",
          headers: initData
      ? {
          Authorization: `tma ${initData}`,
        }
      : undefined,
          body: fd,
        });
        console.log("below if ");
        if (!uploadRes.ok) {
          console.log("inside if if ");
          throw new Error("image_upload_failed");
        }
        const uploadJson = await uploadRes.json();
        imageId = uploadJson.imageId || null;
      }

      // 2) create product (JSON)
      await api(`/shop/${slug}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: pTitle.trim(),
          price: Number(pPrice),
          currency: pCurrency,
          description: pDesc.trim() ? pDesc.trim() : null,
          categoryId: pCategory,
          stock: Number(pStock) || 0,
          active: true,
          imageId, // 👈 pass R2 image id
        }),
      });

      // 3) refresh list
      await loadProducts(slug);

      // 4) reset
      setPTitle("");
      setPPrice("");
      setPCurrency("ETB");
      setPDesc("");
      setPCategory(null);
      setPStock("0");
      setPImageFile(null);
      setShowCreate(false);
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shop-page" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* header */}
      <header style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "999px",
            background: "#eee",
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{tenant?.name ?? "Shop"}</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Private</div>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} style={smallBtn}>
          {showCreate ? "Cancel" : "+ Add product"}
        </button>
      </header>

      {/* tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={tabActive}>Products</button>
        <button style={tab}>About</button>
      </div>

      {/* search */}
      <input
        placeholder="Search in this shop..."
        style={{
          border: "1px solid rgba(0,0,0,.06)",
          borderRadius: 10,
          padding: "7px 10px",
          fontSize: 14,
        }}
      />

      {/* create form */}
      {showCreate && (
        <div
          style={{
            border: "1px solid rgba(0,0,0,.05)",
            borderRadius: 12,
            padding: 12,
            display: "grid",
            gap: 8,
            background: "#fff",
          }}
        >
          <strong style={{ fontSize: 14 }}>New product</strong>
          {saveErr ? <div style={{ color: "crimson", fontSize: 13 }}>{saveErr}</div> : null}

          <input
            value={pTitle}
            onChange={(e) => setPTitle(e.target.value)}
            placeholder="Product title"
            style={input}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={pPrice}
              onChange={(e) => setPPrice(e.target.value)}
              placeholder="Price"
              style={{ ...input, flex: 1 }}
              inputMode="decimal"
            />
            <select value={pCurrency} onChange={(e) => setPCurrency(e.target.value)} style={{ ...input, flexBasis: 110 }}>
              <option value="ETB">ETB</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <select
            value={pCategory ?? ""}
            onChange={(e) => setPCategory(e.target.value || null)}
            style={input}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <textarea
            value={pDesc}
            onChange={(e) => setPDesc(e.target.value)}
            placeholder="Description (optional)"
            style={{ ...input, minHeight: 70, resize: "vertical" }}
          />

          <input
            value={pStock}
            onChange={(e) => setPStock(e.target.value)}
            placeholder="Stock (0)"
            style={input}
            inputMode="numeric"
          />

          {/* 👇 actual file picker */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setPImageFile(file);
            }}
            style={input}
          />

          <button onClick={handleCreateProduct} disabled={saving} style={btn}>
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      )}

      {/* content */}
      {loading ? (
        <div>Loading…</div>
      ) : err ? (
        <div style={{ color: "crimson" }}>{err}</div>
      ) : products.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: "rgba(0,0,0,.02)",
            borderRadius: 10,
            textAlign: "center",
            fontSize: 14,
          }}
        >
          No products in this shop yet.
          <br />
          <small style={{ opacity: 0.6 }}>Add your first product to make it visible here.</small>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                gap: 12,
                border: "1px solid rgba(0,0,0,.03)",
                borderRadius: 10,
                padding: 8,
                background: "#fff",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "#ddd",
                  borderRadius: 8,
                  backgroundImage: p.photoUrl ? `url(${p.photoUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{p.title}</div>
                {p.description ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                    {p.description.slice(0, 60)}
                    {p.description.length > 60 ? "…" : ""}
                  </div>
                ) : null}
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {p.price} {p.currency}
                </div>
              </div>
              <button style={smallBtn}>Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* styles */
const smallBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.1)",
  background: "#fff",
  borderRadius: 10,
  padding: "5px 10px",
  fontSize: 12,
  cursor: "pointer",
};

const tab: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 13,
  padding: "5px 0",
  cursor: "pointer",
  opacity: 0.6,
};

const tabActive: React.CSSProperties = {
  ...tab,
  opacity: 1,
  borderBottom: "2px solid #000",
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 14,
};

const btn: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 14,
  cursor: "pointer",
};
