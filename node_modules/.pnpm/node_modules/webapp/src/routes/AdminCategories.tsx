// Admin Categories Management
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import CategoryCascader from "../components/CategoryCascader";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageId: string | null;
  parentId: string | null;
  level: number;
  position: number;
  isActive: boolean;
  children?: Category[];
  _count?: {
    products: number;
  };
};

type CategoryRequest = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  requestedBy: string;
  tenantId: string;
  status: string;
  createdAt: string;
  tenant?: {
    name: string;
    slug: string;
  };
};

export default function AdminCategories() {
  const loc = useLocation();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showRequests, setShowRequests] = useState(true);
  
  // Get search query from URL
  const params = new URLSearchParams(loc.search || "");
  const searchQ = params.get("q") || "";
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formActive, setFormActive] = useState(true);
  
  // Request handling
  const [viewingRequestId, setViewingRequestId] = useState<string | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  
  // Request edit form
  const [reqEditName, setReqEditName] = useState("");
  const [reqEditDescription, setReqEditDescription] = useState("");
  const [reqEditIcon, setReqEditIcon] = useState("");
  const [reqEditParentId, setReqEditParentId] = useState<string | null>(null);
  
  // Filter categories and collect IDs to auto-expand
  const { filteredCategories, matchingIds } = React.useMemo(() => {
    if (!searchQ.trim()) return { filteredCategories: categories, matchingIds: new Set<string>() };
    
    const query = searchQ.toLowerCase();
    const matchingIds = new Set<string>();
    
    // Recursive filter that searches through all levels
    const filterRecursive = (cats: Category[], parentIds: string[] = []): Category[] => {
      return cats.filter(cat => {
        const matchesName = cat.name.toLowerCase().includes(query);
        const matchesSlug = cat.slug.toLowerCase().includes(query);
        const matches = matchesName || matchesSlug;
        
        // Check if any children match
        const filteredChildren = cat.children ? filterRecursive(cat.children, [...parentIds, cat.id]) : [];
        const hasMatchingChildren = filteredChildren.length > 0;
        
        // If this category or its children match, mark it and all ancestors for expansion
        if (matches || hasMatchingChildren) {
          matchingIds.add(cat.id);
          parentIds.forEach(pid => matchingIds.add(pid));
        }
        
        return matches || hasMatchingChildren;
      }).map(cat => ({
        ...cat,
        children: cat.children ? filterRecursive(cat.children, [...parentIds, cat.id]) : []
      }));
    };
    
    const filtered = filterRecursive(categories);
    return { filteredCategories: filtered, matchingIds };
  }, [categories, searchQ]);
  
  // Auto-expand matching categories when search changes
  React.useEffect(() => {
    if (searchQ.trim() && matchingIds.size > 0) {
      setExpandedIds(matchingIds);
    } else if (!searchQ.trim()) {
      setExpandedIds(new Set());
    }
  }, [searchQ, matchingIds]);


  // Remember this page for back navigation
  useEffect(() => {
    localStorage.setItem("tgshop:lastAdminPage", "/admin/categories");
  }, []);

  useEffect(() => {
    loadCategories();
    loadRequests();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await api<{ categories: Category[] }>("/admin/categories");
      setCategories(data.categories);
    } catch (e: any) {
      setError(e?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  async function loadRequests() {
    try {
      const data = await api<{ requests: CategoryRequest[] }>(
        "/admin/category-requests?status=pending"
      );
      setRequests(data.requests);
    } catch (e: any) {
      console.error("Failed to load requests:", e);
    }
  }

  function startEditRequest(req: CategoryRequest) {
    setEditingRequestId(req.id);
    setReqEditName(req.name);
    setReqEditDescription(req.description || "");
    setReqEditIcon(req.icon || "");
    setReqEditParentId(req.parentId);
    setViewingRequestId(null);
  }

  async function handleApproveRequest(requestId: string) {
    try {
      // If editing, use edited values
      if (editingRequestId === requestId) {
        await api(`/admin/category-requests/${requestId}/approve`, {
          method: "PATCH",
          body: JSON.stringify({
            name: reqEditName,
            description: reqEditDescription || null,
            icon: reqEditIcon || null,
            parentId: reqEditParentId,
          }),
        });
      } else {
        await api(`/admin/category-requests/${requestId}/approve`, {
          method: "PATCH",
        });
      }
      setEditingRequestId(null);
      setViewingRequestId(null);
      loadRequests();
      loadCategories();
    } catch (e: any) {
      alert(e?.message || "Failed to approve request");
    }
  }

  async function handleRejectRequest(requestId: string) {
    if (!rejectNote.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    
    try {
      await api(`/admin/category-requests/${requestId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ note: rejectNote }),
      });
      setRejectingId(null);
      setRejectNote("");
      setViewingRequestId(null);
      loadRequests();
    } catch (e: any) {
      alert(e?.message || "Failed to reject request");
    }
  }

  async function handleCreate() {
    if (!formName.trim()) {
      alert("Category name is required");
      return;
    }

    try {
      await api("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          icon: formIcon.trim() || null,
          parentId: formParentId || null,
          isActive: formActive,
        }),
      });
      
      resetForm();
      setShowCreate(false);
      loadCategories();
    } catch (e: any) {
      alert(e?.message || "Failed to create category");
    }
  }

  async function handleUpdate() {
    if (!editingId || !formName.trim()) {
      alert("Category name is required");
      return;
    }

    try {
      await api(`/admin/categories/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          icon: formIcon.trim() || null,
          parentId: formParentId || null,
          isActive: formActive,
        }),
      });
      
      resetForm();
      setEditingId(null);
      loadCategories();
    } catch (e: any) {
      alert(e?.message || "Failed to update category");
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This will also delete all subcategories.`
    );
    if (!confirmed) return;

    try {
      await api(`/admin/categories/${id}`, { method: "DELETE" });
      loadCategories();
    } catch (e: any) {
      alert(e?.message || "Failed to delete category");
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setFormName(category.name);
    setFormSlug(category.slug);
    setFormIcon(category.icon || "");
    setFormParentId(category.parentId || null);
    setFormActive(category.isActive);
    setShowCreate(false);
  }

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormIcon("");
    setFormParentId(null);
    setFormActive(true);
    setEditingId(null);
  }

  function toggleExpand(categoryId: string) {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }

  function renderEditForm() {
    return (
      <Card padding="md" style={{ marginBottom: 8, marginLeft: 20, background: "#f9f9f9" }}>
        <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>
          Edit Category
        </h3>
        
        <input
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Category name *"
          style={{
            width: "100%",
            padding: "8px 12px",
            marginBottom: 8,
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        
        <input
          value={formSlug}
          onChange={(e) => setFormSlug(e.target.value)}
          placeholder="Slug (optional, auto-generated)"
          style={{
            width: "100%",
            padding: "8px 12px",
            marginBottom: 8,
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        
        <input
          value={formIcon}
          onChange={(e) => setFormIcon(e.target.value)}
          placeholder="Icon emoji (e.g., 🚗)"
          style={{
            width: "100%",
            padding: "8px 12px",
            marginBottom: 8,
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        
        <div style={{ marginBottom: 8 }}>
          <CategoryCascader
            value={formParentId}
            onChange={(id) => setFormParentId(id)}
            placeholder="Select parent category (optional)"
          />
        </div>
        
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>Active</span>
        </label>
        
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="primary"
            onClick={handleUpdate}
          >
            Update
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetForm();
            }}
          >
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  function renderCategory(category: Category, depth: number = 0) {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isEditing = editingId === category.id;
    const indent = depth * 20;
    
    return (
      <div key={category.id}>
        <Card 
          padding="sm" 
          style={{ marginBottom: 8 }}
          hover={hasChildren}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: indent }}>
            {/* Expand/Collapse button */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category.id)}
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            ) : (
              <div style={{ width: 24 }} />
            )}
            
            {category.icon && (
              <span style={{ fontSize: 20 }}>{category.icon}</span>
            )}
            
            <div 
              style={{ flex: 1, cursor: hasChildren ? "pointer" : "default" }}
              onClick={() => hasChildren && toggleExpand(category.id)}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {category.name}
                {!category.isActive && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#999" }}>
                    (Inactive)
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {category._count?.products || 0} products
                {hasChildren && ` • ${category.children?.length} subcategories`}
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEdit(category);
              }}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                border: "1px solid #ddd",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(category.id, category.name);
              }}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                border: "1px solid #f44336",
                borderRadius: 6,
                background: "#fff",
                color: "#f44336",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </Card>
        
        {/* Show edit form inline if this category is being edited */}
        {isEditing && renderEditForm()}
        
        {/* Show children only if expanded */}
        {isExpanded && category.children?.map((child) => renderCategory(child, depth + 1))}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading categories...
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Manage Categories</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          {categories.length} categories
        </p>
      </div>
      


      {error && (
        <Card padding="md" style={{ marginBottom: 16, background: "#fee" }}>
          <div style={{ color: "#c00" }}>{error}</div>
        </Card>
      )}

      {/* Pending Category Requests */}
      {requests.length > 0 && (
        <Card padding="md" style={{ marginBottom: 16, background: "#fff3cd" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              Pending Requests ({requests.length})
            </h3>
            <button
              onClick={() => setShowRequests(!showRequests)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {showRequests ? "Hide" : "Show"}
            </button>
          </div>

          {showRequests && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {requests.map((req) => {
                const isViewing = viewingRequestId === req.id;
                const isEditing = editingRequestId === req.id;
                const isRejecting = rejectingId === req.id;
                
                return (
                  <Card key={req.id} padding="md" style={{ background: "#fff", border: "2px solid #e0e0e0" }}>
                    {/* Compact View */}
                    {!isViewing && !isEditing && !isRejecting && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {req.icon && (
                          <div style={{ 
                            fontSize: 32, 
                            width: 48, 
                            height: 48, 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            background: "#f5f5f5",
                            borderRadius: 8
                          }}>
                            {req.icon}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                            {req.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            From: <strong>{req.tenant?.name || "Unknown Shop"}</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => setViewingRequestId(req.id)}
                          style={{
                            padding: "6px 16px",
                            fontSize: 13,
                            border: "1px solid #2563eb",
                            borderRadius: 6,
                            background: "#fff",
                            color: "#2563eb",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    )}

                    {/* Detailed View */}
                    {isViewing && !isEditing && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                          <h4 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Request Details</h4>
                          <button
                            onClick={() => setViewingRequestId(null)}
                            style={{
                              border: "none",
                              background: "transparent",
                              fontSize: 20,
                              cursor: "pointer",
                              color: "#666",
                            }}
                          >
                            ×
                          </button>
                        </div>

                        <div style={{ display: "grid", gap: 16 }}>
                          {/* Icon */}
                          {req.icon && (
                            <div>
                              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Icon</div>
                              <div style={{ 
                                fontSize: 48, 
                                width: 80, 
                                height: 80, 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                background: "#f5f5f5",
                                borderRadius: 12
                              }}>
                                {req.icon}
                              </div>
                            </div>
                          )}

                          {/* Name */}
                          <div>
                            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Category Name</div>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>{req.name}</div>
                          </div>

                          {/* Description */}
                          {req.description && (
                            <div>
                              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Description</div>
                              <div style={{ fontSize: 14, lineHeight: 1.5 }}>{req.description}</div>
                            </div>
                          )}

                          {/* Parent Category */}
                          <div>
                            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Parent Category</div>
                            <div style={{ fontSize: 14 }}>
                              {req.parentId ? (
                                categories.find(c => c.id === req.parentId)?.name || "Unknown"
                              ) : (
                                <span style={{ color: "#999" }}>Top Level Category</span>
                              )}
                            </div>
                          </div>

                          {/* Shop Info */}
                          <div>
                            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Requested By</div>
                            <div style={{ fontSize: 14 }}>
                              <strong>{req.tenant?.name || "Unknown Shop"}</strong>
                              {req.tenant?.slug && (
                                <span style={{ color: "#666", marginLeft: 8 }}>(@{req.tenant.slug})</span>
                              )}
                            </div>
                          </div>

                          {/* Date */}
                          <div>
                            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Requested On</div>
                            <div style={{ fontSize: 14 }}>
                              {new Date(req.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e0e0e0" }}>
                          <button
                            onClick={() => startEditRequest(req)}
                            style={{
                              padding: "8px 16px",
                              fontSize: 14,
                              border: "1px solid #2563eb",
                              borderRadius: 6,
                              background: "#fff",
                              color: "#2563eb",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            ✏️ Edit Before Approve
                          </button>
                          <button
                            onClick={() => handleApproveRequest(req.id)}
                            style={{
                              padding: "8px 16px",
                              fontSize: 14,
                              border: "1px solid #4caf50",
                              borderRadius: 6,
                              background: "#4caf50",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            ✓ Approve As-Is
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(req.id);
                              setViewingRequestId(null);
                            }}
                            style={{
                              padding: "8px 16px",
                              fontSize: 14,
                              border: "1px solid #f44336",
                              borderRadius: 6,
                              background: "#fff",
                              color: "#f44336",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Mode */}
                    {isEditing && (
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Edit Category Request</h4>
                        
                        <input
                          value={reqEditName}
                          onChange={(e) => setReqEditName(e.target.value)}
                          placeholder="Category name *"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            marginBottom: 8,
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            fontSize: 14,
                          }}
                        />
                        
                        <textarea
                          value={reqEditDescription}
                          onChange={(e) => setReqEditDescription(e.target.value)}
                          placeholder="Description (optional)"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            marginBottom: 8,
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            fontSize: 14,
                            minHeight: 60,
                            resize: "vertical",
                          }}
                        />
                        
                        <input
                          value={reqEditIcon}
                          onChange={(e) => setReqEditIcon(e.target.value)}
                          placeholder="Icon emoji (e.g., 🚗)"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            marginBottom: 8,
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            fontSize: 14,
                          }}
                        />
                        
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 13, color: "#666", marginBottom: 4, display: "block" }}>
                            Parent Category
                          </label>
                          <CategoryCascader
                            value={reqEditParentId}
                            onChange={(id) => setReqEditParentId(id)}
                            placeholder="Select parent category"
                          />
                        </div>
                        
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleApproveRequest(req.id)}
                            style={{
                              padding: "8px 16px",
                              fontSize: 14,
                              border: "1px solid #4caf50",
                              borderRadius: 6,
                              background: "#4caf50",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Approve with Changes
                          </button>
                          <button
                            onClick={() => {
                              setEditingRequestId(null);
                              setViewingRequestId(req.id);
                            }}
                            style={{
                              padding: "8px 16px",
                              fontSize: 14,
                              border: "1px solid #ddd",
                              borderRadius: 6,
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reject Mode */}
                    {isRejecting && (
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#f44336" }}>
                          Reject Category Request
                        </h4>
                        
                        <div style={{ marginBottom: 12, padding: 12, background: "#fff3cd", borderRadius: 6 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{req.name}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            From: {req.tenant?.name || "Unknown Shop"}
                          </div>
                        </div>
                        
                        <textarea
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Please provide a reason for rejection (required) *"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            marginBottom: 12,
                            border: "1px solid #f44336",
                            borderRadius: 6,
                            fontSize: 14,
                            minHeight: 80,
                            resize: "vertical",
                          }}
                        />
                        
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            style={{
                              padding: "8px 16px",
                              fontSize: 14,
                              border: "1px solid #f44336",
                              borderRadius: 6,
                              background: "#f44336",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Confirm Rejection
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectNote("");
                              setViewingRequestId(req.id);
                            }}
                            style={{
                              padding: "8px 16px",
                              fontSize: 14,
                              border: "1px solid #ddd",
                              borderRadius: 6,
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Add Category Button */}
      {!showCreate && !editingId && (
        <Button
          variant="primary"
          onClick={() => setShowCreate(true)}
          style={{ marginBottom: 16 }}
        >
          + Add Category
        </Button>
      )}

      {/* Create Form - Shown at top when adding new category */}
      {showCreate && (
        <Card padding="md" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>
            Create Category
          </h3>
          
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Category name *"
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          
          <input
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            placeholder="Slug (optional, auto-generated)"
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          
          <input
            value={formIcon}
            onChange={(e) => setFormIcon(e.target.value)}
            placeholder="Icon emoji (e.g., 🚗)"
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          
          <div style={{ marginBottom: 8 }}>
            <CategoryCascader
              value={formParentId}
              onChange={(id) => setFormParentId(id)}
              placeholder="Select parent category (optional)"
            />
          </div>
          
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Active</span>
          </label>
          
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="primary"
              onClick={handleCreate}
            >
              Create
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                resetForm();
                setShowCreate(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Categories List */}
      <div>
        {filteredCategories.map((category) => renderCategory(category))}
        
        {filteredCategories.length === 0 && searchQ && (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "#666" }}>
              No categories found matching "{searchQ}"
            </div>
          </Card>
        )}
        
        {categories.length === 0 && !searchQ && (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "#666" }}>
              No categories yet. Create one to get started!
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
