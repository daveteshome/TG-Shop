import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";
import ShopProfileDrawer from "../components/shop/ShopProfileDrawer";

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

  //const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  // edit form
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editImages, setEditImages] = useState<UiImage[]>([]);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tenant, setTenant] = useState<{ id: string; name: string; logoWebUrl?: string | null } | null>(null);

  const initData = getInitDataRaw();

  function markDirty() {
    setFormDirty(true);
  }

  function guardLeave(next: () => void) {
    if (!formDirty) {
      next();
      return;
    }
    const ok = window.confirm("You have unsaved changes. Discard them?");
    if (ok) {
      setFormDirty(false);
      next();
    }
  }

async function loadProducts(shopSlug: string) {
  const res = await api<{ items: Product[]; tenant: { id: string; name: string } }>(
    `/shop/${shopSlug}/products`
  );
  setProducts(res.items);
    setTenant(prev => ({
    id: res.tenant.id,
    name: res.tenant.name,
    // keep existing logo until we fetch the real one
    logoWebUrl: prev?.logoWebUrl ?? null,
  }));


  // 🔔 Tell the header what shop is active (logo unknown here → null)
  window.dispatchEvent(
    new CustomEvent("tgshop:set-shop-context", {
      detail: { slug: shopSlug, name: res.tenant.name},
    })
  );
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

  useEffect(() => {
    if (slug) {
      localStorage.setItem("tgshop:lastShopPage", `/shop/${slug}`);
    }
  }, [slug, loc.pathname]);

  useEffect(() => {
    if (!slug) return;
    loadProducts(slug);
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<Category[]>(`/categories`);
        setCategories(Array.isArray(res) ? res : []);
      } catch (err) {
        console.warn("Failed to load universal categories", err);
        setCategories([]);
      }
    })();
  }, []);

  useEffect(() => {
    function onOpenShopMenu() { setProfileOpen(true); }
    window.addEventListener("tgshop:open-shop-menu", onOpenShopMenu);
    return () => window.removeEventListener("tgshop:open-shop-menu", onOpenShopMenu);
  }, []);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const t = await api<{ id: string; name: string; logoWebUrl?: string | null }>(`/shop/${slug}`);
        setTenant(prev => ({
  ...prev,
  id: t.id,
  name: t.name,
  logoWebUrl: (typeof t.logoWebUrl === "string" && t.logoWebUrl.length > 0)
    ? t.logoWebUrl
    : (prev?.logoWebUrl ?? null),
      }));

      window.dispatchEvent(new CustomEvent("tgshop:set-shop-context", {
        detail: {
          slug,
          name: t.name,
          ...(t.logoWebUrl ? { logoWebUrl: t.logoWebUrl } : {}), // include only if truthy
        },
      }));


        // emit context, but don’t force null into the stream
        window.dispatchEvent(
          new CustomEvent("tgshop:set-shop-context", {
            detail: {
              slug,
              name: t.name,
              ...(t.logoWebUrl ? { logoWebUrl: t.logoWebUrl } : {}), // include only if truthy
            },
          })
        );

      } catch {
        /* ignore — we already sent name with null logo */
      }
    })();
  }, [slug]);

  // 👇 listens for Add product button click from the global header
  // 👇 listens for Add product button click from the global header
  useEffect(() => {
    function onAddProduct() {
      guardLeave(() => {
        setShowCreate((v) => !v);
        setShowEdit(false);
        setEditingId(null);
        setSaveErr(null);
        setCreateImages([]);
      });
    }

    window.addEventListener("tgshop:add-product", onAddProduct);
    return () => window.removeEventListener("tgshop:add-product", onAddProduct);
    // formDirty is ok here if you want guardLeave to reflect current state
  }, [formDirty]);

  // 👇 listens for opening the Shop Profile drawer from the header avatar
  useEffect(() => {
    function onOpenShopMenu() {
      setProfileOpen(true);
    }
    window.addEventListener("tgshop:open-shop-menu", onOpenShopMenu);
    return () => window.removeEventListener("tgshop:open-shop-menu", onOpenShopMenu);
  }, []);



  // =============== CREATE ===============
  async function handleCreateProduct() {
    if (!slug) return;
    if (!pTitle.trim()) {
      setSaveErr("Title is required");
      return;
    }

    const priceNum = Number(pPrice);
    if (!pPrice.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      // 👈 back to your rule: must be > 0
      setSaveErr("Price must be a number greater than 0");
      return;
    }

    const stockNum = Number(pStock);
    if (!pStock.trim() || Number.isNaN(stockNum) || stockNum <= 0 || !Number.isInteger(stockNum)) {
      // 👈 also back to your rule
      setSaveErr("Stock must be a whole number greater than 0");
      return;
    }

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

      await api(`/shop/${slug}/products`, {
        method: "POST",
        body: JSON.stringify({
          title: pTitle.trim(),
          price: priceNum,
          currency: pCurrency,
          description: pDesc.trim() ? pDesc.trim() : null,
          categoryId: pCategory,
          stock: stockNum,
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
      setPStock("1");
      setCreateImages([]);
      setShowCreate(false);
      setFormDirty(false);
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  // =============== UPDATE ===============
  async function handleUpdateProduct() {
    if (!slug || !editingId) return;
    if (!pTitle.trim()) {
    setSaveErr("Title is required");
    return;
    }

    const priceNum = Number(pPrice);
    if (!pPrice.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      setSaveErr("Price must be a number greater than 0");
      return;
    }

    const stockNum = Number(pStock);
    if (!pStock.trim() || Number.isNaN(stockNum) || stockNum <= 0 || !Number.isInteger(stockNum)) {
      setSaveErr("Stock must be a whole number greater than 0");
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
      const imagesReplace: { type: "existing" | "new"; productImageId?: string; imageId?: string }[] = [];

      for (const img of editImages) {
        if (img.kind === "existing") {
          imagesReplace.push({ type: "existing", productImageId: img.productImageId });
          if (img.imageId) imageIds.push(img.imageId);
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
      setSaveErr(e?.message || "Failed to update product");
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
        <p>No shop selected.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* create panel */}
      {showCreate && (
        <div style={panel}>
          <strong style={{ fontSize: 14 }}>New product</strong>
          {saveErr ? <div style={{ color: "crimson", fontSize: 13 }}>{saveErr}</div> : null}

          <input
            value={pTitle}
            onChange={(e) => {
              setPTitle(e.target.value);
              markDirty();
            }}
            placeholder="Product title"
            style={input}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={pPrice}
              onChange={(e) => {
                setPPrice(e.target.value);
                markDirty();
              }}
              placeholder="Price"
              style={{ ...input, flex: 1 }}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              pattern="[0-9]*"
            />
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

          <select
            value={pCategory ?? ""}
            onChange={(e) => {
              setPCategory(e.target.value || null);
              markDirty();
            }}
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
            onChange={(e) => {
              setPDesc(e.target.value);
              markDirty();
            }}
            placeholder="Description (optional)"
            style={{ ...input, minHeight: 70, resize: "vertical" }}
          />

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
              Stock (available units)
            </label>
            <input
              value={pStock}
              onChange={(e) => {
                setPStock(e.target.value);
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
          </div>

          {/* images create */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Images</label>

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
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />

            <button
              type="button"
              onClick={() => createFileInputRef.current?.click()}
              style={{ ...secondaryBtn, marginTop: 4 }}
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
            onClick={() =>
              guardLeave(() => {
                setShowCreate(false);
                setSaveErr(null);
              })
            }
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
            background: "#fff",
            border: "1px solid rgba(0,0,0,.04)",
            borderRadius: 12,
          }}
        >
          No products yet.
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
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 10,
                    background: "#ddd",
                    backgroundImage: p.photoUrl ? `url(${p.photoUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {p.price} {p.currency}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>Stock: {p.stock ?? 0}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    guardLeave(() => {
                      setShowCreate(false);
                      setShowEdit(true);
                      setEditingId(p.id);
                      setSaveErr(null);
                      loadProductForEdit(slug!, p.id);
                    });
                  }}
                  style={smallBtn}
                >
                  Edit
                </button>
              </div>

              {showEdit && editingId === p.id ? (
                <div style={{ ...panel, marginTop: 6 }}>
                  <strong style={{ fontSize: 14 }}>Edit product</strong>
                  {saveErr ? <div style={{ color: "crimson", fontSize: 13 }}>{saveErr}</div> : null}

                  <input
                    value={pTitle}
                    onChange={(e) => {
                      setPTitle(e.target.value);
                      markDirty();
                    }}
                    placeholder="Product title"
                    style={input}
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={pPrice}
                      onChange={(e) => {
                        setPPrice(e.target.value);
                        markDirty();
                      }}
                      placeholder="Price"
                      style={{ ...input, flex: 1 }}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
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

                  <select
                    value={pCategory ?? ""}
                    onChange={(e) => {
                      setPCategory(e.target.value || null);
                      markDirty();
                    }}
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
                    onChange={(e) => {
                      setPDesc(e.target.value);
                      markDirty();
                    }}
                    placeholder="Description (optional)"
                    style={{ ...input, minHeight: 60 }}
                  />

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Stock</label>
                    <input
                      value={pStock}
                      onChange={(e) => {
                        setPStock(e.target.value);
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
                  </div>

                  {/* edit images */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                      Images (existing + new)
                    </label>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        markDirty();
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
                      style={{ display: "none" }}
                    />

                    <button type="button" onClick={() => editFileInputRef.current?.click()} style={secondaryBtn}>
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
                                  markDirty();
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
                                    markDirty();
                                    setEditImages((prev) => {
                                      const copy = [...prev];
                                      const i = copy.findIndex((x) =>
                                        x.kind === "existing"
                                          ? x.productImageId === (img as UiImageExisting).productImageId
                                          : x.tempId === (img as UiImageNew).tempId
                                      );
                                      if (i <= 0) return copy;
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
                                    markDirty();
                                    setEditImages((prev) => moveImage(prev, index, -1));
                                  }}
                                  style={thumbMoveBtn}
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => {
                                    markDirty();
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

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleUpdateProduct} disabled={saving} style={primaryBtn}>
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      onClick={() =>
                        guardLeave(() => {
                          setShowEdit(false);
                          setEditingId(null);
                          setSaveErr(null);
                        })
                      }
                      style={secondaryBtn}
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
      {/* Shop Profile Drawer (opens from right) */}
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

const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,.08)",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  cursor: "pointer",
};

const avatarBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "999px",
  border: "1px solid rgba(0,0,0,.08)",
  background: "#eee",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
