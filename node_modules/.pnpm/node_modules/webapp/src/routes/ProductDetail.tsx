// apps/webapp/src/routes/ProductDetail.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";

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
  position?: number;
};

export default function ProductDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [idx, setIdx] = useState(0); // current slide

  useEffect(() => {
    if (!slug || !id) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await api<{ product: Product; images: ProductImage[] }>(
          `/shop/${slug}/products/${id}`
        );
        setProduct(r.product);
        setImages(r.images || []);
        setIdx(0);
      } catch (e: any) {
        setErr(e?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, id]);

  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? images[idx] : null;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => nav(-1)} style={backBtn}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 16 }}>
          {product ? product.title : "Product"}
        </h2>
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
                backgroundImage: currentImg?.webUrl
                  ? `url(${currentImg.webUrl})`
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
                >
                  ‹
                </button>
                <button
                  style={galleryBtnRight}
                  onClick={() => setIdx((old) => (old + 1) % images.length)}
                >
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
                      backgroundImage: im.webUrl
                        ? `url(${im.webUrl})`
                        : undefined,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {product.price} {product.currency}
            </div>
            <div style={{ fontSize: 13, opacity: 0.6 }}>
              Stock: {product.stock ?? 0}
            </div>
            {product.description ? (
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                {product.description}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.5 }}>No description</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.12)",
  background: "#fff",
  borderRadius: 999,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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
