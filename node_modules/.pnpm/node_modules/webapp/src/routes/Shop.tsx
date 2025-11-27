// apps/webapp/src/routes/Shop.tsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";
import ShopProfileDrawer from "../components/shop/ShopProfileDrawer";
import CategoryCascader from "../components/CategoryCascader";
import { useTranslation } from "react-i18next";
import ShopCategoryFilterGridIdentical from "../components/shop/ShopCategoryFilterGridIdentical";
import SearchBox from "../components/search/SearchBox";

const API_BASE = import.meta.env.VITE_API_BASE || "";

/* ---------------- URL helpers ---------------- */
function ensureAbsolute(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return API_BASE ? `${API_BASE}${url}` : url;
}
function forceHttpsIfNeeded(url: string): string {
  if (!url) return url;
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    return url.replace(/^http:\/\//, "https://");
  }
  return url;
}
function normalizeUrl(url?: string | null): string | null {
  if (!url) return null;
  return forceHttpsIfNeeded(ensureAbsolute(url));
}

function absolutizeIfNeeded(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u; // absolute (R2 / http)
  if (u.startsWith("/")) return `${API_BASE}${u}`; // backend-relative
  return null;
}

function Thumb({
  slug, // kept for signature compatibility (unused now)
  productId, // kept for signature compatibility (unused now)
  photoUrl,
}: {
  slug: string;
  productId: string;
  photoUrl?: string | null;
}) {
  const [broken, setBroken] = React.useState(false);
  const src = !broken ? absolutizeIfNeeded(photoUrl) : null;
  const size = 58;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "#ddd", // ✅ clean gray block
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          width={size}
          height={size}
          style={{ objectFit: "cover", width: "100%", height: "100%", display: "block" }}
          onError={() => setBroken(true)} // ✅ fallback to gray if it fails
        />
      ) : null}
    </div>
  );
}

