// apps/webapp/src/routes/ProductDetail.tsx
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
  stock?: number | null;
  categoryId?: string | null;
};

type ProductImage = {
  id?: string;
  imageId?: string | null;
  webUrl?: string | null;
  url?: string | null;
  position?: number;
};

export default function ProductDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  // edit UI
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("ETB");
  const [desc, setDesc] = useState("");
  const [stock, setStock] = useState("1");
  const [editImgs, setEditImgs] = useState<
    (
      | { kind: "existing"; imageId: string; url: string | null }
      | { kind: "new"; tempId: string; file: File; previewUrl: string }
    )[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !id) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await api<{ product: Product; images: ProductImage[] }>(`/shop/${slug}/products/${id}`);
        setProduct(r.product);
        setImages(r.images || []);
        setIdx(0);

        // prepare edit data
        setTitle(r.product.title || "");
        setPrice(String(r.product.price ?? ""));
        setCurrency(r.product.currency || "ETB");
        setDesc(r.product.description || "");
        setStock(String(r.product.stock ?? 0));
        setEditImgs(
          (r.images || []).map((im) => ({
            kind: "existing" as const,
            imageId: im.imageId || "",
            url: im.webUrl ?? im.url ?? null,
          }))
        );
      } catch (e: any) {
        setErr(e?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, id]);

  function moveImage<T>(list: T[], index: number, dir: -1 | 1): T[] {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= list.length) return list;
    const copy = [...list];
    const tmp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = tmp;
    return copy;
  }

  async function handleSaveEdit() {
    if (!slug || !id) return;
    setSaving(true);
    setSaveErr(null);

    try {
      const initData = getInitDataRaw();

      // upload new ones
      const uploaded: Record<string, string> = {};
      for (const im of editImgs) {
        if (im.kind === "new") {
          const fd = new FormData();
          fd.append("file", im.file);
          const up = await fetch("/api/uploads/image", {
            method: "POST",
            headers: initData ? { Authorization: `tma ${initData}` } : undefined,
            body: fd,
          });
          if (!up.ok) throw new Error("image_upload_failed");
          const json = await up.json();
          uploaded[im.tempId] = json.imageId;
        }
      }

      // final order
      const imageIds: string[] = [];
      for (const im of editImgs) {
        if (im.kind === "existing") {
          if (im.imageId) imageIds.push(im.imageId);
        } else {
          const newId = uploaded[im.tempId];
          if (newId) imageIds.push(newId);
        }
      }

      await api(`/shop/${slug}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          price: Number(price),
          currency,
          description: desc.trim() ? desc.trim() : null,
          stock: Number(stock) || 0,
          imageIds,
        }),
      });

      // reload view
      const r = await api<{ product: Product; images: ProductImage[] }>(`/shop/${slug}/products/${id}`);
      setProduct(r.product);
      setImages(r.images || []);
      setEditMode(false);
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? images[idx] : null;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => nav(-1)} style={{ border: "1px solid #ddd", borderRadius: 999, width: 28, height: 28 }}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 16 }}>{product ? product.title : "Product"}</h2>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditMode((v) => !v)} style={smallBtn}>
          {editMode ? "Close edit" : "Edit"}
        </button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : err ? (
        <div style={{ color: "crimson" }}>{err}</div>
      ) : !product ? (
        <div>Not found</div>
      ) : (
        <>
          {/* gallery */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "100%",
                height: 210,
                borderRadius: 12,
                background: "#eee",
                backgroundImage: currentImg?.webUrl ? `url(${currentImg.webUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            {hasImages && images.length > 1 ? (
              <>
                <button
                  style={galleryBtnLeft}
                  onClick={() => setIdx((old) => (old - 1 + images.length) % images.length)}
                >
                  ‹
                </button>
                <button style={galleryBtnRight} onClick={() => setIdx((old) => (old + 1) % images.length)}>
                  ›
                </button>
              </>
            ) : null}
            {hasImages ? (
              <div style={thumbRow}>
                {images.map((im, i) => (
                  <div
                    key={i}
                    onClick={() => setIdx(i)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "#ddd",
                      backgroundImage: im.webUrl ? `url(${im.webUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: i === idx ? "2px solid #000" : "1px solid rgba(0,0,0,.1)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* info */}
          {!editMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {product.price} {product.currency}
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>Stock: {product.stock ?? 0}</div>
              {product.description ? (
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{product.description}</div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.5 }}>No description</div>
              )}
            </div>
          ) : (
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
              {saveErr ? <div style={{ color: "crimson" }}>{saveErr}</div> : null}

              <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} placeholder="Title" />

              <div style={{ display: "flex", gap: 8 }}>
                <input value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...input, flex: 1 }} />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...input, flexBasis: 110 }}>
                  <option value="ETB">ETB</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={{ ...input, minHeight: 60 }}
                placeholder="Description"
              />

              <input value={stock} onChange={(e) => setStock(e.target.value)} style={input} placeholder="Stock" />

              {/* image widget */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                  Images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (!files.length) return;
                    setEditImgs((prev) => [
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
                {editImgs.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {editImgs.map((im, index) => {
                      const isCover = index === 0;
                      const url = im.kind === "existing" ? im.url : im.previewUrl;
                      return (
                        <div
                          key={im.kind === "existing" ? im.imageId : im.tempId}
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
                              setEditImgs((prev) => prev.filter((_, i) => i !== index));
                            }}
                            style={thumbDeleteBtn}
                          >
                            ×
                          </button>
                          {/* make cover */}
                          {!isCover ? (
                            <button
                              onClick={() => {
                                setEditImgs((prev) => {
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
                                setEditImgs((prev) => moveImage(prev, index, -1));
                              }}
                              style={thumbMoveBtn}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => {
                                setEditImgs((prev) => moveImage(prev, index, +1));
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
                <button onClick={handleSaveEdit} disabled={saving} style={btn}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button onClick={() => setEditMode(false)} style={smallBtn}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.1)",
  background: "#fff",
  borderRadius: 10,
  padding: "5px 10px",
  fontSize: 12,
  cursor: "pointer",
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

const galleryBtnLeft: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 6,
  transform: "translateY(-50%)",
  border: "none",
  background: "rgba(0,0,0,.5)",
  color: "#fff",
  width: 28,
  height: 28,
  borderRadius: 999,
  cursor: "pointer",
};

const galleryBtnRight: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  right: 6,
  transform: "translateY(-50%)",
  border: "none",
  background: "rgba(0,0,0,.5)",
  color: "#fff",
  width: 28,
  height: 28,
  borderRadius: 999,
  cursor: "pointer",
};

const thumbRow: React.CSSProperties = {
  display: "flex",
  gap: 6,
  marginTop: 8,
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
