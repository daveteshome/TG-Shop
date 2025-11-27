// Browsing history tracker for personalized recommendations

type ViewedProduct = {
  id: string;
  title: string;
  categoryId?: string | null;
  viewedAt: number;
};

type SearchQuery = {
  query: string;
  searchedAt: number;
};

type CategoryView = {
  categoryId: string;
  viewCount: number;
  lastViewedAt: number;
};

const MAX_RECENT_PRODUCTS = 20;
const MAX_SEARCH_HISTORY = 10;
const MAX_CATEGORY_TRACKING = 50;

// Track product view
export function trackProductView(product: { id: string; title: string; categoryId?: string | null }) {
  try {
    const history = getRecentlyViewed();
    const newView: ViewedProduct = {
      id: product.id,
      title: product.title,
      categoryId: product.categoryId,
      viewedAt: Date.now(),
    };
    
    // Remove if already exists
    const filtered = history.filter(p => p.id !== product.id);
    
    // Add to front
    const updated = [newView, ...filtered].slice(0, MAX_RECENT_PRODUCTS);
    
    localStorage.setItem('tgshop:recentlyViewed', JSON.stringify(updated));
    
    // Track category if exists
    if (product.categoryId) {
      trackCategoryView(product.categoryId);
    }
  } catch (e) {
    console.error('Failed to track product view:', e);
  }
}

// Get recently viewed products
export function getRecentlyViewed(): ViewedProduct[] {
  try {
    const data = localStorage.getItem('tgshop:recentlyViewed');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Track search query
export function trackSearch(query: string) {
  if (!query.trim()) return;
  
  try {
    const history = getSearchHistory();
    const newSearch: SearchQuery = {
      query: query.trim(),
      searchedAt: Date.now(),
    };
    
    // Remove if already exists
    const filtered = history.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    
    // Add to front
    const updated = [newSearch, ...filtered].slice(0, MAX_SEARCH_HISTORY);
    
    localStorage.setItem('tgshop:searchHistory', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to track search:', e);
  }
}

// Get search history
export function getSearchHistory(): SearchQuery[] {
  try {
    const data = localStorage.getItem('tgshop:searchHistory');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Get last search query
export function getLastSearch(): string | null {
  const history = getSearchHistory();
  return history[0]?.query || null;
}

// Track category view
function trackCategoryView(categoryId: string) {
  try {
    const categories = getCategoryViews();
    const existing = categories.find(c => c.categoryId === categoryId);
    
    if (existing) {
      existing.viewCount++;
      existing.lastViewedAt = Date.now();
    } else {
      categories.push({
        categoryId,
        viewCount: 1,
        lastViewedAt: Date.now(),
      });
    }
    
    // Sort by view count and keep top categories
    const sorted = categories
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, MAX_CATEGORY_TRACKING);
    
    localStorage.setItem('tgshop:categoryViews', JSON.stringify(sorted));
  } catch (e) {
    console.error('Failed to track category view:', e);
  }
}

// Get category views
function getCategoryViews(): CategoryView[] {
  try {
    const data = localStorage.getItem('tgshop:categoryViews');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Get top categories by view count
export function getTopCategories(limit = 5): string[] {
  const categories = getCategoryViews();
  return categories
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit)
    .map(c => c.categoryId);
}

// Clear recently viewed products
export function clearRecentlyViewed() {
  localStorage.removeItem('tgshop:recentlyViewed');
}

// Clear search history
export function clearSearchHistory() {
  localStorage.removeItem('tgshop:searchHistory');
}

// Clear all history
export function clearBrowsingHistory() {
  localStorage.removeItem('tgshop:recentlyViewed');
  localStorage.removeItem('tgshop:searchHistory');
  localStorage.removeItem('tgshop:categoryViews');
}
