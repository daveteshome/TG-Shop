// src/routes/Shop.tsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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

type Category = {
  id: string;
  title: string;
};

type UiImageNew = {
  kind: "new";
  tempId: string;
  file: File;
  previewUrl: string;
};

type UiImageExisting = {
  kind: "existing";
  productImageId: string;
  imageId: string | null;
  url: string | null;
};

type UiImage = UiImageNew | UiImageExisting;

export default function Shop() {
  const { slug } = useParams<{ slug: string }>();
  const loc = useLocation();
  const nav = useNavigate();

  // remember last opened shop for ProductDetail back button
  useEffect(() => {
    if (slug) {
      localStorage.setItem("tgshop:lastShopPage", `/shop/${slug}`);
    }
  }, [slug, loc.pathname]);

  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCurrency, setPCurrency] = useState("ETB");
  const [pCategory, setPCategory] = useState<string | null>(null);
  const [pDesc, setPDesc] = useState("");
  const [pStock, setPStock] = useState("0");
  const [createImages, setCreateImages] = useState<UiImageNew[]>([]);
  const createFileInputRef = useRef<HTMLInputElement | null>(null); // 👈 will hide real input

  // edit form (shown under the product we click)
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editImages, setEditImages] = useState<UiImage[]>([]);
  const editFileInputRef = useRef<HTMLInputElement | null>(null); // 👈 will hide real input

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  async function loadProducts(shopSlug: string) {
    const res = await api<{ items: Product[]; tenant: { id: string; name: string } }>(`/shop/${shopSlug}/products`);
    setProducts(res.items);
    setTenant(res.tenant);
  }

  async function loadProductForEdit(shopSlug: string, productId: string) {
    const res = await api<{
      product: Product;
      images: { id: string; imageId: string | null; url: string | null; webUrl: string | null }[];
    }>(`/shop/${shopSlug}/products/${productId}`);

    const p = res.product;
    setPTitle(p.title);
    setPPrice(String(p.price ?? ""));
    setPCurrency(p.currency ?? "ETB");
    setPDesc(p.description ?? "");
    setPCategory(p.categoryId ?? null);
    setPStock(String(p.stock ?? "0"));

    const uiImgs: UiImage[] = (res.images || []).map((im) => ({
      kind: "existing",
      productImageId: im.id,
      imageId: im.imageId,
      url: im.webUrl || im.url,
    }));
    setEditImages(uiImgs);
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

    const priceNum = Number(pPrice);
    if (!pPrice.trim() || Number.isNaN(priceNum) || priceNum < 0) {
      setSaveErr("Valid price is required");
      return;
    }

    const stockNum = pStock === "" ? 0 : Number(pStock);
    if (Number.isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      setSaveErr("Stock must be a whole number");
      return;
    }

    setSaving(true);
    setSaveErr(null);

    try {
      const imageIds: string[] = [];
      const initData = getInitDataRaw();

      for (const img of createImages) {
        const fd = new FormData();
        fd.append("file", img.file);
        const uploadRes = await fetch("/api/uploads/image", {
          method: "POST",
          headers: initData ? { Authorization: `tma ${initData}` } : undefined,
          body: fd,
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const uploadJson = await uploadRes.json();
        imageIds.push(uploadJson.imageId);
      }

      await api(`/shop/${slug}/products`, {
        method: "POST",
        body: JSON.stringify({
          title: pTitle.trim(),
          price: priceNum,
          currency: pCurrency,
          description: pDesc.trim() ? pDesc.trim() : null,
          categoryId: pCategory,
          stock: stockNum,
          active: true,
          imageIds,
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

    const priceNum = Number(pPrice);
    if (!pPrice.trim() || Number.isNaN(priceNum) || priceNum < 0) {
      setSaveErr("Valid price is required");
      return;
    }

    const stockNum = pStock === "" ? 0 : Number(pStock);
    if (Number.isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      setSaveErr("Stock must be a whole number");
      return;
    }

    setSaving(true);
    setSaveErr(null);

    try {
      const initData = getInitDataRaw();

      // upload new images
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
          if (!uploadRes.ok) throw new Error("Image upload failed");
          const uploadJson = await uploadRes.json();
          uploadedNew.push({ tempId: img.tempId, imageId: uploadJson.imageId });
        }
      }

      // build order (existing + new)
      const imageIds: string[] = [];
      const imagesReplace: Array<
        | { type: "existing"; productImageId: string }
        | { type: "new"; imageId: string }
      > = [];

      for (const img of editImages) {
        if (img.kind === "existing") {
          imagesReplace.push({ type: "existing", productImageId: img.productImageId });
        } else {
          const up = uploadedNew.find((u) => u.tempId === img.tempId);
          if (up) {
            imagesReplace.push({ type: "new", imageId: up.imageId });
            imageIds.push(up.imageId);
          }
        }
      }

      await api(`/shop/${slug}/products/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: pTitle.trim(),
          price: priceNum,
          currency: pCurrency,
          description: pDesc.trim() ? pDesc.trim() : null,
          categoryId: pCategory,
          stock: stockNum,
          active: true,
          imageIds,
          imagesReplace,
        }),
      });

      await loadProducts(slug);

      // close edit
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

  // move image in edit
  function moveImage(list: UiImage[], index: number, dir: -1 | 1): UiImage[] {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= list.length) return list;
    const copy = [...list];
    const tmp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = tmp;
    return copy;
  }

  if (!slug) {
    return (
      <div style={{ padding: 16 }}>
        <p>No shop selected.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
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
          style={primaryBtn}
        >
          + Add product
        </button>
      </header>

      {/* create panel (top) */}
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
              type="number"
              min={0}
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

          {/* stock */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
              Stock (available units)
            </label>
            <input
              value={pStock}
              onChange={(e) => setPStock(e.target.value)}
              type="number"
              min={0}
              step={1}
              placeholder="0"
              style={input}
            />
          </div>

          {/* images create */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Images</label>

            {/* hidden real input */}
            <input
              ref={createFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (!files.length) return;
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
              style={{ display: "none" }} // 👈 hide browser "No file chosen"
            />

            {/* visible button */}
            <button
              type="button"
              onClick={() => createFileInputRef.current?.click()}
              style={{ ...input, background: "#fafafa", textAlign: "center", cursor: "pointer" }}
            >
              Choose images
            </button>

            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
              {createImages.length === 0
                ? "No images selected"
                : createImages.length === 1
                ? "1 image selected"
                : `${createImages.length} images selected`}
            </div>

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
                      onClick={() => setCreateImages((prev) => prev.filter((x) => x.tempId !== img.tempId))}
                      style={thumbDeleteBtn}
                    >
                      ×
                    </button>
                    {index === 0 ? <div style={thumbCoverTag}>Cover</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button onClick={handleCreateProduct} disabled={saving} style={primaryBtn}>
            {saving ? "Creating…" : "Create product"}
          </button>
          <button
            onClick={() => {
              setShowCreate(false);
              setSaveErr(null);
            }}
            style={secondaryBtn}
          >
            Cancel
          </button>
        </div>
      )}

      {/* products list */}
      {products.length === 0 ? (
        <div
          style={{
            padding: 20,
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
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,.04)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    background: p.photoUrl ? undefined : "#eee",
                    backgroundImage: p.photoUrl ? `url(${p.photoUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {p.price} {p.currency}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>Stock: {p.stock ?? 0}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreate(false);
                    setShowEdit(true);
                    setEditingId(p.id);
                    setSaveErr(null);
                    loadProductForEdit(slug!, p.id);
                  }}
                  style={smallBtn}
                >
                  Edit
                </button>
              </div>

              {/* edit panel under product */}
              {showEdit && editingId === p.id ? (
                <div style={{ ...panel, marginTop: 6 }}>
                  <strong style={{ fontSize: 14 }}>Edit product</strong>
                  {saveErr ? <div style={{ color: "crimson", fontSize: 13 }}>{saveErr}</div> : null}

                  <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Product title" style={input} />

                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      placeholder="Price"
                      style={{ ...input, flex: 1 }}
                      type="number"
                      min={0}
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

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                      Stock (available units)
                    </label>
                    <input
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      style={input}
                    />
                  </div>

                  {/* edit images */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                      Images (existing + new)
                    </label>
                    {/* hidden real input */}
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (!files.length) return;
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
                      style={{ display: "none" }} // 👈 hide browser text
                    />

                    {/* visible button */}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      style={{ ...input, background: "#fafafa", textAlign: "center", cursor: "pointer" }}
                    >
                      Choose images
                    </button>

                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                      {editImages.length === 0
                        ? "No images selected"
                        : editImages.length === 1
                        ? "1 image selected"
                        : `${editImages.length} images selected`}
                    </div>

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
                              <button
                                onClick={() => {
                                  setEditImages((prev) =>
                                    prev.filter((x) =>
                                      x.kind === "existing"
                                        ? x.productImageId !== (img as UiImageExisting).productImageId
                                        : x.tempId !== (img as UiImageNew).tempId
                                    )
                                  );
                                }}
                                style={thumbDeleteBtn}
                              >
                                ×
                              </button>
                              {!isCover ? (
                                <button
                                  onClick={() => {
                                    setEditImages((prev) => {
                                      const copy = [...prev];
                                      const i = copy.findIndex((x) =>
                                        x.kind === "existing"
                                          ? x.productImageId === (img as UiImageExisting).productImageId
                                          : x.tempId === (img as UiImageNew).tempId
                                      );
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
                                <button onClick={() => setEditImages((prev) => moveImage(prev, index, -1))} style={thumbMoveBtn}>
                                  ↑
                                </button>
                                <button onClick={() => setEditImages((prev) => moveImage(prev, index, +1))} style={thumbMoveBtn}>
                                  ↓
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <button onClick={handleUpdateProduct} disabled={saving} style={primaryBtn}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => {
                      setShowEdit(false);
                      setEditingId(null);
                      setSaveErr(null);
                    }}
                    style={secondaryBtn}
                  >
                    Cancel
                  </button>
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
  borderRadius: 999,
  padding: "4px 10px",
  background: "white",
  fontSize: 13,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  border: "1px solid #000",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "#000",
  border: "1px solid rgba(0,0,0,.05)",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};

const panel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,.04)",
  borderRadius: 14,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 14,
  outline: "none",
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
  background: "rgba(0,0,0,.6)",
  color: "#fff",
  fontSize: 11,
  cursor: "pointer",
};

const thumbCoverTag: React.CSSProperties = {
  position: "absolute",
  top: -6,
  left: -6,
  borderRadius: 999,
  background: "rgba(0,0,0,.6)",
  color: "#fff",
  fontSize: 10,
  padding: "2px 10px",
};

const thumbMoveRow: React.CSSProperties = {
  position: "absolute",
  bottom: 3,
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
