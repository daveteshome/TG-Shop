// apps/webapp/src/routes/OwnerProductDetail.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import CategoryCascader from "../components/CategoryCascader";
import { useTranslation } from "react-i18next";
import { getInitDataRaw } from "../lib/telegram";
import RecordSaleModal from "../components/inventory/RecordSaleModal";
import AddStockModal from "../components/inventory/AddStockModal";
import AdjustStockModal from "../components/inventory/AdjustStockModal";
import { getUserRole } from "../lib/api/index";
import { canAddStock, canRecordSale, canAdjustStock, canDeleteProducts, canEditProducts, type ShopRole } from "../lib/permissions";
/* ---------- Types ---------- */
type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  stock?: number | null;
  categoryId?: string | null;
  photoUrl?: string | null;

  brand?: string | null;
  condition?: "new" | "used" | "refurbished" | null;
  sku?: string | null;
  barcode?: string | null;
  compareAtPrice?: number | null;

  active?: boolean;
  isPublished?: boolean;
};

type ProductImage = {
  id?: string;
  imageId?: string | null;
  webUrl?: string | null;
  url?: string | null;
  position?: number;
};

type UiImageExisting = {
  kind: "existing";
  imageId: string;
  url: string | null;
};
type UiImageNew = {
  kind: "new";
  tempId: string;
  file: File;
  previewUrl: string;
};
type UiImage = UiImageExisting | UiImageNew;

type ProductPerformance = {
  soldUnits: number;
  revenue: number;
};

