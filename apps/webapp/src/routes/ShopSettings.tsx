// apps/webapp/src/routes/ShopSettings.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getUserRole } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";
import type { ShopRole } from "../lib/permissions";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  publicPhone?: string | null;
  description?: string | null;
  logoImageId?: string | null;   // stored ID
  logoWebUrl?: string | null;    // resolved server URL
  publishUniversal?: boolean;
  publicTelegramLink?: string | null; 
};

export default function ShopSettings() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+251 ");
  const [shopType, setShopType] = useState("");
  const [description, setDescription] = useState("");
  const [publish, setPublish] = useState(false);
  const [telegram, setTelegram] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [twitter, setTwitter] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [returnPolicyPreset, setReturnPolicyPreset] = useState("custom");
  const [deliveryRegions, setDeliveryRegions] = useState<string[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "delivery" | "both" | null>(null);
  const [shopAddresses, setShopAddresses] = useState<string[]>([""]);
  
  // Payment settings
  const [paymentMethods, setPaymentMethods] = useState<"cod" | "prepay" | "both" | null>(null);
  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: string;
    bank: string;
    accountName: string;
    accountNumber: string;
    phoneNumber?: string;
  }>>([]);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoImageId, setLogoImageId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [showSocialMedia, setShowSocialMedia] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  
  const [userRole, setUserRole] = useState<ShopRole | null>(null);
  const [confirmShopName, setConfirmShopName] = useState("");

  // Ethiopian regions
  const ETHIOPIAN_REGIONS = [
    "Addis Ababa",
    "Dire Dawa",
    "Tigray",
    "Afar",
    "Amhara",
    "Oromia",
    "Somali",
    "Benishangul-Gumuz",
    "Debube NNPR",
    "Sidama",
    "South West Ethiopia Peoples' Region",
    "Central Ethiopia Region",
    "South Ethiopia Region",
    "Harari Region",
  ];

  const initData = getInitDataRaw();

  // ---------------- Load user role ----------------
  useEffect(() => {
    if (slug) {
      getUserRole(slug).then((role) => setUserRole(role as ShopRole | null));
    }
  }, [slug]);

  // ---------------- Load shop info ----------------
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const data = await api<TenantInfo>(`/shop/${slug}`);
        setTenant(data);
        setName(data.name);
        setPhone(data.publicPhone || "+251 ");
        setShopType((data as any).shopType || "");
        setDescription(data.description || "");
        setPublish(!!data.publishUniversal);
        setLogoImageId(data.logoImageId || null);
        setLogoPreview(data.logoWebUrl || null);
        setTelegram(data.publicTelegramLink || "");
        setInstagram((data as any).instagramUrl || "");
        setFacebook((data as any).facebookUrl || "");
        setTwitter((data as any).twitterUrl || "");
        setReturnPolicy((data as any).returnPolicy || "");
        
        // Parse delivery regions from shippingInfo
        const shippingData = (data as any).shippingInfo || "";
        if (shippingData) {
          const regions = shippingData.split(",").map((r: string) => r.trim()).filter((r: string) => r);
          setDeliveryRegions(regions);
        }
        
        setDeliveryMode((data as any).deliveryMode || null);
        
        // Parse shop addresses from location field
        const locationData = (data as any).location || "";
        if (locationData) {
          const addresses = locationData.split(" | ").filter((a: string) => a.trim());
          setShopAddresses(addresses.length > 0 ? addresses : [""]);
        }
        
        // Load payment settings
        setPaymentMethods((data as any).paymentMethods || null);
        const accounts = (data as any).bankAccounts || [];
        setBankAccounts(Array.isArray(accounts) ? accounts : []);

        window.dispatchEvent(
          new CustomEvent("tgshop:set-shop-context", {
            detail: { slug, name: data.name, logoUrl: data.logoWebUrl || null },
          })
        );
      } catch (e: any) {
        console.error(e);
        setErr("Failed to load shop info");
      }
    })();
  }, [slug]);

  // ---------------- Leave Shop ----------------
  async function handleLeaveShop() {
    const confirmed = window.confirm(
      "Are you sure you want to leave this shop? You will lose access to all shop features and data."
    );
    if (!confirmed) return;

    try {
      await api(`/shop/${slug}/membership`, {
        method: "DELETE",
      });
      
      alert("You have left the shop successfully.");
      nav("/shops");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to leave shop.");
    }
  }

  // ---------------- Delete Shop ----------------
  async function handleDeleteShop() {
    const confirmed = window.confirm(
      "⚠️ FINAL WARNING: This will delete your shop and all its data. The shop will be hidden immediately but can be restored within 30 days. After 30 days, all data will be permanently deleted. Are you absolutely sure?"
    );
    if (!confirmed) return;

    try {
      await api(`/shop/${slug}`, {
        method: "DELETE",
      });
      
      alert("Shop has been deleted. You have 30 days to restore it if needed.");
      nav("/shops");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to delete shop.");
    }
  }

  // ---------------- Save changes ----------------
  async function handleSave() {
    if (!slug) return;

    // Validation
    if (!name.trim()) {
      alert("Shop name is required");
      return;
    }

    if (!phone.trim()) {
      alert("Phone number is required");
      return;
    }

    // Validate Ethiopian phone number format
    const phoneRegex = /^\+251\s?[79]\d{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      alert("Please enter a valid Ethiopian phone number (e.g., +251 912 345 678)");
      return;
    }

    if (!returnPolicy.trim()) {
      alert("Return policy is required. Please select a preset or write your own.");
      return;
    }

    // Validate delivery mode requirements
    if (deliveryMode === "pickup" || deliveryMode === "both") {
      const validAddresses = shopAddresses.filter(a => a.trim());
      if (validAddresses.length === 0) {
        alert("Please add at least one shop address for pickup");
        return;
      }
    }

    if (deliveryMode === "delivery" || deliveryMode === "both") {
      if (deliveryRegions.length === 0) {
        alert("Please select at least one delivery region");
        return;
      }
    }
    
    // Validate payment settings
    if (paymentMethods === "prepay" || paymentMethods === "both") {
      if (bankAccounts.length === 0) {
        alert("Please add at least one bank account for prepayment");
        return;
      }
      // Validate each bank account
      for (const account of bankAccounts) {
        if (!account.bank || !account.accountName || !account.accountNumber) {
          alert("Please fill in all bank account details");
          return;
        }
      }
    }

    setSaving(true);

    try {
      let finalImageId = logoImageId;

      // If a new logo file chosen → upload it
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const uploadRes = await fetch(`/api/shop/${slug}/uploads/image`, {
          method: "POST",
          headers: initData ? { Authorization: `tma ${initData}` } : undefined,
          body: fd, // FormData with fd.append("file", logoFile)
        });

        if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      console.error("Upload failed", uploadRes.status, text);
      alert(`Upload failed ${uploadRes.status}`);
      return;
}
        const { imageId, webUrl } = await uploadRes.json();
        finalImageId = imageId;         // <-- IMPORTANT: use the freshly uploaded id in the PATCH
        setLogoImageId(imageId);        // keep state in sync
        setLogoPreview(webUrl || null); // instant preview

      }

      // Persist tenant updates
      await api(`/shop/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          publicPhone: phone.trim() || null,
          shopType: shopType.trim() || null,
          description: description.trim() || null,
          publishUniversal: publish,
          logoImageId: finalImageId,
          publicTelegramLink: telegram.trim() || null,
          instagramUrl: instagram.trim() || null,
          facebookUrl: facebook.trim() || null,
          twitterUrl: twitter.trim() || null,
          returnPolicy: returnPolicy.trim() || null,
          shippingInfo: deliveryRegions.join(", ") || null,
          deliveryMode: deliveryMode,
          location: shopAddresses.filter(a => a.trim()).join(" | ") || null,
          paymentMethods: paymentMethods,
          bankAccounts: bankAccounts,
        }),
        headers: { "Content-Type": "application/json" },
      });

      // Re-fetch to stay synced with server
      const refreshed = await api<TenantInfo>(`/shop/${slug}`);
      setTenant(refreshed);
      setName(refreshed.name);
      setPhone(refreshed.publicPhone || "+251 ");
      setShopType((refreshed as any).shopType || "");
      setDescription(refreshed.description || "");
      setPublish(!!refreshed.publishUniversal);
      setLogoImageId(refreshed.logoImageId || null);
      setLogoPreview(refreshed.logoWebUrl || null);
      setTelegram(refreshed.publicTelegramLink || "");
      setInstagram((refreshed as any).instagramUrl || "");
      setFacebook((refreshed as any).facebookUrl || "");
      setTwitter((refreshed as any).twitterUrl || "");
      setReturnPolicy((refreshed as any).returnPolicy || "");
      
      // Parse delivery regions from shippingInfo
      const refreshedShippingData = (refreshed as any).shippingInfo || "";
      if (refreshedShippingData) {
        const regions = refreshedShippingData.split(",").map((r: string) => r.trim()).filter((r: string) => r);
        setDeliveryRegions(regions);
      } else {
        setDeliveryRegions([]);
      }
      
      setDeliveryMode((refreshed as any).deliveryMode || null);
      
      const locationData = (refreshed as any).location || "";
      if (locationData) {
        const addresses = locationData.split(" | ").filter((a: string) => a.trim());
        setShopAddresses(addresses.length > 0 ? addresses : [""]);
      }
      
      // Reload payment settings
      setPaymentMethods((refreshed as any).paymentMethods || null);
      const refreshedAccounts = (refreshed as any).bankAccounts || [];
      setBankAccounts(Array.isArray(refreshedAccounts) ? refreshedAccounts : []);
      
      setDirty(false);

      window.dispatchEvent(
        new CustomEvent("tgshop:set-shop-context", {
          detail: { slug, name: refreshed.name, logoUrl: refreshed.logoWebUrl || null },
        })
      );
      window.dispatchEvent(
        new CustomEvent("tgshop:update-logo", {
          detail: { url: refreshed.logoWebUrl || null },
        })
      );

      alert("Saved successfully!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ---------------- UI ----------------
  if (err) return <div style={{ padding: 16, color: "crimson" }}>{err}</div>;
  if (!tenant) return <div style={{ padding: 16 }}>Loading shop info…</div>;

  // HELPER role - Show only Leave Shop option
  if (userRole === "HELPER") {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, marginBottom: 20 }}>Shop Settings</h2>
        
        <div style={{
          padding: 20,
          background: '#FFF7ED',
          border: '1px solid #FDBA74',
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, color: '#9A3412', marginBottom: 8 }}>
            ℹ️ You don't have permission to modify shop settings.
          </div>
          <div style={{ fontSize: 13, color: '#9A3412', lineHeight: 1.5 }}>
            Only the shop owner and managers can change settings. As a sales staff member, you can view products and process orders.
          </div>
        </div>

        {/* Leave Shop Section */}
        <div style={{
          padding: 20,
          background: '#FEF2F2',
          border: '2px solid #FCA5A5',
          borderRadius: 12,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#991B1B', marginBottom: 12 }}>
            🚪 Leave Shop
          </div>
          <div style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 12, lineHeight: 1.5 }}>
            You can leave this shop at any time. You'll lose access to all shop features and data. You can rejoin if invited again.
          </div>
          <button
            onClick={handleLeaveShop}
            style={{
              background: '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🚪 Leave Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18, marginBottom: 20 }}>Shop Settings</h2>

      <label style={lblBold}>Shop Name</label>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setDirty(true);
        }}
        placeholder="My Awesome Shop"
        style={input}
      />

      <label style={lblBold}>Shop Type</label>
      <select
        value={shopType}
        onChange={(e) => {
          setShopType(e.target.value);
          setDirty(true);
        }}
        style={input}
      >
        <option value="">Select shop type...</option>
        <option value="Electronics & Gadgets">📱 Electronics & Gadgets</option>
        <option value="Clothing & Fashion">👕 Clothing & Fashion</option>
        <option value="Food & Beverage">🍕 Food & Beverage</option>
        <option value="Home & Furniture">🛋️ Home & Furniture</option>
        <option value="Beauty & Personal Care">💄 Beauty & Personal Care</option>
        <option value="Books & Stationery">📚 Books & Stationery</option>
        <option value="Sports & Fitness">⚽ Sports & Fitness</option>
        <option value="Automotive">🚗 Automotive</option>
        <option value="Services">🔧 Services</option>
        <option value="Grocery & Supermarket">🛒 Grocery & Supermarket</option>
        <option value="Pharmacy & Health">💊 Pharmacy & Health</option>
        <option value="Toys & Kids">🧸 Toys & Kids</option>
        <option value="Jewelry & Accessories">💍 Jewelry & Accessories</option>
        <option value="Pet Supplies">🐾 Pet Supplies</option>
        <option value="Other">📦 Other</option>
      </select>

      <label style={lblBold}>Phone Number</label>
      <input
        value={phone}
        onChange={(e) => {
          let val = e.target.value;
          // Ensure +251 prefix is always present
          if (!val.startsWith("+251")) {
            val = "+251 " + val.replace(/^\+251\s?/, "");
          }
          setPhone(val);
          setDirty(true);
        }}
        placeholder="+251 912 345 678"
        style={input}
      />

      <label style={lblBold}>Telegram Contact</label>
      <input
        value={telegram}
        onChange={(e) => {
          setTelegram(e.target.value);
          setDirty(true);
        }}
        placeholder="@myshop or https://t.me/myshop"
        style={input}
      />
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>
        If empty, we’ll try to use your personal Telegram username (if available).
      </div>

      {/* Social Media Section */}
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setShowSocialMedia(!showSocialMedia)}
          style={{
            ...lbl,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
          }}
        >
          <span>{showSocialMedia ? '▼' : '▶'}</span>
          <span>Social Media Links (Optional)</span>
        </button>
        
        {showSocialMedia && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ ...lbl, fontSize: 13 }}>Instagram</label>
              <input
                value={instagram}
                onChange={(e) => {
                  setInstagram(e.target.value);
                  setDirty(true);
                }}
                placeholder="@yourshop or https://instagram.com/yourshop"
                style={input}
              />
            </div>

            <div>
              <label style={{ ...lbl, fontSize: 13 }}>Facebook</label>
              <input
                value={facebook}
                onChange={(e) => {
                  setFacebook(e.target.value);
                  setDirty(true);
                }}
                placeholder="https://facebook.com/yourshop"
                style={input}
              />
            </div>

            <div>
              <label style={{ ...lbl, fontSize: 13 }}>Twitter / X</label>
              <input
                value={twitter}
                onChange={(e) => {
                  setTwitter(e.target.value);
                  setDirty(true);
                }}
                placeholder="@yourshop or https://twitter.com/yourshop"
                style={input}
              />
            </div>
          </div>
        )}
      </div>

      <label style={lblBold}>Shop Description</label>
      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          setDirty(true);
        }}
        placeholder="Tell customers about your shop..."
        style={{ ...input, minHeight: 80 }}
      />

      {/* Return Policy */}
      <label style={lblBold}>Return Policy</label>
      <select
        value={returnPolicyPreset}
        onChange={(e) => {
          const preset = e.target.value;
          setReturnPolicyPreset(preset);
          if (preset === "no-return") {
            setReturnPolicy("All sales are final. No returns or exchanges accepted.");
          } else if (preset === "7-days") {
            setReturnPolicy("Returns accepted within 7 days of purchase. Items must be unused, in original packaging, with receipt. Refund will be processed within 3-5 business days.");
          } else if (preset === "check-before") {
            setReturnPolicy("Please inspect items carefully before purchase. No returns or exchanges after leaving the store.");
          } else if (preset === "defective-only") {
            setReturnPolicy("Returns accepted only for defective or damaged items within 3 days of purchase. Please contact us immediately if you receive a defective product.");
          } else if (preset === "custom") {
            setReturnPolicy("");
          }
          setDirty(true);
        }}
        style={input}
      >
        <option value="no-return">No returns - All sales final</option>
        <option value="7-days">7-day return policy</option>
        <option value="check-before">Check before purchase - No returns</option>
        <option value="defective-only">Defective items only</option>
        <option value="custom">Custom (write your own)</option>
      </select>
      
      {returnPolicyPreset === "custom" && (
        <textarea
          value={returnPolicy}
          onChange={(e) => {
            setReturnPolicy(e.target.value);
            setDirty(true);
          }}
          placeholder="Write your custom return policy..."
          style={{ ...input, minHeight: 70, marginTop: 8 }}
        />
      )}

      {/* Delivery Options */}
      <label style={lblBold}>How do customers receive their orders?</label>
      <div style={{ 
        display: 'flex', 
        gap: 10, 
        marginBottom: 16,
        padding: 12,
        background: '#f9f9f9',
        borderRadius: 10,
      }}>
        <label style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          padding: '12px 12px',
          borderRadius: 8,
          border: deliveryMode === "pickup" ? '2px solid #4CAF50' : '1px solid #ddd',
          background: deliveryMode === "pickup" ? '#E8F5E9' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: deliveryMode === "pickup" ? 600 : 400,
        }}>
          <input
            type="radio"
            checked={deliveryMode === "pickup"}
            onChange={() => {
              setDeliveryMode("pickup");
              setDirty(true);
            }}
            style={{ cursor: 'pointer' }}
          />
          🏪 Pickup
        </label>
        <label style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          padding: '12px 12px',
          borderRadius: 8,
          border: deliveryMode === "delivery" ? '2px solid #2196F3' : '1px solid #ddd',
          background: deliveryMode === "delivery" ? '#E3F2FD' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: deliveryMode === "delivery" ? 600 : 400,
        }}>
          <input
            type="radio"
            checked={deliveryMode === "delivery"}
            onChange={() => {
              setDeliveryMode("delivery");
              setDirty(true);
            }}
            style={{ cursor: 'pointer' }}
          />
          🚚 Delivery
        </label>
        <label style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          padding: '12px 12px',
          borderRadius: 8,
          border: deliveryMode === "both" ? '2px solid #FF9800' : '1px solid #ddd',
          background: deliveryMode === "both" ? '#FFF3E0' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: deliveryMode === "both" ? 600 : 400,
        }}>
          <input
            type="radio"
            checked={deliveryMode === "both"}
            onChange={() => {
              setDeliveryMode("both");
              setDirty(true);
            }}
            style={{ cursor: 'pointer' }}
          />
          ✨ Both
        </label>
      </div>

      {/* Shop Addresses (if pickup or both) */}
      {(deliveryMode === "pickup" || deliveryMode === "both") && (
        <div style={{ 
          marginBottom: 16,
          padding: 16,
          background: '#f9fdf9',
          borderRadius: 10,
          border: '1px solid #e0f2e0',
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#2e7d32' }}>
            📍 Shop Address(es)
          </div>
          {shopAddresses.map((addr, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={addr}
                onChange={(e) => {
                  const newAddrs = [...shopAddresses];
                  newAddrs[idx] = e.target.value;
                  setShopAddresses(newAddrs);
                  setDirty(true);
                }}
                placeholder={`Address ${idx + 1}: Street, City, Area...`}
                style={{ ...input, flex: 1 }}
              />
              {shopAddresses.length > 1 && (
                <button
                  onClick={() => {
                    setShopAddresses(shopAddresses.filter((_, i) => i !== idx));
                    setDirty(true);
                  }}
                  style={{ 
                    ...btnSecondary, 
                    padding: '6px 12px',
                    background: '#ffebee',
                    border: '1px solid #ffcdd2',
                    color: '#c62828',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              setShopAddresses([...shopAddresses, ""]);
              setDirty(true);
            }}
            style={{ 
              ...btnSecondary, 
              fontSize: 13,
              background: '#e8f5e9',
              border: '1px solid #a5d6a7',
              color: '#2e7d32',
              fontWeight: 500,
            }}
          >
            + Add Another Address
          </button>
        </div>
      )}

      {/* Delivery Areas (if delivery or both) */}
      {(deliveryMode === "delivery" || deliveryMode === "both") && (
        <div style={{ 
          marginBottom: 16,
          padding: 16,
          background: '#f9fcff',
          borderRadius: 10,
          border: '1px solid #e0f0ff',
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1565c0' }}>
            🗺️ Delivery Regions
          </div>
          
          {/* Select All / Deselect All */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setDeliveryRegions([...ETHIOPIAN_REGIONS]);
                setDirty(true);
              }}
              style={{
                ...btnSecondary,
                fontSize: 12,
                padding: '6px 12px',
                background: '#e3f2fd',
                border: '1px solid #90caf9',
                color: '#1565c0',
              }}
            >
              ✓ Select All
            </button>
            <button
              type="button"
              onClick={() => {
                setDeliveryRegions([]);
                setDirty(true);
              }}
              style={{
                ...btnSecondary,
                fontSize: 12,
                padding: '6px 12px',
              }}
            >
              Clear All
            </button>
          </div>

          {/* Region checkboxes */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
          }}>
            {ETHIOPIAN_REGIONS.map((region) => (
              <label
                key={region}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: deliveryRegions.includes(region) ? '2px solid #2196F3' : '1px solid #e0e0e0',
                  background: deliveryRegions.includes(region) ? '#E3F2FD' : '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={deliveryRegions.includes(region)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDeliveryRegions([...deliveryRegions, region]);
                    } else {
                      setDeliveryRegions(deliveryRegions.filter(r => r !== region));
                    }
                    setDirty(true);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontWeight: deliveryRegions.includes(region) ? 600 : 400 }}>
                  {region}
                </span>
              </label>
            ))}
          </div>
          
          <div style={{ fontSize: 11, color: '#666', marginTop: 10 }}>
            Selected: {deliveryRegions.length === ETHIOPIAN_REGIONS.length 
              ? 'All regions' 
              : deliveryRegions.length === 0 
                ? 'None' 
                : `${deliveryRegions.length} region${deliveryRegions.length > 1 ? 's' : ''}`}
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <label style={lblBold}>💳 Payment Methods</label>
      <div style={{ 
        display: 'flex', 
        gap: 10, 
        marginBottom: 16,
        padding: 12,
        background: '#f9f9f9',
        borderRadius: 10,
      }}>
        <label style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          padding: '12px 12px',
          borderRadius: 8,
          border: paymentMethods === "cod" ? '2px solid #4CAF50' : '1px solid #ddd',
          background: paymentMethods === "cod" ? '#E8F5E9' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: paymentMethods === "cod" ? 600 : 400,
        }}>
          <input
            type="radio"
            checked={paymentMethods === "cod"}
            onChange={() => {
              setPaymentMethods("cod");
              setDirty(true);
            }}
            style={{ cursor: 'pointer' }}
          />
          💵 Cash on Delivery
        </label>
        <label style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          padding: '12px 12px',
          borderRadius: 8,
          border: paymentMethods === "prepay" ? '2px solid #2196F3' : '1px solid #ddd',
          background: paymentMethods === "prepay" ? '#E3F2FD' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: paymentMethods === "prepay" ? 600 : 400,
        }}>
          <input
            type="radio"
            checked={paymentMethods === "prepay"}
            onChange={() => {
              setPaymentMethods("prepay");
              setDirty(true);
            }}
            style={{ cursor: 'pointer' }}
          />
          🏦 Prepayment
        </label>
        <label style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          padding: '12px 12px',
          borderRadius: 8,
          border: paymentMethods === "both" ? '2px solid #FF9800' : '1px solid #ddd',
          background: paymentMethods === "both" ? '#FFF3E0' : '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: paymentMethods === "both" ? 600 : 400,
        }}>
          <input
            type="radio"
            checked={paymentMethods === "both"}
            onChange={() => {
              setPaymentMethods("both");
              setDirty(true);
            }}
            style={{ cursor: 'pointer' }}
          />
          ✨ Both
        </label>
      </div>

      {/* Bank Accounts (if prepayment enabled) */}
      {(paymentMethods === "prepay" || paymentMethods === "both") && (
        <div style={{ 
          marginBottom: 16,
          padding: 16,
          background: '#f9fcff',
          borderRadius: 10,
          border: '1px solid #e0f0ff',
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1565c0' }}>
            🏦 Bank Accounts
          </div>
          
          {bankAccounts.map((account, idx) => (
            <div key={idx} style={{ 
              marginBottom: 12, 
              padding: 12, 
              background: '#fff', 
              borderRadius: 8,
              border: '1px solid #e0e0e0',
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select
                  value={account.bank}
                  onChange={(e) => {
                    const newAccounts = [...bankAccounts];
                    newAccounts[idx] = { ...newAccounts[idx], bank: e.target.value };
                    setBankAccounts(newAccounts);
                    setDirty(true);
                  }}
                  style={{ ...input, flex: 1 }}
                >
                  <option value="">Select bank...</option>
                  <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="Abyssinia Bank">Abyssinia Bank</option>
                  <option value="Telebirr">Telebirr</option>
                  <option value="Other">Other</option>
                </select>
                <button
                  onClick={() => {
                    setBankAccounts(bankAccounts.filter((_, i) => i !== idx));
                    setDirty(true);
                  }}
                  style={{ 
                    ...btnSecondary, 
                    padding: '6px 12px',
                    background: '#ffebee',
                    border: '1px solid #ffcdd2',
                    color: '#c62828',
                  }}
                >
                  ✕
                </button>
              </div>
              <input
                value={account.accountName}
                onChange={(e) => {
                  const newAccounts = [...bankAccounts];
                  newAccounts[idx] = { ...newAccounts[idx], accountName: e.target.value };
                  setBankAccounts(newAccounts);
                  setDirty(true);
                }}
                placeholder="Account holder name"
                style={{ ...input, marginBottom: 8 }}
              />
              <input
                value={account.accountNumber}
                onChange={(e) => {
                  const newAccounts = [...bankAccounts];
                  newAccounts[idx] = { 
                    ...newAccounts[idx], 
                    accountNumber: e.target.value,
                    // For Telebirr, also set phoneNumber to the same value
                    ...(account.bank === "Telebirr" ? { phoneNumber: e.target.value } : {})
                  };
                  setBankAccounts(newAccounts);
                  setDirty(true);
                }}
                placeholder={account.bank === "Telebirr" ? "Phone number (+251 912 345 678)" : "Account number"}
                style={{ ...input }}
              />
            </div>
          ))}
          
          <button
            onClick={() => {
              setBankAccounts([...bankAccounts, { 
                id: `acc_${Date.now()}`, 
                bank: "", 
                accountName: "", 
                accountNumber: "",
                phoneNumber: "",
              }]);
              setDirty(true);
            }}
            style={{ 
              ...btnSecondary, 
              fontSize: 13,
              background: '#e3f2fd',
              border: '1px solid #90caf9',
              color: '#1565c0',
              fontWeight: 500,
            }}
          >
            + Add Bank Account
          </button>
        </div>
      )}

      <label style={lblBold}>Shop Logo</label>
      {logoPreview ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={logoPreview}
            alt="logo"
            style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }}
          />
          <button
            onClick={() => {
              setLogoPreview(null);
              setLogoFile(null);
              setLogoImageId(null);
              setDirty(true);
            }}
            style={btnSecondary}
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setLogoFile(f);
              setLogoPreview(URL.createObjectURL(f));
              setDirty(true);
            }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={btnSecondary}>
            Upload logo
          </button>
        </>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => {
            setPublish(e.target.checked);
            setDirty(true);
          }}
        />
        <span style={{ fontSize: 14 }}>🌍 Publish to Universal</span>
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button disabled={saving} onClick={handleSave} style={btnPrimary}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            if (!dirty || window.confirm("Discard unsaved changes?")) nav(`/shop/${slug}`);
          }}
          style={btnSecondary}
        >
          Cancel
        </button>
      </div>

      {/* Danger Zone */}
      {(userRole === "HELPER" || userRole === "COLLABORATOR" || userRole === "OWNER") && (
        <div style={{
          marginTop: 40,
          padding: 20,
          background: '#FEF2F2',
          border: '2px solid #FCA5A5',
          borderRadius: 12,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#991B1B', marginBottom: 12 }}>
            ⚠️ Danger Zone
          </div>

          {/* Leave Shop - For HELPER and COLLABORATOR */}
          {(userRole === "HELPER" || userRole === "COLLABORATOR") && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#7F1D1D', marginBottom: 8 }}>
                Leave Shop
              </div>
              <div style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 12, lineHeight: 1.5 }}>
                You can leave this shop at any time. You'll lose access to all shop features and data. You can rejoin if invited again.
              </div>
              <button
                onClick={handleLeaveShop}
                style={{
                  background: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🚪 Leave Shop
              </button>
            </div>
          )}

          {/* Delete Shop - For OWNER only */}
          {userRole === "OWNER" && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#7F1D1D', marginBottom: 8 }}>
                Delete Shop
              </div>
              <div style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 12, lineHeight: 1.5 }}>
                Permanently delete this shop and all its data. This action cannot be undone after 30 days. The shop will be hidden immediately but can be restored within 30 days.
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#7F1D1D', display: 'block', marginBottom: 6 }}>
                  Type shop name "{name}" to confirm:
                </label>
                <input
                  value={confirmShopName}
                  onChange={(e) => setConfirmShopName(e.target.value)}
                  placeholder={name}
                  style={{
                    ...input,
                    width: '100%',
                    border: '1px solid #FCA5A5',
                  }}
                />
              </div>
              <button
                onClick={handleDeleteShop}
                disabled={confirmShopName !== name}
                style={{
                  background: confirmShopName === name ? '#991B1B' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: confirmShopName === name ? 'pointer' : 'not-allowed',
                }}
              >
                🗑️ Delete Shop Permanently
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontWeight: 500, fontSize: 14 };

const lblBold: React.CSSProperties = { 
  fontWeight: 600, 
  fontSize: 14, 
  marginBottom: 4,
  marginTop: 16,
  display: 'block',
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.1)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  border: "1px solid #000",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: "#000",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};
