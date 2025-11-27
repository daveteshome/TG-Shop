// Admin Settings Page
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type PlatformSettings = {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  universalShopEnabled: boolean;
  minProductPrice: number;
  maxProductPrice: number;
  defaultCurrency: string;
  platformFeePercent: number;
};

export default function AdminSettings() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    universalShopEnabled: true,
    minProductPrice: 1,
    maxProductPrice: 1000000,
    defaultCurrency: "ETB",
    platformFeePercent: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await api<PlatformSettings>("/admin/settings");
      setSettings(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      await api("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      alert("Settings saved successfully");
    } catch (e: any) {
      alert(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Platform Settings</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Configure platform-wide settings
        </p>
      </div>

      {error && (
        <Card padding="md" style={{ marginBottom: "16px", background: "var(--color-error-bg)" }}>
          <div style={{ color: "var(--color-error)" }}>{error}</div>
        </Card>
      )}

      {/* General Settings */}
      <Card padding="lg" style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
          General Settings
        </h2>

        <SettingToggle
          label="Maintenance Mode"
          description="Disable access to the platform for maintenance"
          checked={settings.maintenanceMode}
          onChange={(checked) =>
            setSettings((prev) => ({ ...prev, maintenanceMode: checked }))
          }
        />

        <SettingToggle
          label="Registration Enabled"
          description="Allow new shops to register"
          checked={settings.registrationEnabled}
          onChange={(checked) =>
            setSettings((prev) => ({ ...prev, registrationEnabled: checked }))
          }
        />

        <SettingToggle
          label="Universal Shop Enabled"
          description="Enable the universal marketplace"
          checked={settings.universalShopEnabled}
          onChange={(checked) =>
            setSettings((prev) => ({ ...prev, universalShopEnabled: checked }))
          }
        />
      </Card>

      {/* Product Settings */}
      <Card padding="lg" style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
          Product Settings
        </h2>

        <SettingInput
          label="Minimum Product Price"
          type="number"
          value={settings.minProductPrice}
          onChange={(value) =>
            setSettings((prev) => ({ ...prev, minProductPrice: Number(value) }))
          }
        />

        <SettingInput
          label="Maximum Product Price"
          type="number"
          value={settings.maxProductPrice}
          onChange={(value) =>
            setSettings((prev) => ({ ...prev, maxProductPrice: Number(value) }))
          }
        />

        <SettingInput
          label="Default Currency"
          type="text"
          value={settings.defaultCurrency}
          onChange={(value) =>
            setSettings((prev) => ({ ...prev, defaultCurrency: value }))
          }
        />
      </Card>

      {/* Financial Settings */}
      <Card padding="lg" style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
          Financial Settings
        </h2>

        <SettingInput
          label="Platform Fee (%)"
          type="number"
          value={settings.platformFeePercent}
          onChange={(value) =>
            setSettings((prev) => ({ ...prev, platformFeePercent: Number(value) }))
          }
          description="Percentage fee charged on each transaction"
        />
      </Card>

      {/* Save Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={saveSettings}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid var(--color-border-main)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: "14px", marginBottom: "2px" }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            {description}
          </div>
        )}
      </div>
      <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: "20px", height: "20px", cursor: "pointer" }}
        />
      </label>
    </div>
  );
}

function SettingInput({
  label,
  description,
  type,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  type: "text" | "number";
  value: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        padding: "12px 0",
        borderBottom: "1px solid var(--color-border-main)",
      }}
    >
      <label style={{ display: "block", marginBottom: "8px" }}>
        <div style={{ fontWeight: 500, fontSize: "14px", marginBottom: "2px" }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
            {description}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--color-border-main)",
            fontSize: "14px",
          }}
        />
      </label>
    </div>
  );
}
