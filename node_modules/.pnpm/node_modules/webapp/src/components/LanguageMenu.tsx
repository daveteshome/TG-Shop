import React from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";

export default function LanguageMenu() {
  const { t } = useTranslation();

  const setLang = (lng: "en" | "am") => {
    i18n.changeLanguage(lng);
    try { localStorage.setItem("i18nextLng", lng); } catch {}
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{t("nav_language")}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setLang("en")}
          style={btn}
          aria-label={t("lang_english")}
        >
          {t("lang_english")}
        </button>
        <button
          onClick={() => setLang("am")}
          style={btn}
          aria-label={t("lang_amharic")}
        >
          {t("lang_amharic")}
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
