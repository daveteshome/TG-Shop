// Admin: Manage All Products (Universal Marketplace)
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  stock: number;
  isPublished: boolean;
  publishToUniversal: boolean;
  reviewStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  categoryId: string | null;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  images: Array<{ webUrl: string }>;
};

export default function AdminProducts() {
  const nav = useNavigate();
  const loc = useLocation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(loc.search);
  const searchQ = params.get("q") || "";
  const statusFilter = params.get("status") || "all";
  const categoryFilter = params.get("category") || "";
  
  console.log('[AdminProducts] URL params:', {
    search: loc.search,
    categoryFilter,
    statusFilter,
  });

  // Store where we came from for smart back navigation
  useEffect(() => {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    
    // If we came from another page on this site, check if it was an admin page
    if (referrer.startsWith(currentOrigin)) {
      const referrerPath = referrer.replace(currentOrigin, '').split('?')[0];
      if (referrerPath.startsWith('/admin') && referrerPath !== '/admin/products') {
        // Store the referrer as the page to return to
        localStorage.setItem("tgshop:adminProductsReferrer", referrerPath);
      }
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await api<{ products: Product[] }>("/admin/products");
      setProducts(data.products);
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function updateReviewStatus(productId: string, status: "approved" | "rejected") {
    try {
      await api(`/admin/products/${productId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ reviewStatus: status }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, reviewStatus: status } : p))
      );
    } catch (e: any) {
      alert(e?.message || "Failed to update review status");
    }
  }

  async function handleDeleteProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api(`/admin/products/${productId}`, {
        method: "DELETE",
      });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e: any) {
      alert(e?.message || "Failed to delete product");
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQ ||
      product.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      product.tenant.name.toLowerCase().includes(searchQ.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && product.reviewStatus === "pending") ||
      (statusFilter === "approved" && product.reviewStatus === "approved") ||
      (statusFilter === "rejected" && product.reviewStatus === "rejected");

    const matchesCategory =
      categoryFilter === "" || product.categoryId === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });
  
  console.log('[AdminProducts] Filtering results:', {
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    categoryFilter,
    sampleProduct: products[0] ? {
      id: products[0].id,
      categoryId: products[0].categoryId,
    } : null,
  });

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <Card padding="lg">
          <div style={{ color: "var(--color-error)" }}>{error}</div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Manage Products</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          {filteredProducts.length} products
          {categoryFilter && " (filtered by category)"}
        </p>
        {categoryFilter && (
          <button
            onClick={() => {
              params.delete("category");
              nav(`?${params.toString()}`);
            }}
            style={{
              marginTop: 8,
              padding: "4px 8px",
              fontSize: 12,
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Clear category filter
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto" }}>
        <FilterButton
          label="All"
          active={statusFilter === "all"}
          onClick={() => {
            params.set("status", "all");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Pending Review"
          active={statusFilter === "pending"}
          onClick={() => {
            params.set("status", "pending");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Approved"
          active={statusFilter === "approved"}
          onClick={() => {
            params.set("status", "approved");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Rejected"
          active={statusFilter === "rejected"}
          onClick={() => {
            params.set("status", "rejected");
            nav(`?${params.toString()}`);
          }}
        />
      </div>

      {/* Products List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredProducts.map((product) => (
          <Card key={product.id} padding="md">
            <div style={{ display: "flex", gap: "12px" }}>
              {/* Image */}
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "8px",
                  background: "#f0f0f0",
                  backgroundImage: product.images[0]?.webUrl
                    ? `url(${product.images[0].webUrl})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  flexShrink: 0,
                }}
              />

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    {product.title}
                  </div>
                  <Badge
                    variant={
                      product.reviewStatus === "approved"
                        ? "success"
                        : product.reviewStatus === "rejected"
                        ? "error"
                        : "warning"
                    }
                    size="sm"
                  >
                    {product.reviewStatus}
                  </Badge>
                </div>

                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                  {product.tenant.name} • {product.price} {product.currency} • Stock: {product.stock}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {product.reviewStatus === "pending" && (
                    <>
                      <button
                        onClick={() => updateReviewStatus(product.id, "approved")}
                        style={{
                          padding: "4px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background: "var(--color-success)",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateReviewStatus(product.id, "rejected")}
                        style={{
                          padding: "4px 12px",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border-main)",
                          background: "#fff",
                          color: "var(--color-text-secondary)",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {product.reviewStatus === "approved" && (
                    <button
                      onClick={() => updateReviewStatus(product.id, "rejected")}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--color-error)",
                        background: "#fff",
                        color: "var(--color-error)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Revoke Approval
                    </button>
                  )}
                  
                  {product.reviewStatus === "rejected" && (
                    <button
                      onClick={() => updateReviewStatus(product.id, "approved")}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "6px",
                        border: "none",
                        background: "var(--color-success)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Approve
                    </button>
                  )}
                  
                  <button
                    onClick={() => nav(`/s/${product.tenant.slug}/p/${product.id}`)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-main)",
                      background: "#fff",
                      color: "var(--color-text-secondary)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                  
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-error)",
                      background: "#fff",
                      color: "var(--color-error)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              No products found
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "8px",
        border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border-main)"}`,
        background: active ? "var(--color-primary-bg)" : "#fff",
        color: active ? "var(--color-primary-dark)" : "var(--color-text-secondary)",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