export default function OwnerProductDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const nav = useNavigate();
  const { t } = useTranslation();

  /* ---------- State ---------- */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [idx, setIdx] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("ETB");
  const [desc, setDesc] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState<"" | "new" | "used" | "refurbished">("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");

  const [active, setActive] = useState<boolean>(true);
  const [isPublished, setIsPublished] = useState<boolean>(true);

  const [editImgs, setEditImgs] = useState<UiImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);
  const editRef = useRef<HTMLDivElement | null>(null);

  // performance
  const [perf, setPerf] = useState<ProductPerformance | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfErr, setPerfErr] = useState<string | null>(null);

  // field-level errors + refs for scroll
  const [titleErr, setTitleErr] = useState<string | null>(null);
  const [brandErr, setBrandErr] = useState<string | null>(null);
  const [conditionErr, setConditionErr] = useState<string | null>(null);

  // Inventory modals
  const [showRecordSale, setShowRecordSale] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [userRole, setUserRole] = useState<ShopRole | null>(null);
  const [priceErr, setPriceErr] = useState<string | null>(null);
  const [stockErr, setStockErr] = useState<string | null>(null);
  const [imagesErr, setImagesErr] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const brandRef = useRef<HTMLInputElement | null>(null);
  const conditionRef = useRef<HTMLSelectElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const stockRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<HTMLDivElement | null>(null);

  // quick stock card
  const [quickStock, setQuickStock] = useState("");
  const [quickStockErr, setQuickStockErr] = useState<string | null>(null);
  const quickStockInputRef = useRef<HTMLInputElement | null>(null);

  function guardLeave(next: () => void) {
    if (!dirty) return next();
    const ok = window.confirm(t("confirm_discard_changes"));
    if (ok) {
      setDirty(false);
      next();
    }
  }

  /* ---------- Load product ---------- */
  const loadProductData = async () => {
    if (!id || !slug) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ product: Product; images: ProductImage[] }>(
        `/shop/${slug}/products/${id}`
      );
      setProduct(r.product);
      setImages(r.images || []);
      setIdx(0);

        // seed edit fields
        setTitle(r.product.title || "");
        setPrice(String(r.product.price ?? ""));
        setCurrency(r.product.currency || "ETB");
        setDesc(r.product.description || "");
        setStock(String(r.product.stock && r.product.stock > 0 ? r.product.stock : 1));
        setCategory(r.product.categoryId || null);
        setBrand(r.product.brand || "");
        setCondition((r.product.condition as any) || "");
        setSku(r.product.sku || "");
        setBarcode(r.product.barcode || "");
        setCompareAtPrice(
          r.product.compareAtPrice !== null && r.product.compareAtPrice !== undefined
            ? String(r.product.compareAtPrice)
            : ""
        );

        setActive(typeof r.product.active === "boolean" ? r.product.active : true);
        setIsPublished(
          typeof (r.product as any).isPublished === "boolean"
            ? (r.product as any).isPublished
            : true
        );

        setEditImgs(
          (r.images || []).map<UiImage>((im) => ({
            kind: "existing",
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
  };

  useEffect(() => {
    loadProductData();
  }, [slug, id, t]);

  useEffect(() => {
    if (slug) {
      getUserRole(slug).then((role) => setUserRole(role as ShopRole | null));
    }
  }, [slug]);

  /* ---------- Load performance ---------- */
  useEffect(() => {
    if (!slug || !id) return;
    (async () => {
      setPerfLoading(true);
      setPerfErr(null);
      try {
        const r = await api<ProductPerformance>(`/shop/${slug}/products/${id}/performance`);
        setPerf(r);
      } catch (e: any) {
        setPerfErr(e?.message || t("err_load_performance"));
      } finally {
        setPerfLoading(false);
      }
    })();
  }, [slug, id, t]);

  /* ---------- Scroll into view when edit panel opens ---------- */
  useEffect(() => {
    if (editMode && editRef.current) {
      const el = editRef.current;
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [editMode]);

  /* ---------- Helpers ---------- */
  function moveImage<T>(arr: T[], index: number, delta: number): T[] {
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= arr.length) return arr;
    const copy = [...arr];
    const tmp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = tmp;
    return copy;
  }

  /* ---------- Save (PATCH) with field-level errors ---------- */
  // NOTE: add optional override param
// Core save logic used by both full edit save and quick stock update
async function saveProduct(overrideStock?: string) {
  if (!slug || !id) return;
  setSaving(true);
  setSaveErr(null);

  // reset field errors
  setTitleErr(null);
  setBrandErr(null);
  setConditionErr(null);
  setPriceErr(null);
  setStockErr(null);
  setImagesErr(null);

  let firstErrorEl: HTMLElement | null = null;

  // ----- VALIDATION -----

  // title
  if (!title.trim()) {
    const msg = t("err_title_required") || "Title is required";
    setTitleErr(msg);
    if (!firstErrorEl && titleRef.current) firstErrorEl = titleRef.current;
  }

  // brand
  if (!brand.trim()) {
    const msg = t("err_brand_required") || "Brand is required";
    setBrandErr(msg);
    if (!firstErrorEl && brandRef.current) firstErrorEl = brandRef.current;
  }

  // condition
  if (!condition) {
    const msg = t("err_condition_required") || "Condition is required";
    setConditionErr(msg);
    if (!firstErrorEl && conditionRef.current) firstErrorEl = conditionRef.current;
  }

  // price
  const priceNum = Number(price);
  if (!price.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
    const msg = t("err_price_gt_zero") || "Price must be greater than zero";
    setPriceErr(msg);
    if (!firstErrorEl && priceRef.current) firstErrorEl = priceRef.current;
  }

  // ✅ decide which stock string to validate/use
  const stockStr = overrideStock ?? stock;
  const stockNum = Number(stockStr);
  if (
    !stockStr.trim() ||
    Number.isNaN(stockNum) ||
    stockNum <= 0 ||
    !Number.isInteger(stockNum)
  ) {
    const msg = t("err_stock_integer_gt_zero") || "Stock must be a positive integer";
    setStockErr(msg);
    if (!firstErrorEl && stockRef.current) firstErrorEl = stockRef.current;
  }

  // images
  if (editImgs.length === 0) {
    const msg = t("err_image_required") || "At least one image is required";
    setImagesErr(msg);
    if (!firstErrorEl && imagesRef.current) firstErrorEl = imagesRef.current;
  }

  if (firstErrorEl) {
    firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    if ("focus" in firstErrorEl) {
      (firstErrorEl as any).focus?.();
    }
    setSaveErr(t("err_fix_highlighted_fields") || "Please fix the highlighted fields.");
    setSaving(false);
    return;
  }

  try {
    const initData = getInitDataRaw();

    // upload new images
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

    // use final values
    const priceNumFinal = Number(price);
    const stockNumFinal = Number(stockStr);

    await api(`/shop/${slug}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        price: priceNumFinal,
        currency,
        description: desc.trim() ? desc.trim() : null,
        stock: stockNumFinal,
        categoryId: category,
        imageIds,
        brand: brand.trim() ? brand.trim() : null,
        condition: condition || null,
        sku: sku.trim() ? sku.trim() : null,
        barcode: barcode.trim() ? barcode.trim() : null,
        compareAtPrice: compareAtPrice.trim() ? Number(compareAtPrice) : null,
        active,
        isPublished,
      }),
    });

    // reload view (fresh data)
    const r = await api<{ product: Product; images: ProductImage[] }>(
      `/shop/${slug}/products/${id}`
    );
    setProduct(r.product);
    setImages(r.images || []);
    setIdx(0);
    setEditImgs(
      (r.images || []).map<UiImage>((im) => ({
        kind: "existing",
        imageId: im.imageId || "",
        url: im.webUrl ?? im.url ?? null,
      }))
    );

    setActive(typeof r.product.active === "boolean" ? r.product.active : true);
    setIsPublished(
      typeof (r.product as any).isPublished === "boolean"
        ? (r.product as any).isPublished
        : true
    );

    // sync stock + quick stock field
    const newStockValue =
      typeof r.product.stock === "number" && r.product.stock > 0
        ? String(r.product.stock)
        : "1";
    setStock(newStockValue);
    setQuickStock("");
    setQuickStockErr(null);

    setDirty(false);
    setEditMode(false); // still close edit after full save
  } catch (e: any) {
    setSaveErr(e?.message || t("err_save_failed"));
  } finally {
    setSaving(false);
  }
}

// wrapper used by the main "Save changes" button
async function handleSaveEdit() {
  await saveProduct();
}


  /* ---------- Quick stock update (Stock card) ---------- */
 async function handleQuickStockUpdate() {
  if (!product) return;
  setQuickStockErr(null);

  const raw = quickStock.trim();
  const num = Number(raw);
  if (!raw || Number.isNaN(num) || num <= 0 || !Number.isInteger(num)) {
    setQuickStockErr(
      t("err_stock_integer_gt_zero") || "Stock must be a positive integer"
    );
    if (quickStockInputRef.current) {
      quickStockInputRef.current.focus();
    }
    return;
  }

  // ✅ directly tell saveProduct which stock to use
  await saveProduct(raw);
}



  /* ---------- Delete (soft delete) ---------- */
  async function handleDelete() {
    if (!slug || !id) return;
    const ok = window.confirm(
      t("confirm_delete_product") || "Are you sure you want to delete this product?"
    );
    if (!ok) return;

    try {
      await api(`/shop/${slug}/products/${id}`, {
        method: "DELETE",
      });

      // After delete → go back to shop products
      const fallback = slug ? `/shop/${slug}` : "/";
      nav(fallback, { replace: true });
    } catch (e: any) {
      console.error("Failed to delete product", e);
      alert(t("error_delete_product") || "Failed to delete product");
    }
  }

  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? images[idx] : null;

  const showMain = !loading && !err && product;
  const isActiveView = product?.active ?? true;
  const isPublishedView = (product as any)?.isPublished ?? true;
  const currentStock = product?.stock ?? 0;

  return (
    <div
      style={{
        padding: 16,
        paddingBottom: 32,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "#f5f5f7",
        minHeight: "100vh",
      }}
    >
      {/* Sticky header: back + title + edit toggle */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "linear-gradient(to bottom, #f5f5f7 70%, rgba(245,245,247,0))",
          paddingBottom: 6,
          marginBottom: -6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            onClick={() =>
              guardLeave(() => {
                const fallback = slug ? `/shop/${slug}` : "/";
                nav(fallback, { replace: true });
              })
            }
            style={backBtn}
            aria-label={t("aria_back")}
          >
            ←
          </button>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {product ? product.title : t("title_product")}
            </div>
            {product && (
              <div style={{ fontSize: 11, opacity: 0.55 }}>
                {t("label_product_id", { id: product.id.slice(0, 8) })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canEditProducts(userRole) && (
              <button
                onClick={() => {
                  if (!editMode) {
                    setEditMode(true);
                    setDirty(false);
                  } else {
                    guardLeave(() => setEditMode(false));
                  }
                }}
                style={smallBtn}
              >
                {editMode ? t("btn_close") : t("btn_edit")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============== Main content ============== */}
      {loading ? (
        <div style={card}>
          <div>{t("msg_loading")}</div>
        </div>
      ) : err ? (
        <div style={{ ...card, color: "crimson" }}>{err}</div>
      ) : !product ? (
        <div style={card}>{t("msg_not_found")}</div>
      ) : (
        <>
          {/* Media + summary card */}
          <div style={card}>
            {/* Gallery */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <div
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 14,
                  background: "#e2e2e7",
                  backgroundImage: currentImg?.webUrl
                    ? `url(${currentImg.webUrl})`
                    : product?.photoUrl
                    ? `url(${product.photoUrl})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              {hasImages && images.length > 1 ? (
                <>
                  <button
                    style={galleryBtnLeft}
                    onClick={() =>
                      setIdx((old) => (old - 1 + images.length) % images.length)
                    }
                    aria-label={t("aria_prev_image")}
                  >
                    ‹
                  </button>
                  <button
                    style={galleryBtnRight}
                    onClick={() =>
                      setIdx((old) => (old + 1) % images.length)
                    }
                    aria-label={t("aria_next_image")}
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>

            {/* Thumbs */}
            {hasImages ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {images.map((im, i) => (
                  <div
                    key={i}
                    onClick={() => setIdx(i)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "#ddd",
                      backgroundImage: im.webUrl ? `url(${im.webUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border:
                        i === idx ? "2px solid #000" : "1px solid rgba(0,0,0,.12)",
                      cursor: "pointer",
                    }}
                    aria-label={t("aria_thumb_image", { index: i + 1 })}
                  />
                ))}
              </div>
            ) : null}

            {/* Summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                {product.price} {product.currency}
                {product.compareAtPrice &&
                  product.compareAtPrice > product.price && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 13,
                        textDecoration: "line-through",
                        color: "crimson",
                        opacity: 0.6,
                      }}
                    >
                      {product.compareAtPrice} {product.currency}
                    </span>
                  )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ opacity: 0.7 }}>
                  {t("label_stock_short")}: {product.stock ?? 0}
                </span>
                {(product.stock ?? 0) === 0 && (
                  <span style={pillDanger}>
                    {t("tag_out_of_stock") || "Out of stock"}
                  </span>
                )}
                {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 3 && (
                  <span style={pillWarn}>
                    {t("tag_low_stock") || "Low stock"}
                  </span>
                )}
              </div>

              {/* Status & visibility chips (view) */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                <span style={isActiveView ? pillGreen : pillRed}>
                  {isActiveView
                    ? t("status_active") || "Active"
                    : t("status_inactive") || "Inactive"}
                </span>
                <span style={isPublishedView ? pillGreen : pillRed}>
                  {isPublishedView
                    ? t("visibility_published") || "Published"
                    : t("visibility_draft") || "Draft"}
                </span>
              </div>

              {(product.brand || product.condition || product.sku) && (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  {product.brand && <span>{product.brand}</span>}
                  {product.condition && (
                    <span>
                      {" "}
                      •{" "}
                      {product.condition === "new"
                        ? t("condition_new") || "New"
                        : product.condition === "used"
                        ? t("condition_used") || "Used"
                        : t("condition_refurbished") || "Refurbished"}
                    </span>
                  )}
                  {product.sku && <span> • SKU: {product.sku}</span>}
                </div>
              )}

              {product.description ? (
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    marginTop: 6,
                  }}
                >
                  {product.description}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.6,
                    marginTop: 6,
                  }}
                >
                  {t("msg_no_description")}
                </div>
              )}
            </div>
          </div>

          {/* ============== Inventory Actions ============== */}
          {!editMode && (canAddStock(userRole) || canRecordSale(userRole) || canAdjustStock(userRole)) && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
              {canAddStock(userRole) && (
                <button
                  onClick={() => setShowAddStock(true)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  📦 Add
                </button>
              )}
              {canRecordSale(userRole) && (
                <button
                  onClick={() => setShowRecordSale(true)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  💰 Sale
                </button>
              )}
              {canAdjustStock(userRole) && (
                <button
                  onClick={() => setShowAdjustStock(true)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#f59e0b",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ⚙️ Adjust
                </button>
              )}
            </div>
          )}

          {/* ============== Performance card ============== */}
          <div style={card}>
            <div style={sectionHeaderRow}>
              <div style={sectionTitle}>
                {t("section_performance") || "Performance"}
              </div>
            </div>

            {perfLoading && (
              <div style={{ fontSize: 13 }}>{t("msg_loading")}</div>
            )}
            {perfErr && !perfLoading && (
              <div style={{ fontSize: 12, color: "crimson" }}>{perfErr}</div>
            )}

            {perf && !perfLoading && !perfErr && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 13,
                }}
              >
                <div style={perfRow}>
                  <span style={perfLabel}>
                    {t("label_sold_units") || "Sold"}
                  </span>
                  <span style={perfValue}>{perf.soldUnits}</span>
                </div>
                <div style={perfRow}>
                  <span style={perfLabel}>
                    {t("label_revenue") || "Revenue"}
                  </span>
                  <span style={perfValue}>
                    {perf.revenue} {product.currency}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ============== Edit Product card ============== */}
          {editMode && (
            <div ref={editRef} style={card}>
              <div style={sectionHeaderRow}>
                <div style={sectionTitle}>
                  {t("title_edit_product_details")}
                </div>
                {saveErr ? (
                  <div style={{ color: "crimson", fontSize: 12 }}>{saveErr}</div>
                ) : null}
              </div>

              {/* Basics */}
              <div style={sectionBlock}>
                <div style={sectionLabel}>
                  {t("section_basic_info") || "Basic info"}
                </div>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                    if (titleErr) setTitleErr(null);
                  }}
                  style={input}
                  placeholder={t("ph_title")}
                  required
                />
                {titleErr && <div style={errorText}>{titleErr}</div>}

                <textarea
                  value={desc}
                  onChange={(e) => {
                    setDesc(e.target.value);
                    markDirty();
                  }}
                  style={{ ...input, minHeight: 70 }}
                  placeholder={t("ph_description")}
                />

                <CategoryCascader
                  value={category}
                  onChange={(id) => {
                    setCategory(id);
                    markDirty();
                  }}
                />
              </div>

              {/* Metadata */}
              <div style={sectionBlock}>
                <div style={sectionLabel}>
                  {t("section_metadata") || "Product metadata"}
                </div>
                <input
                  ref={brandRef}
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    markDirty();
                    if (brandErr) setBrandErr(null);
                  }}
                  style={input}
                  placeholder={t("ph_brand") || "Brand (required)"}
                />
                {brandErr && <div style={errorText}>{brandErr}</div>}

                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    ref={conditionRef}
                    value={condition}
                    onChange={(e) => {
                      setCondition(e.target.value as any);
                      markDirty();
                      if (conditionErr) setConditionErr(null);
                    }}
                    style={{ ...input, flex: 1 }}
                  >
                    <option value="">
                      {t("ph_condition_none") || "Condition (required)"}
                    </option>
                    <option value="new">{t("condition_new") || "New"}</option>
                    <option value="used">{t("condition_used") || "Used"}</option>
                    <option value="refurbished">
                      {t("condition_refurbished") || "Refurbished"}
                    </option>
                  </select>

                  <input
                    value={sku}
                    onChange={(e) => {
                      setSku(e.target.value);
                      markDirty();
                    }}
                    style={{ ...input, flex: 1 }}
                    placeholder={t("ph_sku") || "SKU (optional)"}
                  />
                </div>
                {conditionErr && <div style={errorText}>{conditionErr}</div>}

                <input
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    markDirty();
                  }}
                  style={input}
                  placeholder={t("ph_barcode") || "Barcode (optional)"}
                />
              </div>

              {/* Status & visibility (EDIT) */}
              <div style={sectionBlock}>
                <div style={sectionLabel}>
                  {t("section_status") || "Status & visibility"}
                </div>
                <label
                  style={{
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => {
                      setActive(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span>
                    {t("status_active_label") ||
                      "Product is active (can be used in shop)"}
                  </span>
                </label>

                <label
                  style={{
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => {
                      setIsPublished(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span>
                    {t("visibility_published_label") ||
                      "Product is visible in your shop (published)"}
                  </span>
                </label>
              </div>

              {/* Pricing & stock */}
              <div style={sectionBlock}>
                <div style={sectionLabel}>
                  {t("section_price_stock") || "Price & stock"}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    ref={priceRef}
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      markDirty();
                      if (priceErr) setPriceErr(null);
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
                {priceErr && <div style={errorText}>{priceErr}</div>}

                <input
                  value={compareAtPrice}
                  onChange={(e) => {
                    setCompareAtPrice(e.target.value);
                    markDirty();
                  }}
                  style={input}
                  placeholder={t("ph_compare_at_price") || "Old price (optional)"}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />

              </div>

              {/* Images */}
              <div style={sectionBlock}>
                <div style={sectionLabel}>
                  {t("section_images") || "Images"}
                </div>

                <input
                  id="owner-product-detail-images-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (!files.length) return;
                    setEditImgs((prev) => [
                      ...prev,
                      ...files.map<UiImageNew>((file) => ({
                        kind: "new",
                        tempId: Math.random().toString(36).slice(2),
                        file,
                        previewUrl: URL.createObjectURL(file),
                      })),
                    ]);
                    markDirty();
                    if (imagesErr) setImagesErr(null);
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("owner-product-detail-images-input")
                      ?.click()
                  }
                  style={{
                    ...input,
                    background: "#fafafa",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  {t("btn_choose_images")}
                </button>

                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                  {editImgs.length === 0
                    ? t("msg_no_images_selected")
                    : editImgs.length === 1
                    ? t("msg_one_image_selected")
                    : t("msg_many_images_selected", {
                        count: editImgs.length,
                      })}
                </div>
                {imagesErr && <div style={errorText}>{imagesErr}</div>}

                {editImgs.length > 0 ? (
                  <div
                    ref={imagesRef}
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {editImgs.map((im, index) => {
                      const isCover = index === 0;
                      const url = im.kind === "existing" ? im.url : im.previewUrl;
                      return (
                        <div
                          key={im.kind === "existing" ? im.imageId : im.tempId}
                          style={{
                            width: 70,
                            height: 70,
                            borderRadius: 10,
                            backgroundImage: url ? `url(${url})` : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            position: "relative",
                            border: isCover
                              ? "2px solid #000"
                              : "1px solid rgba(0,0,0,.12)",
                          }}
                        >
                          {/* remove */}
                          <button
                            onClick={() => {
                              setEditImgs((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                              markDirty();
                            }}
                            style={thumbDeleteBtn}
                            aria-label={t("aria_remove_image")}
                          >
                            ×
                          </button>

                          {/* make cover (move to front) */}
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
                              aria-label={t("aria_make_cover")}
                            >
                              ★
                            </button>
                          ) : (
                            <div style={thumbCoverTag}>{t("tag_cover")}</div>
                          )}

                          {/* move up/down */}
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

              {/* Save / Cancel */}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleSaveEdit} disabled={saving} style={primaryBtn}>
                  {saving ? t("btn_saving") : t("btn_save_changes")}
                </button>
                <button
                  onClick={() => guardLeave(() => setEditMode(false))}
                  style={secondaryBtn}
                >
                  {t("btn_cancel")}
                </button>
              </div>
            </div>
          )}

          {/* ============== Danger Zone - Only OWNER ============== */}
          {showMain && canDeleteProducts(userRole) && (
            <div style={card}>
              <div style={sectionHeaderRow}>
                <div style={{ ...sectionTitle, color: "#b00020" }}>
                  {t("title_danger_zone") || "Danger zone"}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                {t("msg_delete_product_warning") ||
                  "Deleting this product removes it from your shop. Existing orders and history will stay."}
              </div>
              <button onClick={handleDelete} style={dangerBtn}>
                {t("btn_delete_product") || "Delete product"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Inventory Modals */}
      {product && slug && (
        <>
          <AddStockModal
            open={showAddStock}
            onClose={() => setShowAddStock(false)}
            product={product}
            slug={slug}
            onSuccess={() => {
              loadProductData();
            }}
          />
          <RecordSaleModal
            open={showRecordSale}
            onClose={() => setShowRecordSale(false)}
            product={product}
            slug={slug}
            onSuccess={() => {
              loadProductData();
            }}
          />
          <AdjustStockModal
            open={showAdjustStock}
            onClose={() => setShowAdjustStock(false)}
            product={product}
            slug={slug}
            onSuccess={() => {
              loadProductData();
            }}
          />
        </>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 1px 3px rgba(15,15,20,0.06)",
};

const backBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 999,
  width: 30,
  height: 30,
  background: "#fff",
  fontSize: 16,
  cursor: "pointer",
};

const smallBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.12)",
  background: "#fff",
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
};

const primaryBtn: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "9px 16px",
  fontSize: 14,
  cursor: "pointer",
  flex: 1,
};

const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "#000",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 999,
  padding: "9px 16px",
  fontSize: 14,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  background: "#ffebee",
  color: "#b00020",
  border: "1px solid rgba(176,0,32,.3)",
  borderRadius: 999,
  padding: "9px 14px",
  fontSize: 14,
  cursor: "pointer",
  width: "100%",
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

const sectionHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  opacity: 0.7,
  marginBottom: 4,
};

const sectionBlock: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 10,
};

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 600,
};

const pillDanger: React.CSSProperties = {
  ...pillBase,
  background: "#ffebee",
  color: "#b00020",
};

const pillWarn: React.CSSProperties = {
  ...pillBase,
  background: "#fff8e1",
  color: "#b36b00",
};

const pillGreen: React.CSSProperties = {
  ...pillBase,
  background: "#e8f5e9",
  color: "#1b5e20",
};

const pillRed: React.CSSProperties = {
  ...pillBase,
  background: "#ffebee",
  color: "#b00020",
};

const perfRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const perfLabel: React.CSSProperties = {
  opacity: 0.7,
};

const perfValue: React.CSSProperties = {
  fontWeight: 600,
};

const errorText: React.CSSProperties = {
  color: "crimson",
  fontSize: 11,
  marginTop: 2,
};
