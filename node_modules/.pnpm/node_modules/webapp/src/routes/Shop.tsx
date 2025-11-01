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

// images we show in the UI (both create & edit)
type UiImageExisting = {
  kind: "existing";
  productImageId: string; // id of productImage row
  imageId: string | null;
  url: string | null;
};

type UiImageNew = {
  kind: "new";
  tempId: string;
  file: File;
  previewUrl: string;
};

type UiImage = UiImageExisting | UiImageNew;

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

  // form fields
  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCurrency, setPCurrency] = useState("ETB");
  const [pCategory, setPCategory] = useState<string | null>(null);
  const [pDesc, setPDesc] = useState("");
  const [pStock, setPStock] = useState("0");

  // create images
  const [createImages, setCreateImages] = useState<UiImageNew[]>([]);

  // edit images (existing + new)
  const [editImages, setEditImages] = useState<UiImage[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // load products list
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

  // load single product (for edit)
  async function loadProductForEdit(shopSlug: string, productId: string) {
    try {
      const r = await api<{ product: any; images: any[] }>(`/shop/${shopSlug}/products/${productId}`);
      const prod = r.product;
      const imgs = (r.images || []).map<UiImage>((im) => ({
        kind: "existing",
        productImageId: im.id ?? im.productImageId ?? "",
        imageId: im.imageId ?? null,
        url: im.webUrl ?? im.url ?? null,
      }));

      setPTitle(prod.title || "");
      setPPrice(String(prod.price ?? ""));
      setPCurrency(prod.currency || "ETB");
      setPDesc(prod.description || "");
      setPCategory(prod.categoryId ?? null);
      setPStock(String(prod.stock ?? 0));
      setEditImages(imgs);
    } catch (e: any) {
      console.error("loadProductForEdit failed", e);
      setSaveErr("Failed to load product details");
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

  // =============== CREATE ===============
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

      if (createImages.length > 0) {
        const initData = getInitDataRaw();
        for (const img of createImages) {
          const fd = new FormData();
          fd.append("file", img.file);
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
          imageIds, // ordered
        }),
      });

      await loadProducts(slug);

      // reset
      setPTitle("");
      setPPrice("");
      setPCurrency("ETB");
      setPDesc("");
      setPCategory(null);
      setPStock("0");
      setCreateImages([]);
      setShowCreate(false);
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  // =============== EDIT ===============
  async function handleUpdateProduct() {
    if (!slug || !editingId) return;
    setSaving(true);
    setSaveErr(null);

    try {
      const initData = getInitDataRaw();

      // 1) upload all "new" images first & collect their imageIds
      const uploadedNew: { tempId: string; imageId: string }[] = [];

      for (const img of editImages) {
        if (img.kind === "new") {
          const fd = new FormData();
          fd.append("file", img.file);
          const uploadRes = await fetch("/api/uploads/image", {
            method: "POST",
            headers: initData ? { Authorization: `tma ${initData}` } : undefined,
            body: fd,
          });
          if (!uploadRes.ok) {
            throw new Error("image_upload_failed");
          }
          const uploadJson = await uploadRes.json();
          uploadedNew.push({ tempId: img.tempId, imageId: uploadJson.imageId });
        }
      }

      // 2) build final ordered list of imageIds (simple variant)
      const imageIds: string[] = [];
      for (const img of editImages) {
        if (img.kind === "existing") {
          if (img.imageId) imageIds.push(img.imageId);
        } else {
          const found = uploadedNew.find((u) => u.tempId === img.tempId);
          if (found) imageIds.push(found.imageId);
        }
      }

      // 3) ALSO build imagesReplace (old variant) so old backend still works
      const imagesReplace: Array<
        | { type: "existing"; imageId: string }
        | { type: "new"; imageId: string }
      > = [];

      for (const img of editImages) {
        if (img.kind === "existing") {
          if (img.imageId) {
            imagesReplace.push({
              type: "existing",
              imageId: img.imageId,
            });
          }
        } else {
          const found = uploadedNew.find((u) => u.tempId === img.tempId);
          if (found) {
            imagesReplace.push({
              type: "new",
              imageId: found.imageId,
            });
          }
        }
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
          imageIds,      // 👉 new/simple shape
          imagesReplace, // 👉 old shape (for current backend)
        }),
      });

      await loadProducts(slug);

      setShowEdit(false);
      setEditingId(null);
      setEditImages([]);
      setPTitle("");
      setPPrice("");
      setPCurrency("ETB");
      setPDesc("");
      setPCategory(null);
      setPStock("0");
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  // helpers
  function moveImage<T extends UiImage | UiImageNew>(list: T[], index: number, dir: -1 | 1): T[] {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= list.length) return list;
    const copy = [...list];
    const tmp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = tmp;
    return copy;
  }

  return (
    <div className="shop-page" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* header */}
      <header style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: "999px", background: "#eee" }} />
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
            setCreateImages([]);
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

      {/* CREATE FORM */}
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

          {/* create images */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length === 0) return;
                setCreateImages((prev) => [
                  ...prev,
                  ...files.map((file) => ({
                    kind: "new" as const,
                    tempId: Math.random().toString(36).slice(2),
                    file,
                    previewUrl: URL.createObjectURL(file),
                  })),
                ]);
                e.target.value = "";
              }}
              style={input}
            />
            {createImages.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {createImages.map((img, index) => (
                  <div
                    key={img.tempId}
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 8,
                      backgroundImage: `url(${img.previewUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      position: "relative",
                      border: index === 0 ? "2px solid #000" : "1px solid rgba(0,0,0,.1)",
                    }}
                  >
                    <button
                      onClick={() => {
                        setCreateImages((prev) => prev.filter((x) => x.tempId !== img.tempId));
                      }}
                      style={thumbDeleteBtn}
                    >
                      ×
                    </button>
                    {index !== 0 ? (
                      <button
                        onClick={() => {
                          setCreateImages((prev) => {
                            const copy = [...prev];
                            const i = copy.findIndex((x) => x.tempId === img.tempId);
                            if (i === -1) return prev;
                            const [item] = copy.splice(i, 1);
                            copy.unshift(item);
                            return copy;
                          });
                        }}
                        style={thumbCoverBtn}
                      >
                        ★
                      </button>
                    ) : (
                      <div style={thumbCoverTag}>Cover</div>
                    )}
                    <div style={thumbMoveRow}>
                      <button
                        onClick={() => {
                          setCreateImages((prev) => moveImage(prev, index, -1));
                        }}
                        style={thumbMoveBtn}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          setCreateImages((prev) => moveImage(prev, index, +1));
                        }}
                        style={thumbMoveBtn}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button onClick={handleCreateProduct} disabled={saving} style={btn}>
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      )}

      {/* content (product list) */}
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
            <div key={p.id}>
              {/* product card */}
              <div
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
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!slug) return;
                    setShowCreate(false);
                    setShowEdit(true);
                    setEditingId(p.id);
                    setSaveErr(null);
                    await loadProductForEdit(slug, p.id);
                  }}
                >
                  Edit
                </button>
              </div>

              {/* inline EDIT for THIS product */}
              {showEdit && editingId === p.id ? (
                <div style={{ ...panel, marginTop: 8 }}>
                  <strong style={{ fontSize: 14 }}>Edit product</strong>
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
                    <select
                      value={pCurrency}
                      onChange={(e) => setPCurrency(e.target.value)}
                      style={{ ...input, flexBasis: 110 }}
                    >
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
                    placeholder="Description"
                    style={{ ...input, minHeight: 60 }}
                  />

                  <input
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    placeholder="Stock (0)"
                    style={input}
                  />

                  {/* edit images widget */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                      Images (existing + new)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (files.length === 0) return;
                        setEditImages((prev) => [
                          ...prev,
                          ...files.map<UiImage>((file) => ({
                            kind: "new",
                            tempId: Math.random().toString(36).slice(2),
                            file,
                            previewUrl: URL.createObjectURL(file),
                          })),
                        ]);
                        e.target.value = "";
                      }}
                      style={input}
                    />
                    {editImages.length > 0 ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {editImages.map((img, index) => {
                          const isCover = index === 0;
                          const url = img.kind === "existing" ? img.url : img.previewUrl;
                          return (
                            <div
                              key={img.kind === "existing" ? img.productImageId : img.tempId}
                              style={{
                                width: 62,
                                height: 62,
                                borderRadius: 8,
                                backgroundImage: url ? `url(${url})` : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                position: "relative",
                                border: isCover ? "2px solid #000" : "1px solid rgba(0,0,0,.1)",
                              }}
                            >
                              {/* delete */}
                              <button
                                onClick={() => {
                                  setEditImages((prev) => prev.filter((_, i) => i !== index));
                                }}
                                style={thumbDeleteBtn}
                              >
                                ×
                              </button>
                              {/* make cover */}
                              {!isCover ? (
                                <button
                                  onClick={() => {
                                    setEditImages((prev) => {
                                      const copy = [...prev];
                                      const [item] = copy.splice(index, 1);
                                      copy.unshift(item);
                                      return copy;
                                    });
                                  }}
                                  style={thumbCoverBtn}
                                >
                                  ★
                                </button>
                              ) : (
                                <div style={thumbCoverTag}>Cover</div>
                              )}
                              {/* move up/down */}
                              <div style={thumbMoveRow}>
                                <button
                                  onClick={() => {
                                    setEditImages((prev) => moveImage(prev, index, -1));
                                  }}
                                  style={thumbMoveBtn}
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => {
                                    setEditImages((prev) => moveImage(prev, index, +1));
                                  }}
                                  style={thumbMoveBtn}
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
                    <button onClick={handleUpdateProduct} disabled={saving} style={btn}>
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      onClick={() => {
                        setShowEdit(false);
                        setEditingId(null);
                        setEditImages([]);
                        setSaveErr(null);
                      }}
                      style={smallBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
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

const thumbDeleteBtn: React.CSSProperties = {
  position: "absolute",
  top: -6,
  right: -6,
  width: 20,
  height: 20,
  borderRadius: 999,
  border: "none",
  background: "rgba(0,0,0,.6)",
  color: "#fff",
  fontSize: 11,
  cursor: "pointer",
};

const thumbCoverBtn: React.CSSProperties = {
  position: "absolute",
  top: -6,
  left: -6,
  width: 20,
  height: 20,
  borderRadius: 999,
  border: "none",
  background: "rgba(255,165,0,.95)",
  color: "#fff",
  fontSize: 11,
  cursor: "pointer",
};

const thumbCoverTag: React.CSSProperties = {
  position: "absolute",
  top: -6,
  left: -6,
  background: "#000",
  color: "#fff",
  fontSize: 10,
  padding: "1px 6px",
  borderRadius: 999,
};

const thumbMoveRow: React.CSSProperties = {
  position: "absolute",
  bottom: -18,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 4,
};

const thumbMoveBtn: React.CSSProperties = {
  border: "none",
  background: "rgba(255,255,255,.8)",
  borderRadius: 6,
  fontSize: 10,
  width: 20,
  height: 16,
  cursor: "pointer",
};
