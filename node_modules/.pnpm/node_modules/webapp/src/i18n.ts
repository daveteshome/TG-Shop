// apps/webapp/src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getTelegramWebApp } from "./lib/telegram";

// Prefer Telegram WebApp user language when available
const tgLang = (() => {
  try {
    const tg = getTelegramWebApp();
    const code = tg?.initDataUnsafe?.user?.language_code; // e.g. "am", "en"
    return typeof code === "string" && code.length >= 2 ? code : undefined;
  } catch {
    return undefined;
  }
})();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: tgLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      // read from localStorage first, then TG/browser
      order: ["localStorage", "querystring", "navigator"],
      caches: ["localStorage"],
    },
    resources: {
      en: {
        translation: {
          // Navigation / hamburger
          nav_home: "Home",
          nav_universal: "Universal Shop",
          nav_joined: "Shops I Joined",
          nav_myshops: "My Shops",
          nav_orders: "My Orders",
          nav_language: "Language",
          nav_cart: "Cart",
          nav_profile: "Profile",
          nav_settings: "settings",
          lang_english: "English",
          lang_amharic: "Amharic",

          // Common actions
          action_create: "Create",
          action_save: "Save",
          action_cancel: "Cancel",
          action_edit: "Edit",
          action_delete: "Delete",
          action_change: "Change",
          action_choose: "Choose",

          // Shop list / creation
          title_my_shops: "My Shops",
          empty_no_shops: "You don’t own any shops yet.",
          create_shop: "Create shop",
          field_shop_name: "Shop name",
          field_public_phone: "Public phone",
          field_description: "Description",
          field_publish_universal: "Publish to Universal (recommended)",
          field_logo: "Logo",
          choose_logo: "Choose logo",
          change_logo: "Change logo",
          msg_loading: "Loading…",
          msg_error: "Error",
          msg_enter_shop_name: "Please enter a shop name.",
          msg_created_no_slug: "Created but no slug returned.",

          // Shop settings (keep keys shared with creation)
          shop_settings: "Shop Settings",

          // Product common
          products: "Products",
          add_product: "Add product",
          price: "Price",
          stock: "Stock",
          category: "Category",
          images: "Images",
          images_selected: "{{count}} image selected",
          images_selected_plural: "{{count}} images selected",
        },
      },
      am: {
        translation: {
          // Navigation / hamburger
          nav_home: "መነሻ",
          nav_universal: "አጠቃላይ መደብር",
          nav_joined: "የተቀላቀሉ መደብሮች",
          nav_myshops: "የእኔ መደብሮች",
          nav_orders: "ትእዛዞቼ",
          nav_language: "ቋንቋ",
          nav_cart: "ባስኬት",
          nav_profile: "መረጃ",
          nav_settings: "settings",
          lang_english: "እንግሊዝኛ",
          lang_amharic: "አማርኛ",

          // Common actions
          action_create: "ፍጠር",
          action_save: "አስቀምጥ",
          action_cancel: "ሰርዝ",
          action_edit: "አርትእ",
          action_delete: "ሰርዝ",
          action_change: "ቀይር",
          action_choose: "ምረጥ",

          // Shop list / creation
          title_my_shops: "የእኔ መደብሮች",
          empty_no_shops: "እስካሁን ምንም መደብር የለዎትም።",
          create_shop: "መደብር ፍጠር",
          field_shop_name: "የመደብር ስም",
          field_public_phone: "የህዝብ ስልክ",
          field_description: "መግለጫ",
          field_publish_universal: "ወደ አጠቃላይ ገበያ አታርት (ይመከራል)",
          field_logo: "አርማ",
          choose_logo: "አርማ ምረጥ",
          change_logo: "አርማ ቀይር",
          msg_loading: "በመጫን ላይ…",
          msg_error: "ስህተት",
          msg_enter_shop_name: "እባክዎ የመደብር ስም ያስገቡ።",
          msg_created_no_slug: "ተፈጥሯል ግን slug አልተመለሰም።",

          // Shop settings
          shop_settings: "የመደብር ቅንብሮች",

          // Product common
          products: "ምርቶች",
          add_product: "ምርት አክል",
          price: "ዋጋ",
          stock: "ስቶክ",
          category: "ምድብ",
          images: "ምስሎች",
          images_selected: "{{count}} ምስል ተመርጧል",
          images_selected_plural: "{{count}} ምስሎች ተመርጠዋል",
        },
      },
    },
  });

export default i18n;