/* ---------------- Types ---------------- */
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
  const { t } = useTranslation();

  useEffect(() => {
    if (!slug) return;
    window.dispatchEvent(
      new CustomEvent("tgshop:search-config", {
        detail: {
          scope: "owner",
          tenantSlug: slug,
          placeholder: "Search my shop…",
          basePath: `/s/${slug}/search`,
        },
      })
    );
  }, [slug]);

  const [products, setProducts] = useState<Product[]>([]);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCurrency, setPCurrency] = useState("ETB");
  const [pCategory, setPCategory] = useState<string | null>(null);
  const [pDesc, setPDesc] = useState("");
  const [pStock, setPStock] = useState("1");
  const [createImages, setCreateImages] = useState<UiImageNew[]>([]);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  // 🔹 brand + condition in create form
  const [pBrand, setPBrand] = useState("");
  const [pCondition, setPCondition] = useState<"" | "new" | "used" | "refurbished">("");

  // 🔹 per-field errors for create form
  const [createErrors, setCreateErrors] = useState<{
    title?: string;
    brand?: string;
    condition?: string;
    price?: string;
    stock?: string;
    images?: string;
  }>({});

  // 🔹 Refs for scrolling to first error
  const titleRef = useRef<HTMLInputElement | null>(null);
  const brandRef = useRef<HTMLInputElement | null>(null);
  const conditionRef = useRef<HTMLSelectElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const stockRef = useRef<HTMLInputElement | null>(null);
  const imagesSectionRef = useRef<HTMLDivElement | null>(null);

  // filter category
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // edit form (legacy, not used for main editing anymore but kept)
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editImages, setEditImages] = useState<UiImage[]>([]);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tenant, setTenant] = useState<{
    id: string;
    name: string;
    logoWebUrl?: string | null;
    shippingInfo?: string | null;
    location?: string | null;
    deliveryMode?: "pickup" | "delivery" | "both" | null;
    paymentMethods?: "cod" | "prepay" | "both" | null;
    bankAccounts?: Array<{ id: string; bank: string; accountName: string; accountNumber: string }>;
  } | null>(null);
  
  const [tenantLoaded, setTenantLoaded] = useState(false);

  const initData = getInitDataRaw();

  // Validation function for shop setup completeness
  function isShopSetupComplete(tenant: typeof tenant): { complete: boolean; missing: string[] } {
    if (!tenant) return { complete: false, missing: [] };
    
    const missing: string[] = [];
    
    // Check delivery setup
    if (!tenant.deliveryMode) {
      missing.push("delivery_mode");
    } else {
      // If delivery mode includes "delivery", must have regions
      if ((tenant.deliveryMode === "delivery" || tenant.deliveryMode === "both") && !tenant.shippingInfo?.trim()) {
        missing.push("delivery_regions");
      }
      // If delivery mode includes "pickup", must have addresses
      if ((tenant.deliveryMode === "pickup" || tenant.deliveryMode === "both") && !tenant.location?.trim()) {
        missing.push("pickup_addresses");
      }
    }
    
    // Check payment setup
    if (!tenant.paymentMethods) {
      missing.push("payment_methods");
    } else {
      // If payment includes prepay, must have bank accounts
      if ((tenant.paymentMethods === "prepay" || tenant.paymentMethods === "both") && (!tenant.bankAccounts || tenant.bankAccounts.length === 0)) {
        missing.push("bank_accounts");
      }
    }
    
    return { complete: missing.length === 0, missing };
  }

  function markDirty() {
    setFormDirty(true);
  }

  function guardLeave(next: () => void) {
    if (!formDirty) {
      next();
      return;
    }
    const ok = window.confirm(t("confirm_discard_changes"));
    if (ok) {
      setFormDirty(false);
      next();
    }
  }

  function scrollToFirstCreateError(errors: typeof createErrors) {
    const order: (keyof typeof createErrors)[] = [
      "title",
      "brand",
      "condition",
      "price",
      "stock",
      "images",
    ];

    const firstKey = order.find((k) => errors[k]);
    if (!firstKey) return;

    let el: HTMLElement | null = null;

    switch (firstKey) {
      case "title":
        el = titleRef.current;
        break;
      case "brand":
        el = brandRef.current;
        break;
      case "condition":
        el = conditionRef.current;
        break;
      case "price":
        el = priceRef.current;
        break;
      case "stock":
        el = stockRef.current;
        break;
      case "images":
        el = imagesSectionRef.current;
        break;
    }

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if ("focus" in el) {
        (el as any).focus?.();
      }
    }
  }

  // fetch products (honor categoryId)
  async function loadProducts(shopSlug: string, catId: string | null = null) {
    const qs = catId ? `?category=${encodeURIComponent(catId)}` : "";
    const res = await api<{ items: Product[]; tenant?: { id: string; name: string } }>(
      `/shop/${shopSlug}/products${qs}`
    );
    setProducts(res.items || []);

    if (res.tenant && res.tenant.id) {
      setTenant((prev) => ({
        ...prev,
        id: res.tenant!.id,
        name: res.tenant!.name,
        logoWebUrl: prev?.logoWebUrl ?? null,
      }));
    } else {
      try {
        const tnt = await api<{ id: string; name: string; logoWebUrl?: string | null }>(
          `/shop/${shopSlug}`
        );
        setTenant((prev) => ({
          ...prev,
          id: tnt.id,
          name: tnt.name,
          logoWebUrl: prev?.logoWebUrl ?? tnt.logoWebUrl ?? null,
        }));
      } catch {
        /* ignore */
      }
    }

    const nameForHeader = res.tenant?.name ?? tenant?.name ?? "";
    window.dispatchEvent(
      new CustomEvent("tgshop:set-shop-context", {
        detail: { slug: shopSlug, name: nameForHeader },
      })
    );
  }

  async function handleDeleteProduct(productId: string) {
    if (!slug) return;

    const ok =
      window.confirm(t("confirm_delete_product") || "Are you sure you want to delete this product?");
    if (!ok) return;

    try {
      await api<{ ok: boolean }>(`/shop/${slug}/products/${productId}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error("Failed to delete product", err);
      alert(t("error_delete_product") || "Failed to delete product");
    }
  }

  async function loadProductForEdit(shopSlug: string, productId: string) {
    const res = await api<{
      product: Product;
      images: { id: string; imageId: string | null; url: string | null; webUrl: string | null }[];
    }>(`/shop/${shopSlug}/products/${productId}`);

    const p = res.product;
    setPTitle(p.title);
    setPPrice(String(p.price ?? ""));
    setPCurrency(p.currency || "ETB");
    setPDesc(p.description || "");
    setPCategory(p.categoryId || null);
    setPStock(String(p.stock && p.stock > 0 ? p.stock : 1));

    const uiImgs: UiImage[] = (res.images || []).map((im) => ({
      kind: "existing",
      productImageId: im.id,
      imageId: im.imageId,
      url: im.webUrl || im.url,
    }));
    setEditImages(uiImgs);
    setFormDirty(false);
  }

  // Load tenant data function
  const loadTenantData = React.useCallback(async () => {
    if (!slug) return;
    setTenantLoaded(false);
    try {
      const tnt = await api<{ 
        id: string; 
        name: string; 
        logoWebUrl?: string | null;
        shippingInfo?: string | null;
        location?: string | null;
        deliveryMode?: "pickup" | "delivery" | "both" | null;
        paymentMethods?: "cod" | "prepay" | "both" | null;
        bankAccounts?: Array<{ id: string; bank: string; accountName: string; accountNumber: string }>;
      }>(
        `/shop/${slug}`
      );

      
      setTenant({
        id: tnt.id,
        name: tnt.name,
        logoWebUrl:
          typeof tnt.logoWebUrl === "string" && tnt.logoWebUrl.length > 0
            ? tnt.logoWebUrl
            : null,
        shippingInfo: tnt.shippingInfo ?? null,
        location: tnt.location ?? null,
        deliveryMode: tnt.deliveryMode ?? null,
        paymentMethods: tnt.paymentMethods ?? null,
        bankAccounts: Array.isArray(tnt.bankAccounts) ? tnt.bankAccounts : [],
      });
      
      setTenantLoaded(true);

      window.dispatchEvent(
        new CustomEvent("tgshop:set-shop-context", {
          detail: {
            slug,
            name: tnt.name,
            ...(tnt.logoWebUrl ? { logoWebUrl: tnt.logoWebUrl } : {}),
          },
        })
      );
    } catch {
      setTenantLoaded(true); // Mark as loaded even on error
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      localStorage.setItem("tgshop:lastShopPage", `/shop/${slug}`);
    }
  }, [slug, loc.pathname]);

  useEffect(() => {
    if (!slug) return;
    loadProducts(slug, categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, categoryId]);

  useEffect(() => {
    function onOpenShopMenu() {
      setProfileOpen(true);
    }
    window.addEventListener("tgshop:open-shop-menu", onOpenShopMenu);
    return () => window.removeEventListener("tgshop:open-shop-menu", onOpenShopMenu);
  }, []);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  // Reload tenant data when returning to this page (e.g., from settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadTenantData();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadTenantData]);

  useEffect(() => {
    function onAddProduct() {
      guardLeave(() => {
        setShowCreate((v) => !v);
        setShowEdit(false);
        setEditingId(null);
        setSaveErr(null);
        setCreateImages([]);
        setCreateErrors({});
        setPBrand("");
        setPCondition("");
      });
    }
    
    function onClosePanel(e: Event) {
      // If add product panel is open, close it and prevent navigation
      if (showCreate) {
        guardLeave(() => {
          setShowCreate(false);
          setSaveErr(null);
          setCreateErrors({});
        });
        e.preventDefault(); // Prevent default to signal panel was closed
        return false;
      }
      // If edit panel is open, close it
      if (showEdit) {
        guardLeave(() => {
          setShowEdit(false);
          setEditingId(null);
        });
        e.preventDefault();
        return false;
      }
    }
    
    window.addEventListener("tgshop:add-product", onAddProduct);
    window.addEventListener("tgshop:close-panel", onClosePanel as EventListener);
    return () => {
      window.removeEventListener("tgshop:add-product", onAddProduct);
      window.removeEventListener("tgshop:close-panel", onClosePanel as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formDirty, showCreate, showEdit]);

  // =============== CREATE ===============
  async function handleCreateProduct() {
    if (!slug) return;

    const errors: typeof createErrors = {};

    if (!pTitle.trim()) {
      errors.title = t("err_title_required");
    }

    if (!pBrand.trim()) {
      errors.brand = t("err_brand_required") || "Brand is required";
    }

    if (!pCondition) {
      errors.condition = t("err_condition_required") || "Condition is required";
    }

    const priceNum = Number(pPrice);
    if (!pPrice.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      errors.price = t("err_price_gt_zero");
    }

    const stockNum = Number(pStock);
    if (
      !pStock.trim() ||
      Number.isNaN(stockNum) ||
      stockNum <= 0 ||
      !Number.isInteger(stockNum)
    ) {
      errors.stock = t("err_stock_integer_gt_zero");
    }

    if (createImages.length === 0) {
      errors.images = t("err_image_required") || "At least one image is required";
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      scrollToFirstCreateError(errors);
      return;
    }

    // no client-side validation errors
    setCreateErrors({});
    setSaving(true);
    setSaveErr(null);

    try {
      const imageIds: string[] = [];
      for (const img of createImages) {
        const fd = new FormData();
        fd.append("file", img.file);
        const uploadRes = await fetch(`/api/shop/${slug}/uploads/image`, {
          method: "POST",
          headers: initData ? { Authorization: `tma ${initData}` } : undefined,
          body: fd,
        });
        if (!uploadRes.ok) throw new Error("image_upload_failed");
        const json = await uploadRes.json();
        imageIds.push(json.imageId);
      }

      const res = await api<{ product: { id: string } }>(`/shop/${slug}/products`, {
        method: "POST",
        body: JSON.stringify({
          title: pTitle.trim(),
          price: priceNum,
          currency: pCurrency,
          description: pDesc.trim() ? pDesc.trim() : null,
          categoryId: pCategory,
          stock: stockNum,
          imageIds,
          brand: pBrand.trim(),
          condition: pCondition,
        }),
      });

      const newId = res.product?.id;
      if (!newId) {
        throw new Error("no_product_id_in_response");
      }

      // reset
      setPTitle("");
      setPPrice("");
      setPCurrency("ETB");
      setPDesc("");
      setPCategory(null);
      setPStock("1");
      setCreateImages([]);
      setPBrand("");
      setPCondition("");
      setShowCreate(false);
      setFormDirty(false);

      nav(`/shop/${slug}/p/${newId}`);
    } catch (e: any) {
      console.error(e);
      setSaveErr(e?.message || t("err_create_product_failed"));
    } finally {
      setSaving(false);
    }
  }

  // =============== UPDATE (legacy panel) ===============
  async function handleUpdateProduct() {
    if (!slug || !editingId) return;
    if (!pTitle.trim()) {
      setSaveErr(t("err_title_required"));
      return;
    }

    const priceNum = Number(pPrice);
    if (!pPrice.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      setSaveErr(t("err_price_gt_zero"));
      return;
    }

    const stockNum = Number(pStock);
    if (
      !pStock.trim() ||
      Number.isNaN(stockNum) ||
      stockNum <= 0 ||
      !Number.isInteger(stockNum)
    ) {
      setSaveErr(t("err_stock_integer_gt_zero"));
      return;
    }

    setSaving(true);
    setSaveErr(null);

    try {
      // upload new images
      const newImgs = editImages.filter((im) => im.kind === "new") as UiImageNew[];
      const uploadedNew: { tempId: string; imageId: string }[] = [];

      for (const img of newImgs) {
        const fd = new FormData();
        fd.append("file", img.file);
        const up = await fetch("/api/uploads/image", {
          method: "POST",
          headers: initData ? { Authorization: `tma ${initData}` } : undefined,
          body: fd,
        });
        if (!up.ok) throw new Error("image_upload_failed");
        const json = await up.json();
        uploadedNew.push({ tempId: img.tempId, imageId: json.imageId });
      }

      const imageIds: string[] = [];
      const imagesReplace: { type: "existing" | "new"; productImageId?: string; imageId?: string }[] =
        [];

      for (const img of editImages) {
        if (img.kind === "existing") {
          imagesReplace.push({ type: "existing", productImageId: (img as UiImageExisting).productImageId });
          if ((img as UiImageExisting).imageId) imageIds.push((img as UiImageExisting).imageId!);
        } else {
          const up = uploadedNew.find((u) => u.tempId === (img as UiImageNew).tempId);
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

      await loadProducts(slug, categoryId);

      setShowEdit(false);
      setFormDirty(false);
      setEditingId(null);
      setEditImages([]);
      setPTitle("");
      setPPrice("");
      setPCurrency("ETB");
      setPDesc("");
      setPCategory(null);
      setPStock("1");
    } catch (e: any) {
      setSaveErr(e?.message || t("err_update_product_failed"));
    } finally {
      setSaving(false);
    }
  }

  function moveImage<T>(arr: T[], index: number, delta: number): T[] {
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= arr.length) return arr;
    const copy = [...arr];
    const tmp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = tmp;
    return copy;
  }

  if (!slug) {
    return (
      <div style={{ padding: 16 }}>
        <p>{t("msg_no_shop_selected")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Shop configuration warning */}
      {tenantLoaded && (() => {
        const setupStatus = isShopSetupComplete(tenant);
        if (setupStatus.complete) return null;
        

        return (
          <div style={{
            padding: "14px 16px",
            background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
            border: "2px solid #F59E0B",
            borderRadius: 12,
            fontSize: 14,
            color: "#92400E",
            lineHeight: 1.6,
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.2)",
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
              ⚠️ {t('shop_setup_incomplete', 'Shop Setup Incomplete')}
            </div>
            <div style={{ marginBottom: 8 }}>
              {t('shop_setup_required', 'To start selling, please complete your shop configuration:')}
            </div>
            <div style={{ marginLeft: 16, marginBottom: 10 }}>
              {setupStatus.missing.includes("delivery_mode") && (
                <div>• {t('setup_delivery_mode', 'Choose delivery method (pickup/delivery/both)')}</div>
              )}
              {setupStatus.missing.includes("delivery_regions") && (
                <div>• {t('setup_delivery_regions', 'Select at least one delivery region')}</div>
              )}
              {setupStatus.missing.includes("pickup_addresses") && (
                <div>• {t('setup_pickup_addresses', 'Add at least one pickup address')}</div>
              )}
              {setupStatus.missing.includes("payment_methods") && (
                <div>• {t('setup_payment_methods', 'Choose payment method (COD/prepay/both)')}</div>
              )}
              {setupStatus.missing.includes("bank_accounts") && (
                <div>• {t('setup_bank_accounts', 'Add at least one bank account for prepayment')}</div>
              )}
            </div>
            <button
              onClick={() => nav(`/shop/${slug}/settings`)}
              style={{
                background: "#F59E0B",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {t('btn_go_to_settings', 'Go to Settings')} →
            </button>
          </div>
        );
      })()}

      {/* create panel */}
      {showCreate && (
        <div style={panel}>
          <strong style={{ fontSize: 14 }}>{t("title_new_product")}</strong>
          {saveErr ? <div style={{ color: "crimson", fontSize: 13 }}>{saveErr}</div> : null}

          <input
            ref={titleRef}
            value={pTitle}
            onChange={(e) => {
              setPTitle(e.target.value);
              setCreateErrors((prev) => ({ ...prev, title: undefined }));
              markDirty();
            }}
            placeholder={t("ph_product_title")}
            style={input}
          />
          {createErrors.title && (
            <div style={{ color: "crimson", fontSize: 12, marginTop: 2 }}>
              {createErrors.title}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <input
                ref={priceRef}
                value={pPrice}
                onChange={(e) => {
                  setPPrice(e.target.value);
                  setCreateErrors((prev) => ({ ...prev, price: undefined }));
                  markDirty();
                }}
                placeholder={t("ph_price")}
                style={{ ...input, width: "100%" }}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {createErrors.price && (
                <div style={{ color: "crimson", fontSize: 12, marginTop: 2 }}>
                  {createErrors.price}
                </div>
              )}
            </div>
            <select
              value={pCurrency}
              onChange={(e) => {
                setPCurrency(e.target.value);
                markDirty();
              }}
              style={{ ...input, flexBasis: 110 }}
            >
              <option value="ETB">ETB</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Brand + Condition */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginBottom: 4,
              }}
            >
              {t("label_brand") || "Brand"}
            </label>
            <input
              ref={brandRef}
              value={pBrand}
              onChange={(e) => {
                setPBrand(e.target.value);
                setCreateErrors((prev) => ({ ...prev, brand: undefined }));
                markDirty();
              }}
              placeholder={t("ph_brand") || "Brand"}
              style={input}
            />
            {createErrors.brand && (
              <div style={{ color: "crimson", fontSize: 12, marginTop: 2 }}>
                {createErrors.brand}
              </div>
            )}

            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              {t("label_condition") || "Condition"}
            </label>
            <select
              ref={conditionRef}
              value={pCondition}
              onChange={(e) => {
                setPCondition(e.target.value as any);
                setCreateErrors((prev) => ({ ...prev, condition: undefined }));
                markDirty();
              }}
              style={input}
            >
              <option value="">{t("ph_condition_none") || "Select condition"}</option>
              <option value="new">{t("condition_new") || "New"}</option>
              <option value="used">{t("condition_used") || "Used"}</option>
              <option value="refurbished">
                {t("condition_refurbished") || "Refurbished"}
              </option>
            </select>
            {createErrors.condition && (
              <div style={{ color: "crimson", fontSize: 12, marginTop: 2 }}>
                {createErrors.condition}
              </div>
            )}
          </div>

          {/* Category (cascader, icons hidden in this context) */}
          <CategoryCascader
            value={pCategory}
            onChange={(id) => {
              setPCategory(id);
              markDirty();
            }}
          />

          <textarea
            value={pDesc}
            onChange={(e) => {
              setPDesc(e.target.value);
              markDirty();
            }}
            placeholder={t("ph_description_optional")}
            style={{ ...input, minHeight: 70, resize: "vertical" }}
          />

          <div>
            <label
              style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}
            >
              {t("label_stock_units")}
            </label>
            <input
              ref={stockRef}
              value={pStock}
              onChange={(e) => {
                setPStock(e.target.value);
                setCreateErrors((prev) => ({ ...prev, stock: undefined }));
                markDirty();
              }}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="1"
              style={input}
            />
            {createErrors.stock && (
              <div style={{ color: "crimson", fontSize: 12, marginTop: 2 }}>
                {createErrors.stock}
              </div>
            )}
          </div>

          {/* images create */}
          <div ref={imagesSectionRef}>
            <label
              style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}
            >
              {t("label_images")}
            </label>

            <input
              ref={createFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                markDirty();
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
                setCreateErrors((prev) => ({ ...prev, images: undefined }));
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />

            <button
              type="button"
              onClick={() => createFileInputRef.current?.click()}
              style={{ ...secondaryBtn, marginTop: 4 }}
            >
              {t("btn_choose_images")}
            </button>

            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
              {createImages.length === 0
                ? t("msg_no_images_selected")
                : createImages.length === 1
                ? t("msg_one_image_selected")
                : t("msg_many_images_selected", { count: createImages.length })}
            </div>

            {createErrors.images && (
              <div style={{ color: "crimson", fontSize: 12, marginTop: 2 }}>
                {createErrors.images}
              </div>
            )}

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
                      onClick={() =>
                        setCreateImages((prev) =>
                          prev.filter((x) => x.tempId !== img.tempId)
                        )
                      }
                      style={thumbDeleteBtn}
                      aria-label={t("aria_remove_image")}
                    >
                      ×
                    </button>
                    {index === 0 ? <div style={thumbCoverTag}>{t("tag_cover")}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button onClick={handleCreateProduct} disabled={saving} style={primaryBtn}>
            {saving ? t("btn_creating") : t("btn_create_product")}
          </button>
          <button
            onClick={() =>
              guardLeave(() => {
                setShowCreate(false);
                setSaveErr(null);
                setCreateErrors({});
              })
            }
            style={secondaryBtn}
          >
            {t("btn_cancel")}
          </button>
        </div>
      )}

      {/* Category grid */}
      <ShopCategoryFilterGridIdentical value={categoryId} onChange={setCategoryId} />

      {/* products list */}
      {products.length === 0 ? (
        <div
          style={{
            padding: 20,
            background: "#fff",
            border: "1px solid rgba(0,0,0,.04)",
            borderRadius: 12,
          }}
        >
          {t("msg_no_products_yet")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((p) => (
            <div key={p.id}>
              <div
                onClick={() => {
                  if (!slug) return;
                  guardLeave(() => {
                    nav(`/shop/${slug}/p/${p.id}`);
                  });
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
                {/* 👇 robust thumbnail tries both /shop/:slug/... and /api/products/... */}
                <Thumb slug={slug!} productId={p.id} photoUrl={p.photoUrl} />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {p.price} {p.currency}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>
                    {t("label_stock_short")}: {p.stock ?? 0}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!slug) return;
                    guardLeave(() => {
                      nav(`/shop/${slug}/p/${p.id}`);
                    });
                  }}
                  style={smallBtn}
                >
                  {t("btn_edit")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shop Profile Drawer */}
      <ShopProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        tenant={{
          name: tenant?.name ?? null,
          slug,
          logoWebUrl: tenant?.logoWebUrl ?? null,
          publishUniversal: false,
        }}
      />
    </div>
  );
}

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
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};

const panel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,.04)",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 8,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.05)",
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
  background: "rgba(0,0,0,.5)",
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
  padding: "2px 6px",
};

const thumbMoveRow: React.CSSProperties = {
  position: "absolute",
  bottom: -14,
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
