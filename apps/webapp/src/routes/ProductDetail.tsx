import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";
import CategoryCascader from "../components/CategoryCascader";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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

  // category
  const [category, setCategory] = useState<string | null>(null);

  const [editImgs, setEditImgs] = useState<
    (
      | { kind: "existing"; imageId: string; url: string | null }
      | { kind: "new"; tempId: string; file: File; previewUrl: string }
    )[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);
  function markDirty() { setDirty(true); }
  function guardLeave(next: () => void) {
    if (!dirty) { next(); return; }
    const ok = window.confirm(t("confirm_discard_changes"));
    if (ok) { setDirty(false); next(); }
  }

  // load product
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

        // prep edit
        setTitle(r.product.title || "");
        setPrice(String(r.product.price ?? ""));
        setCurrency(r.product.currency || "ETB");
        setDesc(r.product.description || "");
        setStock(String(r.product.stock && r.product.stock > 0 ? r.product.stock : 1));
        setCategory(r.product.categoryId || null);

        setEditImgs(
          (r.images || []).map((im) => ({
            kind: "existing" as const,
            imageId: im.imageId || "",
            url: im.webUrl ?? im.url ?? null,
          }))
        );

        setDirty(false);
      } catch (e: any) {
        setErr(e?.message || t("err_load_product_failed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, id, t]);

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

    if (!title.trim()) {
      setSaveErr(t("err_title_required"));
      setSaving(false);
      return;
    }

    const priceNum = Number(price);
    if (!price.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      setSaveErr(t("err_price_gt_zero"));
      setSaving(false);
      return;
    }

    const stockNum = Number(stock);
    if (!stock.trim() || Number.isNaN(stockNum) || stockNum <= 0 || !Number.isInteger(stockNum)) {
      setSaveErr(t("err_stock_integer_gt_zero"));
      setSaving(false);
      return;
    }

    try {
      const initData = getInitDataRaw();

      // upload new
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
          price: priceNum,
          currency,
          description: desc.trim() ? desc.trim() : null,
          stock: stockNum,
          categoryId: category,
          imageIds,
        }),
      });

      // refresh view
      const r = await api<{ product: Product; images: ProductImage[] }>(`/shop/${slug}/products/${id}`);
      setProduct(r.product);
      setImages(r.images || []);
      setIdx(0);
      setEditImgs(
        (r.images || []).map((im) => ({
          kind: "existing" as const,
          imageId: im.imageId || "",
          url: im.webUrl ?? im.url ?? null,
        }))
      );

      setDirty(false);
      setEditMode(false);
    } catch (e: any) {
      setSaveErr(e?.message || t("err_save_failed"));
    } finally {
      setSaving(false);
    }
  }

  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? images[idx] : null;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* local sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingBottom: 6,
        }}
      >
        <button
          onClick={() =>
            guardLeave(() => {
              const fallback = slug ? `/shop/${slug}` : "/";
              nav(fallback, { replace: true });
            })
          }

          style={{ border: "1px solid #ddd", borderRadius: 999, width: 28, height: 28, background: "#fff" }}
          aria-label={t("aria_back")}
        >
          ←
        </button>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            textAlign: "center",
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {product ? product.title : t("title_product")}
        </h2>
        <button onClick={() => guardLeave(() => setEditMode((v) => !v))} style={smallBtn}>
          {editMode ? t("btn_close") : t("btn_edit")}
        </button>
      </div>

      {loading ? (
        <div>{t("msg_loading")}</div>
      ) : err ? (
        <div style={{ color: "crimson" }}>{err}</div>
      ) : !product ? (
        <div>{t("msg_not_found")}</div>
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
                  aria-label={t("aria_prev_image")}
                >
                  ‹
                </button>
                <button
                  style={galleryBtnRight}
                  onClick={() => setIdx((old) => (old + 1) % images.length)}
                  aria-label={t("aria_next_image")}
                >
                  ›
                </button>
              </>
            ) : null}

            {/* centered thumbs */}
            {hasImages ? (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
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
                    aria-label={t("aria_thumb_image", { index: i + 1 })}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* view / edit block */}
          {!editMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {product.price} {product.currency}
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                {t("label_stock_short")}: {product.stock ?? 0}
              </div>
              {product.description ? (
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{product.description}</div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.5 }}>{t("msg_no_description")}</div>
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

              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                style={input}
                placeholder={t("ph_title")}
                required
              />

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    markDirty();
                  }}
                  style={{ ...input, flex: 1 }}
                  placeholder={t("ph_price")}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    markDirty();
                  }}
                  style={{ ...input, flexBasis: 110 }}
                >
                  <option value="ETB">ETB</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {/* Category (icons hidden in this context) */}
              <CategoryCascader value={category} onChange={(id) => { setCategory(id); markDirty(); }} />

              <textarea
                value={desc}
                onChange={(e) => {
                  setDesc(e.target.value);
                  markDirty();
                }}
                style={{ ...input, minHeight: 60 }}
                placeholder={t("ph_description")}
              />

              <input
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value);
                  markDirty();
                }}
                style={input}
                placeholder={t("ph_stock_units")}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
              />

              {/* images edit */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                  {t("label_images_existing_new")}
                </label>

                <input
                  id="product-detail-images-input"
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
                    markDirty();
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  onClick={() => document.getElementById("product-detail-images-input")?.click()}
                  style={{ ...input, background: "#fafafa", textAlign: "center", cursor: "pointer" }}
                >
                  {t("btn_choose_images")}
                </button>

                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                  {editImgs.length === 0
                    ? t("msg_no_images_selected")
                    : editImgs.length === 1
                    ? t("msg_one_image_selected")
                    : t("msg_many_images_selected", { count: editImgs.length })}
                </div>

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
                          <button
                            onClick={() => {
                              setEditImgs((prev) => prev.filter((_, i) => i !== index));
                              markDirty();
                            }}
                            style={thumbDeleteBtn}
                            aria-label={t("aria_remove_image")}
                          >
                            ×
                          </button>
                          {!isCover ? (
                            <button
                              onClick={() => {
                                setEditImgs((prev) => {
                                  const copy = [...prev];
                                  const [item] = copy.splice(index, 1);
                                  copy.unshift(item);
                                  return copy;
                                });
                                markDirty();
                              }}
                              style={thumbCoverBtn}
                            >
                              ★
                            </button>
                          ) : (
                            <div style={thumbCoverTag}>{t("tag_cover")}</div>
                          )}
                          <div style={thumbMoveRow}>
                            <button
                              onClick={() => {
                                setEditImgs((prev) => moveImage(prev, index, -1));
                                markDirty();
                              }}
                              style={thumbMoveBtn}
                              aria-label={t("aria_move_image_up")}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => {
                                setEditImgs((prev) => moveImage(prev, index, +1));
                                markDirty();
                              }}
                              style={thumbMoveBtn}
                              aria-label={t("aria_move_image_down")}
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
                  {saving ? t("btn_saving") : t("btn_save_changes")}
                </button>
                <button onClick={() => guardLeave(() => setEditMode(false))} style={smallBtn}>
                  {t("btn_cancel")}
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
