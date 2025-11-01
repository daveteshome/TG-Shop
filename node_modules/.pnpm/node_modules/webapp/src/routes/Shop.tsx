// apps/webapp/src/routes/Shop.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  photoUrl?: string | null;
  categoryId?: string | null;
  stock?: number | null;
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
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // create / edit
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCurrency, setPCurrency] = useState("ETB");
  const [pCategory, setPCategory] = useState<string | null>(null);
  const [pDesc, setPDesc] = useState("");
  const [pStock, setPStock] = useState("0");
  // 👇 create: now multiple
  const [pImageFiles, setPImageFiles] = useState<File[]>([]);
  // 👇 edit: keep single
  const [pImageFileEdit, setPImageFileEdit] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

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

  useEffect(() => {
    if (!slug) return;
    loadProducts(slug);
  }, [slug]);

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

  // CREATE with multiple images
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
      const imageIds: string[] = [];

      // 1) upload all selected images (if any)
      if (pImageFiles.length > 0) {
        const initData = getInitDataRaw();

        // upload them one by one (simplest + ok for mini app)
        for (const file of pImageFiles) {
          const fd = new FormData();
          fd.append("file", file);

          const uploadRes = await fetch("/api/uploads/image", {
            method: "POST",
            headers: initData ? { Authorization: `tma ${initData}` } : undefined,
            body: fd,
          });

          if (!uploadRes.ok) {
            throw new Error("image_upload_failed");
          }

          const uploadJson = await uploadRes.json();
          if (uploadJson.imageId) {
            imageIds.push(uploadJson.imageId);
          }
        }
      }

      // 2) create product
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
          // 👇 backend supports both imageId and imageIds, we send array
          imageIds,
        }),
      });

      // 3) reload
      await loadProducts(slug);

      // 4) reset
      setPTitle("");
      setPPrice("");
      setPCurrency("ETB");
      setPDesc("");
      setPCategory(null);
      setPStock("0");
      setPImageFiles([]); // 👈 reset images
      setShowCreate(false);
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  // EDIT (keep single image for now)
  async function handleUpdateProduct() {
    if (!slug || !editingId) return;
    setSaving(true);
    setSaveErr(null);

    try {
      let imageIdToSend: string | null | undefined = undefined;

      if (pImageFileEdit) {
        const fd = new FormData();
        fd.append("file", pImageFileEdit);
        const initData = getInitDataRaw();

        const uploadRes = await fetch("/api/uploads/image", {
          method: "POST",
          headers: initData ? { Authorization: `tma ${initData}` } : undefined,
          body: fd,
        });

        if (!uploadRes.ok) {
          throw new Error("Image upload failed");
        }

        const uploadJson = await uploadRes.json();
        imageIdToSend = uploadJson.imageId ?? null;
      } else {
        imageIdToSend = undefined;
      }

      await api(`/shop/${slug}/products/${editingId}`, {
        method: "PATCH",
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
          ...(imageIdToSend !== undefined ? { imageId: imageIdToSend } : {}),
        }),
      });

      await loadProducts(slug);

      setShowEdit(false);
      setEditingId(null);
      setPTitle("");
      setPPrice("");
      setPCurrency("ETB");
      setPDesc("");
      setPCategory(null);
      setPStock("0");
      setPImageFileEdit(null);
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to update product");
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
        <button
          onClick={() => {
            setShowCreate((v) => !v);
            setShowEdit(false);
            setEditingId(null);
            setSaveErr(null);
          }}
          style={smallBtn}
        >
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
        <div style={panel}>
          <strong style={{ fontSize: 14 }}>New product</strong>
          {saveErr ? <div style={{ color: "crimson", fontSize: 13 }}>{saveErr}</div> : null}

          <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Product title" style={input} />

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

          <select value={pCategory ?? ""} onChange={(e) => setPCategory(e.target.value || null)} style={input}>
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

          <input value={pStock} onChange={(e) => setPStock(e.target.value)} placeholder="Stock (0)" style={input} />

          {/* 👇 multiple images */}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setPImageFiles(files);
            }}
            style={input}
          />
          {pImageFiles.length > 0 ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {pImageFiles.length} image{pImageFiles.length > 1 ? "s" : ""} selected
            </div>
          ) : null}

          <button onClick={handleCreateProduct} disabled={saving} style={btn}>
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      )}

      {/* edit form */}
      {showEdit && (
        <div style={panel}>
          <strong style={{ fontSize: 14 }}>Edit product</strong>
          {saveErr ? <div style={{ color: "crimson", fontSize: 13 }}>{saveErr}</div> : null}

          <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Product title" style={input} />

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

          <select value={pCategory ?? ""} onChange={(e) => setPCategory(e.target.value || null)} style={input}>
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
            placeholder="Description"
            style={{ ...input, minHeight: 60 }}
          />

          <input value={pStock} onChange={(e) => setPStock(e.target.value)} placeholder="Stock (0)" style={input} />

          {/* edit: still single image */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setPImageFileEdit(f);
            }}
            style={input}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleUpdateProduct} disabled={saving} style={btn}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => {
                setShowEdit(false);
                setEditingId(null);
                setSaveErr(null);
              }}
              style={smallBtn}
            >
              Cancel
            </button>
          </div>
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
              onClick={() => {
                if (!slug) return;
                nav(`/shop/${slug}/p/${p.id}`);
              }}
              style={{
                display: "flex",
                gap: 12,
                border: "1px solid rgba(0,0,0,.03)",
                borderRadius: 10,
                padding: 8,
                background: "#fff",
                alignItems: "center",
                cursor: "pointer",
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
                  flexShrink: 0,
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
              <button
                style={smallBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setPTitle(p.title);
                  setPPrice(String(p.price));
                  setPCurrency(p.currency || "ETB");
                  setPDesc(p.description || "");
                  setPCategory(p.categoryId ?? null);
                  setPStock(String(p.stock ?? 0));
                  setPImageFileEdit(null);
                  setEditingId(p.id);
                  setShowEdit(true);
                  setShowCreate(false);
                  setSaveErr(null);
                }}
              >
                Edit
              </button>
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

const panel: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.05)",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 8,
  background: "#fff",
};
