// Smart personalized product sections
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentlyViewed, getLastSearch, getTopCategories } from '../../lib/browsingHistory';
import { api } from '../../lib/api/index';
import { ProductCard } from '../product/ProductCard';
import type { Product } from '../../lib/types';

type Props = {
  mode: 'universal' | 'buyer';
  tenantSlug?: string;
  onProductsShown?: (productIds: string[]) => void;
  onAdd?: (p: any) => Promise<void> | void; // Add cart handler for buyer mode
  shopPhone?: string;
  shopTelegram?: string;
  onCall?: () => void;
  onMessage?: () => void;
};

export default function SmartSections({ 
  mode, 
  tenantSlug, 
  onProductsShown, 
  onAdd,
  shopPhone,
  shopTelegram,
  onCall,
  onMessage,
}: Props) {
  const nav = useNavigate();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [lastSearch, setLastSearch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSmartData().catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [mode, tenantSlug]);

  async function loadSmartData() {
    setLoading(true);
    
    // Track all shown product IDs to avoid duplicates
    const shownProductIds = new Set<string>();
    
    try {
      // Get browsing history
      const recentlyViewed = getRecentlyViewed();
      const lastSearchQuery = getLastSearch();
      const topCategoryIds = getTopCategories(3);

      setLastSearch(lastSearchQuery);

      // Load recently viewed products (if any) - limit to 5 for horizontal scroll
      if (recentlyViewed.length > 0) {
        const recentIds = recentlyViewed.slice(0, 5).map(p => p.id); // Only show 5 most recent
        const endpoint = mode === 'universal' 
          ? `/universal/products/by-ids`
          : `/shop/${tenantSlug}/products/by-ids`;
        
        try {
          const res = await api<{ products: Product[] }>(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: recentIds }),
          });
          const recent = res.products || [];
          setRecentProducts(recent);
          // Add to shown IDs
          recent.forEach(p => shownProductIds.add(p.id));
        } catch (e) {
          // Don't fail the whole component, just skip this section
        }
      }

      // Load recommended products based on top categories (or all if no categories) - limit to 8
      const recommendedEndpoint = topCategoryIds.length > 0
        ? (mode === 'universal'
            ? `/universal/products?categories=${topCategoryIds.join(',')}&limit=20`
            : `/shop/${tenantSlug}/products?categories=${topCategoryIds.join(',')}&limit=20`)
        : (mode === 'universal'
            ? `/universal/products?limit=20`
            : `/shop/${tenantSlug}/products?limit=20`);
      
      try {
        const res = await api<{ items: Product[] }>(recommendedEndpoint);
        // Filter out already shown products
        const filtered = (res.items || []).filter(p => !shownProductIds.has(p.id));
        const recommended = filtered.slice(0, 8); // Show only 8 products
        setRecommendedProducts(recommended);
        
        // Add to shown IDs
        recommended.forEach(p => shownProductIds.add(p.id));
      } catch (e) {
        // Failed to load recommended products
      }

      // Load trending products (only products not already shown) - limit to 8
      const trendingEndpoint = mode === 'universal'
        ? `/universal/products?limit=20`
        : `/shop/${tenantSlug}/products?limit=20`;
      
      try {
        const res = await api<{ items: Product[] }>(trendingEndpoint);
        // Filter out all previously shown products
        const filtered = (res.items || []).filter(p => !shownProductIds.has(p.id));
        const trending = filtered.slice(0, 8); // Show only 8 products
        setTrendingProducts(trending);
        // Add to shown IDs
        trending.forEach(p => shownProductIds.add(p.id));
      } catch (e) {
        // Failed to load trending products
      }

    } finally {
      setLoading(false);
      
      // Notify parent of all shown product IDs
      if (onProductsShown) {
        onProductsShown(Array.from(shownProductIds));
      }
    }
  }

  function handleProductClick(productId: string) {
    if (mode === 'universal') {
      nav(`/universal/p/${productId}`);
    } else {
      nav(`/s/${tenantSlug}/p/${productId}`);
    }
  }

  function handleContinueSearch() {
    if (!lastSearch) return;
    const searchPath = mode === 'universal'
      ? `/universal/search?q=${encodeURIComponent(lastSearch)}`
      : `/s/${tenantSlug}/search?q=${encodeURIComponent(lastSearch)}`;
    nav(searchPath);
  }

  // If there's an error, silently fail (don't break the page)
  if (error) {
    return null;
  }

  // Don't show loading state, just return null while loading
  if (loading) {
    return null;
  }

  const hasAnyContent = recentProducts.length > 0 || recommendedProducts.length > 0 || trendingProducts.length > 0;

  if (!hasAnyContent) {
    return null;
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Recently Viewed */}
      {recentProducts.length > 0 && (
        <div style={sectionContainer}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>👁️ Recently Viewed</span>
            <span style={sectionCount}>{recentProducts.length} items</span>
          </div>
          {/* Outer scroll container */}
          <div style={scrollContainer}>
            {/* Inner flex row */}
            <div style={scrollContent}>
              {recentProducts.map(p => {
                // In universal mode, extract shop info from each product
                const productShopPhone = mode === 'universal' ? (p as any).tenant?.publicPhone : shopPhone;
                const productShopTelegram = mode === 'universal' ? (p as any).tenant?.publicTelegramLink : shopTelegram;
                const productShopName = mode === 'universal' ? (p as any).tenant?.name : undefined;
                
                return (
                <div
                  key={p.id}
                  onClick={(e) => {
                    if ((e as any).defaultPrevented) return;
                    handleProductClick(p.id);
                  }}
                  style={scrollItem}
                >
                  <ProductCard
                    p={p as any}
                    mode={mode}
                    image={p.photoUrl || undefined}
                    shopName={productShopName}
                    shopPhone={productShopPhone}
                    shopTelegram={productShopTelegram}
                    onAdd={onAdd}
                    onCall={productShopPhone ? () => {
                      const shopName = productShopName || "Shop";
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(productShopPhone).then(() => {
                          alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
                        }).catch(() => {
                          alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\nPlease copy this number to call the shop.`);
                        });
                      } else {
                        alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\nPlease copy this number to call the shop.`);
                      }
                    } : onCall}
                    onMessage={onMessage}
                  />
                </div>
              );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Based on Your Interests */}
      {recommendedProducts.length > 0 && (
        <div style={sectionContainer}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>✨ Based on Your Interests</span>
            <span style={sectionCount}>{recommendedProducts.length} items</span>
          </div>
          <div style={productGrid}>
            {recommendedProducts.map(p => {
              // In universal mode, extract shop info from each product
              const productShopPhone = mode === 'universal' ? (p as any).tenant?.publicPhone : shopPhone;
              const productShopTelegram = mode === 'universal' ? (p as any).tenant?.publicTelegramLink : shopTelegram;
              const productShopName = mode === 'universal' ? (p as any).tenant?.name : undefined;
              
              return (
              <div
                key={p.id}
                onClick={(e) => {
                  if ((e as any).defaultPrevented) return;
                  handleProductClick(p.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <ProductCard
                  p={p as any}
                  mode={mode}
                  image={p.photoUrl || undefined}
                  shopName={productShopName}
                  shopPhone={productShopPhone}
                  shopTelegram={productShopTelegram}
                  onAdd={onAdd}
                  onCall={productShopPhone ? () => {
                    const shopName = productShopName || "Shop";
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(productShopPhone).then(() => {
                        alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
                      }).catch(() => {
                        alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\nPlease copy this number to call the shop.`);
                      });
                    } else {
                      alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\nPlease copy this number to call the shop.`);
                    }
                  } : onCall}
                  onMessage={onMessage}
                />
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Trending/Popular */}
      {trendingProducts.length > 0 && (
        <div style={sectionContainer}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>🔥 Trending Now</span>
            <span style={sectionCount}>{trendingProducts.length} items</span>
          </div>
          <div style={productGrid}>
            {trendingProducts.map(p => {
              // In universal mode, extract shop info from each product
              const productShopPhone = mode === 'universal' ? (p as any).tenant?.publicPhone : shopPhone;
              const productShopTelegram = mode === 'universal' ? (p as any).tenant?.publicTelegramLink : shopTelegram;
              const productShopName = mode === 'universal' ? (p as any).tenant?.name : undefined;
              
              return (
              <div
                key={p.id}
                onClick={(e) => {
                  if ((e as any).defaultPrevented) return;
                  handleProductClick(p.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <ProductCard
                  p={p as any}
                  mode={mode}
                  image={p.photoUrl || undefined}
                  shopName={productShopName}
                  shopPhone={productShopPhone}
                  shopTelegram={productShopTelegram}
                  onAdd={onAdd}
                  onCall={productShopPhone ? () => {
                    const shopName = productShopName || "Shop";
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(productShopPhone).then(() => {
                        alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
                      }).catch(() => {
                        alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\nPlease copy this number to call the shop.`);
                      });
                    } else {
                      alert(`📞 ${shopName}\n\nPhone: ${productShopPhone}\n\nPlease copy this number to call the shop.`);
                    }
                  } : onCall}
                  onMessage={onMessage}
                />
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const sectionContainer: React.CSSProperties = {
  marginBottom: 24,
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  padding: '0 4px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#111',
};

const sectionCount: React.CSSProperties = {
  fontSize: 13,
  color: '#666',
};

const scrollContainer: React.CSSProperties = {
  overflowX: 'auto',
  paddingBottom: 4,
  WebkitOverflowScrolling: 'touch',
};

const scrollContent: React.CSSProperties = {
  display: 'flex',
  gap: 10,
};

const scrollItem: React.CSSProperties = {
  cursor: 'pointer',
  flex: '0 0 calc((100% - 20px) / 2.2)', // 2 full cards + 20% of third (accounting for gap)
  minWidth: 140,
  maxWidth: 180,
};

const productGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 12,
};

const continueSearchButton: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  color: '#374151',
  cursor: 'pointer',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
