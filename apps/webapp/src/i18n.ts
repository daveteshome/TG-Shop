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
          nav_settings: "Settings",
          nav_explore: "Explore",
          lang_english: "English",
          lang_amharic: "Amharic",
          lang_german: "German",

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

            // generic
          msg_not_found: "Not found",
          msg_no_description: "No description",
          confirm_discard_changes: "You have unsaved changes. Discard them?",
          aria_back: "Back",

          // nav / labels
          label_stock_units: "Stock (available units)",
          label_stock: "Stock",
          label_stock_short: "Stock",
          label_images: "Images",
          label_images_existing_new: "Images (existing + new)",

          // category cascader (shared)
          select_category: "Select a category",
          no_category: "No category",
          back: "Back",

          // create/edit product (Shop.tsx)
          title_new_product: "New product",
          title_edit_product: "Edit product",
          ph_product_title: "Product title",
          ph_title: "Title",
          ph_price: "Price",
          ph_description_optional: "Description (optional)",
          ph_description: "Description",
          ph_stock_units: "Stock (units)",
          btn_choose_images: "Choose images",
          msg_no_images_selected: "No images selected",
          msg_one_image_selected: "1 image selected",
          msg_many_images_selected: "{{count}} images selected",
          btn_create_product: "Create product",
          btn_creating: "Creating…",
          btn_save_changes: "Save changes",
          btn_saving: "Saving…",
          btn_cancel: "Cancel",
          btn_edit: "Edit",
          btn_close: "Close",
          tag_cover: "Cover",
          aria_remove_image: "Remove image",
          aria_move_image_up: "Move image up",
          aria_move_image_down: "Move image down",

          // errors
          err_title_required: "Title is required",
          err_price_gt_zero: "Price must be a number greater than 0",
          err_stock_integer_gt_zero: "Stock must be a whole number greater than 0",
          err_create_product_failed: "Failed to create product",
          err_update_product_failed: "Failed to update product",
          err_load_product_failed: "Failed to load product",
          err_save_failed: "Failed to save",

          // list empty
          msg_no_products_yet: "No products yet.",
          msg_no_shop_selected: "No shop selected.",

          // Categories page
          title_categories: "Categories",
          categories_no_children: "No subcategories",
          msg_failed_to_load: "Failed to load",
          label_related: "Related Products",
          label_description: "Description",
          btn_delete: "Delete",
          brand: "Brand",
          condition: "Condition",
          condition_new: "New",
          condition_used: "Used",
          condition_refurbished: "Refurbished",
          sku: "SKU",
          barcode: "Barcode",
          compare_at_price: "Old Price",
          section_metadata: "Product Metadata",
          section_price_stock: "Price & Stock",

          ph_brand: "Brand (optional)",
          ph_condition_none: "Condition (optional)",
          ph_sku: "SKU (optional)",
          ph_barcode: "Barcode (optional)",
          ph_compare_at_price: "Old price (optional)",

          label_brand: "Brand",
          label_condition: "Condition",
          label_sku: "SKU",
          label_barcode: "Barcode",
          label_compare_at_price: "Old price",
          tag_low_stock: "Low Stock",
          tag_out_of_stock: "Out of Stock",

          title_edit_product_details: "Edit Product Details",
          section_basic_info: "Basic Information",

          title_danger_zone: "Danger Zone",
          btn_delete_product: "Delete Product",

          label_product_id: "Product ID",
          msg_delete_product_warning: "This action cannot be undone. Are you sure you want to delete this product?",

          err_brand_required: "Brand is required",
          err_condition_required: "Condition is required",
          err_image_required: "At least one image is required",

          label_status: "Status",
label_active: "Active",
label_inactive: "Inactive",

label_visibility: "Visibility",
label_visible: "Visible",
label_hidden: "Hidden",
label_visible_universal: "Visible in universal marketplace",
label_visible_shop: "Visible in shop only",

tag_active: "Active",
tag_inactive: "Inactive",

tag_visible: "Visible",
tag_hidden: "Hidden",

tag_published_shop: "Shop visible",
tag_unpublished_shop: "Shop hidden",

tag_published_universal: "Universal visible",
tag_unpublished_universal: "Universal hidden",

btn_toggle_active: "Toggle active",
btn_toggle_visibility: "Toggle visibility",

status_active_label: "Active",
visibility_published_label: "Published",

section_status: "Status",

status_active: "Active",
status_inactive: "Inactive",

visibility_published: "Published",
visibility_hidden: "Hidden",

section_performance: "Performance",
label_sold_units: "Sold",
label_revenue: "Revenue",
err_load_performance: "Failed to load performance",
visibility_draft: "Draft",

section_stock: "Stock",
  label_current_stock: "Current stock",
  msg_quick_stock_hint: "Set a new stock quantity quickly without editing other fields.",
  ph_new_stock_quantity: "New stock quantity (e.g. 10)",
  btn_update_stock: "Update stock",

  // Shop Orders
  title_shop_orders: "Shop Orders",
  show_less: "Show less",
  view_all: "View all",
  payment_receipt: "Payment receipt",
  unnamed_shop: "Unnamed shop",
  
  // Shop Settings - Ethiopian Regions
  region_addis_ababa: "Addis Ababa",
  region_dire_dawa: "Dire Dawa",
  region_tigray: "Tigray",
  region_afar: "Afar",
  region_amhara: "Amhara",
  region_oromia: "Oromia",
  region_somali: "Somali",
  region_benishangul: "Benishangul-Gumuz",
  region_snnpr: "Debube NNPR",
  region_gambela: "Gambela",
  region_sidama: "Sidama",
  region_southwest: "South West Ethiopia Peoples' Region",
  region_central: "Central Ethiopia Region",
  region_south: "South Ethiopia Region",
  region_harari: "Harari Region",
  
  // Shop Settings - Messages
  msg_upload_failed: "Upload failed",
  msg_save_failed: "Save failed",
  all_regions: "All regions",
  none: "None",
  select_bank: "Select bank...",
  bank_cbe: "Commercial Bank of Ethiopia (CBE)",
  bank_abyssinia: "Abyssinia Bank",
  bank_awash: "Awash Bank",
  bank_telebirr: "Telebirr",
  bank_other: "Other",
  ph_telebirr_phone: "Phone number (+251 912 345 678)",
  ph_account_number: "Account number",
  
  // Shop Categories
  category_toys_kids: "Toys & Kids",
  category_jewelry: "Jewelry & Accessories",
  category_pet_supplies: "Pet Supplies",
  category_other: "Other",
  submitting: "Submitting...",
  submit_request: "Submit Request",
  delete_request: "Delete request",
  
  // Team Performance
  msg_permission_denied: "Only shop owners can view team performance",
  role_owner: "Owner",
  role_collaborator: "Manager",
  role_helper: "Sales Staff",
  role_observer: "Observer",
  time_just_now: "Just now",
  time_minutes_ago: "{{count}}m ago",
  time_hours_ago: "{{count}}h ago",
  time_days_ago: "{{count}}d ago",
  
  // Shop Analytics
  range_7d: "Last 7 Days",
  range_30d: "Last 30 Days",
  range_90d: "Last 90 Days",
  range_all: "All Time",
  kpi_total_sales: "Total Sales",
  kpi_total_orders: "Total Orders",
  kpi_conversion_rate: "Conversion Rate",
  section_top_products: "Top Products",
  section_daily_orders: "Daily Orders",
  section_product_performance: "Product Performance",
  views_count: "{{count}} views",
  
  // Product Detail
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  aria_prev_image: "Previous image",
  aria_next_image: "Next image",
  share_product: "Share product",
  similar_products: "Similar products",
  similar_items: "Similar items",
  
  // Platform Admin
  stat_total_shops: "Total Shops",
  stat_total_users: "Total Users",
  stat_total_products: "Total Products",
  stat_total_orders: "Total Orders",
  stat_active_shops: "{{count}} active",
  action_manage_shops: "Manage Shops",
  action_manage_users: "Manage Users",
  action_all_products: "All Products",
  action_universal_shop: "Universal Shop",
  action_reports: "Reports",
  action_settings: "Settings",
  action_categories: "Categories",
  
  // Profile
  msg_profile_saved: "Profile saved",
  
  // Settings
  link_terms: "Terms of Service",
  link_privacy: "Privacy Policy",
  rel_noopener: "noopener noreferrer",
  
  // Shop List
  logo_preview: "logo preview",
  btn_change_logo: "✓ Change Logo",
  btn_upload_logo: "Upload Logo",
  creating: "Creating…",
  
  // Common Messages
  failed_to_load: "Failed to load",
  no_info: "no info",
  select_condition: "Select condition",
  
  // Checkout & Cart
  title_checkout: "Checkout",
  title_cart: "Cart",
  empty_cart_message: "Your cart is empty",
  btn_place_order: "Place Order",
  btn_continue_shopping: "Continue Shopping",
  delivery_address: "Delivery Address",
  payment_method: "Payment Method",
  order_summary: "Order Summary",
  
  // Orders
  order_status_pending: "Pending",
  order_status_paid: "Paid",
  order_status_shipped: "Shipped",
  order_status_delivered: "Delivered",
  order_status_cancelled: "Cancelled",
  
  // Inventory
  title_inventory: "Inventory",
  title_inventory_history: "Inventory History",
  btn_add_stock: "Add Stock",
  btn_adjust_stock: "Adjust Stock",
  btn_record_sale: "Record Sale",
  label_quantity: "Quantity",
  label_reason: "Reason",
  label_notes: "Notes",
  
  // Admin
  title_admin_panel: "Admin Panel",
  title_admin_shops: "Manage Shops",
  title_admin_users: "Manage Users",
  title_admin_products: "All Products",
  title_admin_categories: "Manage Categories",
  title_admin_reports: "Reports",
  title_admin_settings: "Admin Settings",
  title_admin_universal: "Universal Shop",
  
  // Shop Info
  shop_info: "Shop Information",
  shop_phone: "Shop Phone",
  shop_telegram: "Shop Telegram",
  shop_location: "Shop Location",
  delivery_info: "Delivery Information",
  payment_methods: "Payment Methods",
  bank_accounts: "Bank Accounts",
  
  // Common UI
  btn_view_details: "View Details",
  btn_view_more: "View More",
  btn_load_more: "Load More",
  btn_refresh: "Refresh",
  btn_filter: "Filter",
  btn_sort: "Sort",
  btn_apply: "Apply",
  btn_reset: "Reset",
  btn_search: "Search",
  btn_clear: "Clear",
  btn_confirm: "Confirm",
  btn_yes: "Yes",
  btn_no: "No",
  
  // Validation
  validation_required: "This field is required",
  validation_invalid_email: "Invalid email address",
  validation_invalid_phone: "Invalid phone number",
  validation_min_length: "Minimum length is {{count}} characters",
  validation_max_length: "Maximum length is {{count}} characters",
  
  // Time formats
  format_date: "MMM DD, YYYY",
  format_time: "HH:mm",
  format_datetime: "MMM DD, YYYY HH:mm",
  
  // Checkout specific
  checkout_title: "Checkout",
  checkout_subtitle: "Complete your order",
  order_summary: "Order Summary",
  contact: "Contact",
  phone_number: "Phone number",
  delivery_address: "Delivery Address",
  region: "Region",
  city: "City",
  select_region: "Select region...",
  select_city: "Select city...",
  woreda_label: "Woreda / Subcity / Area",
  woreda_placeholder: "e.g., Kirkos, Bole, Yeka...",
  woreda_placeholder_other: "Specify your woreda or area",
  special_reference: "Special reference (Optional)",
  special_reference_placeholder: "Landmark / directions (e.g., near Blue Nile Hotel)",
  order_note: "Order Note (Optional)",
  order_note_placeholder: "Any special instructions for your order...",
  payment_method: "Payment Method",
  cash_on_delivery: "Cash on Delivery",
  cash_on_delivery_desc: "Pay with cash when your order is delivered",
  bank_transfer: "Bank Transfer / Mobile Money",
  bank_transfer_desc: "Pay before delivery using bank transfer or mobile money",
  payment_instructions: "Payment Instructions",
  please_transfer: "Please transfer",
  to_following_accounts: "to one of the following accounts:",
  account_name: "Account Name",
  account_number: "Account #",
  phone: "Phone",
  after_payment_note: "After payment, please provide your transaction details below.",
  transaction_ref: "Transaction Reference Number *",
  transaction_ref_placeholder: "Enter transaction/reference number",
  transaction_ref_hint: "Enter the transaction ID or reference number from your payment receipt",
  upload_receipt: "Upload a screenshot or photo of your payment receipt (Max 5MB)",
  file_size_error: "File size must be less than 5MB",
  place_order: "Place Order",
  placing_order: "Placing order...",
  cart_empty: "Your cart is empty.",
  select_region_error: "Please select a delivery region.",
  select_city_error: "Please select a city.",
  specify_woreda_error: "Please specify your woreda/subcity/area.",
  transaction_ref_error: "Please enter your transaction reference number.",
  receipt_upload_failed: "Failed to upload receipt",
  order_placed_success: "Order placed successfully",
  checkout_failed: "Failed to place order.",
  total: "Total",
  
  // Cart specific
  cart_qty_increase_error: "Couldn't increase quantity. Please try again.",
  cart_update_error: "Couldn't update item. Please try again.",
  cart_remove_error: "Couldn't remove item. Please try again.",
  cart_add_items_hint: "Add items from the shop to get started",
  btn_continue_shopping: "Continue Shopping",
  cart_item_singular: "item",
  cart_items_plural: "items",
  cart_no_match: "No items match your search",
  subtotal: "Subtotal",
  btn_proceed_checkout: "Proceed to Checkout",
  
  // Settings specific
  settings_privacy_data: "Privacy & Data",
  clear_history_desc: "Remove all recently viewed products",
  clear_search_history_desc: "Remove all your search queries",
  confirm_clear_browsing_history: "Clear your browsing history? This will remove all recently viewed products.",
  confirm_clear_search_history: "Clear your search history?",
  search_history_cleared: "Search history cleared",
  app_version: "App Version",
  telegram_mini_app: "Telegram Mini App",
  help_support: "Help & Support",
  help_support_desc: "Need help? Contact us through the shop you're purchasing from, or reach out to the platform administrators.",
  
  // Universal specific
  search_everything: "Search everything…",
  failed_load_products: "Failed to load products",
  loading_more_products: "Loading more products...",
  seen_all_products: "You've seen all products",

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
          nav_settings: "ቅንብሮች",
          nav_explore: "ያስሱ",
          lang_english: "እንግሊዝኛ",
          lang_amharic: "አማርኛ",
          lang_german: "ጀርመንኛ",

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
          // ምድቦች ገጽ
          title_categories: "ምድቦች",
          categories_no_children: "ንዑስ ምድብ የለም",
          msg_failed_to_load: "መጫን አልተሳካም",
          
          // Shop Orders
          title_shop_orders: "የመደብር ትእዛዞች",
          show_less: "ያነሰ አሳይ",
          view_all: "ሁሉንም ይመልከቱ",
          payment_receipt: "የክፍያ ደረሰኝ",
          unnamed_shop: "ስም የሌለው መደብር",
          
          // Shop Settings - Ethiopian Regions
          region_addis_ababa: "አዲስ አበባ",
          region_dire_dawa: "ድሬዳዋ",
          region_tigray: "ትግራይ",
          region_afar: "አፋር",
          region_amhara: "አማራ",
          region_oromia: "ኦሮሚያ",
          region_somali: "ሶማሌ",
          region_benishangul: "ቤንሻንጉል ጉሙዝ",
          region_snnpr: "ደቡብ ብሔሮች",
          region_gambela: "ጋምቤላ",
          region_sidama: "ሲዳማ",
          region_southwest: "ደቡብ ምዕራብ ኢትዮጵያ",
          region_central: "መካከለኛ ኢትዮጵያ",
          region_south: "ደቡብ ኢትዮጵያ",
          region_harari: "ሐረሪ",
          
          // Shop Settings - Messages
          msg_upload_failed: "መጫን አልተሳካም",
          msg_save_failed: "ማስቀመጥ አልተሳካም",
          all_regions: "ሁሉም ክልሎች",
          none: "ምንም",
          select_bank: "ባንክ ይምረጡ...",
          bank_cbe: "የኢትዮጵያ ንግድ ባንክ (CBE)",
          bank_abyssinia: "አቢሲኒያ ባንክ",
          bank_awash: "አዋሽ ባንክ",
          bank_telebirr: "ቴሌብር",
          bank_other: "ሌላ",
          ph_telebirr_phone: "ስልክ ቁጥር (+251 912 345 678)",
          ph_account_number: "የሂሳብ ቁጥር",
          
          // Shop Categories
          category_toys_kids: "የልጆች መጫወቻዎች",
          category_jewelry: "ጌጣጌጥ እና መለዋወጫዎች",
          category_pet_supplies: "የቤት እንስሳት አቅርቦቶች",
          category_other: "ሌላ",
          submitting: "በማስገባት ላይ...",
          submit_request: "ጥያቄ አስገባ",
          delete_request: "ጥያቄ ሰርዝ",
          
          // Team Performance
          msg_permission_denied: "የቡድን አፈጻጸም ማየት የሚችሉት የመደብር ባለቤቶች ብቻ ናቸው",
          role_owner: "ባለቤት",
          role_collaborator: "አስተዳዳሪ",
          role_helper: "የሽያጭ ሰራተኛ",
          role_observer: "ተመልካች",
          time_just_now: "አሁን",
          time_minutes_ago: "ከ{{count}} ደቂቃ በፊት",
          time_hours_ago: "ከ{{count}} ሰዓት በፊት",
          time_days_ago: "ከ{{count}} ቀን በፊት",
          
          // Shop Analytics
          range_7d: "ባለፉት 7 ቀናት",
          range_30d: "ባለፉት 30 ቀናት",
          range_90d: "ባለፉት 90 ቀናት",
          range_all: "ሁሉም ጊዜ",
          kpi_total_sales: "ጠቅላላ ሽያጭ",
          kpi_total_orders: "ጠቅላላ ትእዛዞች",
          kpi_conversion_rate: "የልወጣ መጠን",
          section_top_products: "ምርጥ ምርቶች",
          section_daily_orders: "ዕለታዊ ትእዛዞች",
          section_product_performance: "የምርት አፈጻጸም",
          views_count: "{{count}} እይታዎች",
          
          // Product Detail
          in_stock: "በስቶክ ውስጥ",
          out_of_stock: "ከስቶክ ውጭ",
          aria_prev_image: "ቀዳሚ ምስል",
          aria_next_image: "ቀጣይ ምስል",
          share_product: "ምርት አጋራ",
          similar_products: "ተመሳሳይ ምርቶች",
          similar_items: "ተመሳሳይ እቃዎች",
          
          // Platform Admin
          stat_total_shops: "ጠቅላላ መደብሮች",
          stat_total_users: "ጠቅላላ ተጠቃሚዎች",
          stat_total_products: "ጠቅላላ ምርቶች",
          stat_total_orders: "ጠቅላላ ትእዛዞች",
          stat_active_shops: "{{count}} ንቁ",
          action_manage_shops: "መደብሮችን አስተዳድር",
          action_manage_users: "ተጠቃሚዎችን አስተዳድር",
          action_all_products: "ሁሉም ምርቶች",
          action_universal_shop: "አጠቃላይ መደብር",
          action_reports: "ሪፖርቶች",
          action_settings: "ቅንብሮች",
          action_categories: "ምድቦች",
          
          // Profile
          msg_profile_saved: "መገለጫ ተቀምጧል",
          
          // Settings
          link_terms: "የአገልግሎት ውሎች",
          link_privacy: "የግላዊነት ፖሊሲ",
          rel_noopener: "noopener noreferrer",
          
          // Shop List
          logo_preview: "የአርማ ቅድመ እይታ",
          btn_change_logo: "✓ አርማ ቀይር",
          btn_upload_logo: "አርማ ስቀል",
          creating: "በመፍጠር ላይ…",
          
          // Common Messages
          failed_to_load: "መጫን አልተሳካም",
          no_info: "መረጃ የለም",
          select_condition: "ሁኔታ ይምረጡ",
          
          // Checkout & Cart
          title_checkout: "ወደ ክፍያ",
          title_cart: "ባስኬት",
          empty_cart_message: "ባስኬትዎ ባዶ ነው",
          btn_place_order: "ትእዛዝ ያስቀምጡ",
          btn_continue_shopping: "ግዢ ይቀጥሉ",
          delivery_address: "የማድረሻ አድራሻ",
          payment_method: "የክፍያ ዘዴ",
          order_summary: "የትእዛዝ ማጠቃለያ",
          
          // Orders
          order_status_pending: "በመጠባበቅ ላይ",
          order_status_paid: "ተከፍሏል",
          order_status_shipped: "ተልኳል",
          order_status_delivered: "ደርሷል",
          order_status_cancelled: "ተሰርዟል",
          
          // Inventory
          title_inventory: "ክምችት",
          title_inventory_history: "የክምችት ታሪክ",
          btn_add_stock: "ስቶክ አክል",
          btn_adjust_stock: "ስቶክ አስተካክል",
          btn_record_sale: "ሽያጭ መዝግብ",
          label_quantity: "ብዛት",
          label_reason: "ምክንያት",
          label_notes: "ማስታወሻዎች",
          
          // Admin
          title_admin_panel: "የአስተዳዳሪ ፓነል",
          title_admin_shops: "መደብሮችን አስተዳድር",
          title_admin_users: "ተጠቃሚዎችን አስተዳድር",
          title_admin_products: "ሁሉም ምርቶች",
          title_admin_categories: "ምድቦችን አስተዳድር",
          title_admin_reports: "ሪፖርቶች",
          title_admin_settings: "የአስተዳዳሪ ቅንብሮች",
          title_admin_universal: "አጠቃላይ መደብር",
          
          // Shop Info
          shop_info: "የመደብር መረጃ",
          shop_phone: "የመደብር ስልክ",
          shop_telegram: "የመደብር ቴሌግራም",
          shop_location: "የመደብር አድራሻ",
          delivery_info: "የማድረሻ መረጃ",
          payment_methods: "የክፍያ ዘዴዎች",
          bank_accounts: "የባንክ ሂሳቦች",
          
          // Common UI
          btn_view_details: "ዝርዝሮችን ይመልከቱ",
          btn_view_more: "ተጨማሪ ይመልከቱ",
          btn_load_more: "ተጨማሪ ጫን",
          btn_refresh: "አድስ",
          btn_filter: "አጣራ",
          btn_sort: "ደርድር",
          btn_apply: "ተግብር",
          btn_reset: "ዳግም አስጀምር",
          btn_search: "ፈልግ",
          btn_clear: "አጽዳ",
          btn_confirm: "አረጋግጥ",
          btn_yes: "አዎ",
          btn_no: "አይ",
          
          // Validation
          validation_required: "ይህ መስክ ያስፈልጋል",
          validation_invalid_email: "ልክ ያልሆነ ኢሜይል አድራሻ",
          validation_invalid_phone: "ልክ ያልሆነ ስልክ ቁጥር",
          validation_min_length: "ዝቅተኛ ርዝመት {{count}} ቁምፊዎች ነው",
          validation_max_length: "ከፍተኛ ርዝመት {{count}} ቁምፊዎች ነው",
          
          // Time formats
          format_date: "MMM DD, YYYY",
          format_time: "HH:mm",
          format_datetime: "MMM DD, YYYY HH:mm",
          
          // Checkout specific
          checkout_title: "ወደ ክፍያ",
          checkout_subtitle: "ትእዛዝዎን ያጠናቅቁ",
          order_summary: "የትእዛዝ ማጠቃለያ",
          contact: "ግንኙነት",
          phone_number: "ስልክ ቁጥር",
          delivery_address: "የማድረሻ አድራሻ",
          region: "ክልል",
          city: "ከተማ",
          select_region: "ክልል ይምረጡ...",
          select_city: "ከተማ ይምረጡ...",
          woreda_label: "ወረዳ / ክፍለ ከተማ / አካባቢ",
          woreda_placeholder: "ለምሳሌ፣ ቂርቆስ፣ ቦሌ፣ የካ...",
          woreda_placeholder_other: "ወረዳዎን ወይም አካባቢዎን ይግለጹ",
          special_reference: "ልዩ ማጣቀሻ (አማራጭ)",
          special_reference_placeholder: "ምልክት / አቅጣጫዎች (ለምሳሌ፣ ከብሉ ናይል ሆቴል አጠገብ)",
          order_note: "የትእዛዝ ማስታወሻ (አማራጭ)",
          order_note_placeholder: "ለትእዛዝዎ ማንኛውም ልዩ መመሪያዎች...",
          payment_method: "የክፍያ ዘዴ",
          cash_on_delivery: "በማድረሻ ጊዜ ጥሬ ገንዘብ",
          cash_on_delivery_desc: "ትእዛዝዎ ሲደርስ በጥሬ ገንዘብ ይክፈሉ",
          bank_transfer: "የባንክ ዝውውር / ሞባይል ገንዘብ",
          bank_transfer_desc: "ከማድረሻ በፊት የባንክ ዝውውር ወይም ሞባይል ገንዘብ በመጠቀም ይክፈሉ",
          payment_instructions: "የክፍያ መመሪያዎች",
          please_transfer: "እባክዎ ያስተላልፉ",
          to_following_accounts: "ወደ የሚከተሉት ሂሳቦች አንዱ:",
          account_name: "የሂሳብ ስም",
          account_number: "የሂሳብ ቁጥር",
          phone: "ስልክ",
          after_payment_note: "ከክፍያ በኋላ፣ እባክዎ የግብይት ዝርዝሮችዎን ከዚህ በታች ያቅርቡ።",
          transaction_ref: "የግብይት ማጣቀሻ ቁጥር *",
          transaction_ref_placeholder: "የግብይት/ማጣቀሻ ቁጥር ያስገቡ",
          transaction_ref_hint: "ከክፍያ ደረሰኝዎ የግብይት መታወቂያ ወይም ማጣቀሻ ቁጥር ያስገቡ",
          payment_receipt: "የክፍያ ደረሰኝ (አማራጭ)",
          upload_receipt: "የክፍያ ደረሰኝዎን ቅጽበታዊ ገጽ ዕይታ ወይም ፎቶ ይስቀሉ (ከ5MB በታች)",
          file_size_error: "የፋይል መጠን ከ5MB በታች መሆን አለበት",
          place_order: "ትእዛዝ ያስቀምጡ",
          placing_order: "ትእዛዝ በማስቀመጥ ላይ...",
          cart_empty: "ባስኬትዎ ባዶ ነው።",
          select_region_error: "እባክዎ የማድረሻ ክልል ይምረጡ።",
          select_city_error: "እባክዎ ከተማ ይምረጡ።",
          specify_woreda_error: "እባክዎ ወረዳዎን/ክፍለ ከተማዎን/አካባቢዎን ይግለጹ።",
          transaction_ref_error: "እባክዎ የግብይት ማጣቀሻ ቁጥርዎን ያስገቡ።",
          receipt_upload_failed: "ደረሰኝ መስቀል አልተሳካም",
          order_placed_success: "ትእዛዝ በተሳካ ሁኔታ ተቀምጧል",
          checkout_failed: "ትእዛዝ ማስቀመጥ አልተሳካም።",
          total: "ጠቅላላ",
          
          // Cart specific
          cart_qty_increase_error: "ብዛት መጨመር አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
          cart_update_error: "እቃ ማዘመን አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
          cart_remove_error: "እቃ ማስወገድ አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
          cart_add_items_hint: "ለመጀመር ከመደብር እቃዎችን ያክሉ",
          btn_continue_shopping: "ግዢ ይቀጥሉ",
          cart_item_singular: "እቃ",
          cart_items_plural: "እቃዎች",
          cart_no_match: "ምንም እቃዎች ከፍለጋዎ ጋር አይዛመዱም",
          subtotal: "ንዑስ ድምር",
          btn_proceed_checkout: "ወደ ክፍያ ይቀጥሉ",
          
          // Settings specific
          settings_privacy_data: "ግላዊነት እና መረጃ",
          clear_history_desc: "ሁሉንም በቅርቡ የታዩ ምርቶችን ያስወግዱ",
          clear_search_history_desc: "ሁሉንም የፍለጋ ጥያቄዎችዎን ያስወግዱ",
          confirm_clear_browsing_history: "የአሰሳ ታሪክዎን ያጽዱ? ይህ ሁሉንም በቅርቡ የታዩ ምርቶችን ያስወግዳል።",
          confirm_clear_search_history: "የፍለጋ ታሪክዎን ያጽዱ?",
          search_history_cleared: "የፍለጋ ታሪክ ተጽድቷል",
          app_version: "የመተግበሪያ ስሪት",
          telegram_mini_app: "ቴሌግራም ሚኒ መተግበሪያ",
          help_support: "እገዛ እና ድጋፍ",
          help_support_desc: "እገዛ ይፈልጋሉ? እየገዙ ባሉበት መደብር በኩል ያግኙን፣ ወይም የመድረክ አስተዳዳሪዎችን ያግኙ።",
          
          // Universal specific
          search_everything: "ሁሉንም ፈልግ…",
          failed_load_products: "ምርቶችን መጫን አልተሳካም",
          loading_more_products: "ተጨማሪ ምርቶችን በመጫን ላይ...",
          seen_all_products: "ሁሉንም ምርቶች አይተዋል",

        },
      },
      de: {
        translation: {
          // Navigation / hamburger
          nav_home: "Startseite",
          nav_universal: "Universal Shop",
          nav_joined: "Beigetretene Shops",
          nav_myshops: "Meine Shops",
          nav_orders: "Meine Bestellungen",
          nav_language: "Sprache",
          nav_cart: "Warenkorb",
          nav_profile: "Profil",
          nav_settings: "Einstellungen",
          nav_explore: "Entdecken",
          lang_english: "Englisch",
          lang_amharic: "Amharisch",
          lang_german: "Deutsch",

          // Common actions
          action_create: "Erstellen",
          action_save: "Speichern",
          action_cancel: "Abbrechen",
          action_edit: "Bearbeiten",
          action_delete: "Löschen",
          action_change: "Ändern",
          action_choose: "Wählen",

          // Shop list / creation
          title_my_shops: "Meine Shops",
          empty_no_shops: "Sie besitzen noch keine Shops.",
          create_shop: "Shop erstellen",
          field_shop_name: "Shop-Name",
          field_public_phone: "Öffentliche Telefonnummer",
          field_description: "Beschreibung",
          field_publish_universal: "Im Universal Shop veröffentlichen (empfohlen)",
          field_logo: "Logo",
          choose_logo: "Logo wählen",
          change_logo: "Logo ändern",
          msg_loading: "Lädt…",
          msg_error: "Fehler",
          msg_enter_shop_name: "Bitte geben Sie einen Shop-Namen ein.",
          msg_created_no_slug: "Erstellt, aber kein Slug zurückgegeben.",

          // Shop settings
          shop_settings: "Shop-Einstellungen",

          // Product common
          products: "Produkte",
          add_product: "Produkt hinzufügen",
          price: "Preis",
          stock: "Lagerbestand",
          category: "Kategorie",
          images: "Bilder",
          images_selected: "{{count}} Bild ausgewählt",
          images_selected_plural: "{{count}} Bilder ausgewählt",

          // generic
          msg_not_found: "Nicht gefunden",
          msg_no_description: "Keine Beschreibung",
          confirm_discard_changes: "Sie haben ungespeicherte Änderungen. Verwerfen?",
          aria_back: "Zurück",

          // nav / labels
          label_stock_units: "Lagerbestand (verfügbare Einheiten)",
          label_stock: "Lagerbestand",
          label_stock_short: "Lager",
          label_images: "Bilder",
          label_images_existing_new: "Bilder (vorhanden + neu)",

          // category cascader
          select_category: "Kategorie auswählen",
          no_category: "Keine Kategorie",
          back: "Zurück",

          // create/edit product
          title_new_product: "Neues Produkt",
          title_edit_product: "Produkt bearbeiten",
          ph_product_title: "Produkttitel",
          ph_title: "Titel",
          ph_price: "Preis",
          ph_description_optional: "Beschreibung (optional)",
          ph_description: "Beschreibung",
          ph_stock_units: "Lagerbestand (Einheiten)",
          btn_choose_images: "Bilder wählen",
          msg_no_images_selected: "Keine Bilder ausgewählt",
          msg_one_image_selected: "1 Bild ausgewählt",
          msg_many_images_selected: "{{count}} Bilder ausgewählt",
          btn_create_product: "Produkt erstellen",
          btn_creating: "Erstelle…",
          btn_save_changes: "Änderungen speichern",
          btn_saving: "Speichere…",
          btn_cancel: "Abbrechen",
          btn_edit: "Bearbeiten",
          btn_close: "Schließen",
          tag_cover: "Cover",
          aria_remove_image: "Bild entfernen",
          aria_move_image_up: "Bild nach oben",
          aria_move_image_down: "Bild nach unten",

          // errors
          err_title_required: "Titel ist erforderlich",
          err_price_gt_zero: "Preis muss größer als 0 sein",
          err_stock_integer_gt_zero: "Lagerbestand muss eine ganze Zahl größer als 0 sein",
          err_create_product_failed: "Produkt konnte nicht erstellt werden",
          err_update_product_failed: "Produkt konnte nicht aktualisiert werden",
          err_load_product_failed: "Produkt konnte nicht geladen werden",
          err_save_failed: "Speichern fehlgeschlagen",

          // list empty
          msg_no_products_yet: "Noch keine Produkte.",
          msg_no_shop_selected: "Kein Shop ausgewählt.",

          // Categories page
          title_categories: "Kategorien",
          categories_no_children: "Keine Unterkategorien",
          msg_failed_to_load: "Laden fehlgeschlagen",
          label_related: "Verwandte Produkte",
          label_description: "Beschreibung",
          btn_delete: "Löschen",
          brand: "Marke",
          condition: "Zustand",
          condition_new: "Neu",
          condition_used: "Gebraucht",
          condition_refurbished: "Generalüberholt",
          sku: "SKU",
          barcode: "Barcode",
          compare_at_price: "Alter Preis",
          section_metadata: "Produkt-Metadaten",
          section_price_stock: "Preis & Lagerbestand",

          ph_brand: "Marke (optional)",
          ph_condition_none: "Zustand (optional)",
          ph_sku: "SKU (optional)",
          ph_barcode: "Barcode (optional)",
          ph_compare_at_price: "Alter Preis (optional)",

          label_brand: "Marke",
          label_condition: "Zustand",
          label_sku: "SKU",
          label_barcode: "Barcode",
          label_compare_at_price: "Alter Preis",
          tag_low_stock: "Niedriger Lagerbestand",
          tag_out_of_stock: "Nicht vorrätig",

          title_edit_product_details: "Produktdetails bearbeiten",
          section_basic_info: "Grundinformationen",

          title_danger_zone: "Gefahrenzone",
          btn_delete_product: "Produkt löschen",

          label_product_id: "Produkt-ID",
          msg_delete_product_warning: "Diese Aktion kann nicht rückgängig gemacht werden. Möchten Sie dieses Produkt wirklich löschen?",

          err_brand_required: "Marke ist erforderlich",
          err_condition_required: "Zustand ist erforderlich",
          err_image_required: "Mindestens ein Bild ist erforderlich",

          label_status: "Status",
          label_active: "Aktiv",
          label_inactive: "Inaktiv",

          label_visibility: "Sichtbarkeit",
          label_visible: "Sichtbar",
          label_hidden: "Versteckt",
          label_visible_universal: "Im Universal-Marktplatz sichtbar",
          label_visible_shop: "Nur im Shop sichtbar",

          tag_active: "Aktiv",
          tag_inactive: "Inaktiv",

          tag_visible: "Sichtbar",
          tag_hidden: "Versteckt",

          tag_published_shop: "Shop sichtbar",
          tag_unpublished_shop: "Shop versteckt",

          tag_published_universal: "Universal sichtbar",
          tag_unpublished_universal: "Universal versteckt",

          btn_toggle_active: "Aktiv umschalten",
          btn_toggle_visibility: "Sichtbarkeit umschalten",

          status_active_label: "Aktiv",
          visibility_published_label: "Veröffentlicht",

          section_status: "Status",

          status_active: "Aktiv",
          status_inactive: "Inaktiv",

          visibility_published: "Veröffentlicht",
          visibility_hidden: "Versteckt",

          section_performance: "Leistung",
          label_sold_units: "Verkauft",
          label_revenue: "Umsatz",
          err_load_performance: "Leistung konnte nicht geladen werden",
          visibility_draft: "Entwurf",

          section_stock: "Lagerbestand",
          label_current_stock: "Aktueller Lagerbestand",
          msg_quick_stock_hint: "Legen Sie schnell eine neue Lagermenge fest, ohne andere Felder zu bearbeiten.",
          ph_new_stock_quantity: "Neue Lagermenge (z.B. 10)",
          btn_update_stock: "Lagerbestand aktualisieren",

          // Shop Orders
          title_shop_orders: "Shop-Bestellungen",
          show_less: "Weniger anzeigen",
          view_all: "Alle anzeigen",
          payment_receipt: "Zahlungsbeleg",
          unnamed_shop: "Unbenannter Shop",
          
          // Shop Settings - Ethiopian Regions
          region_addis_ababa: "Addis Abeba",
          region_dire_dawa: "Dire Dawa",
          region_tigray: "Tigray",
          region_afar: "Afar",
          region_amhara: "Amhara",
          region_oromia: "Oromia",
          region_somali: "Somali",
          region_benishangul: "Benishangul-Gumuz",
          region_snnpr: "Debube NNPR",
          region_gambela: "Gambela",
          region_sidama: "Sidama",
          region_southwest: "Südwest-Äthiopien",
          region_central: "Zentral-Äthiopien",
          region_south: "Süd-Äthiopien",
          region_harari: "Harari",
          
          // Shop Settings - Messages
          msg_upload_failed: "Upload fehlgeschlagen",
          msg_save_failed: "Speichern fehlgeschlagen",
          all_regions: "Alle Regionen",
          none: "Keine",
          select_bank: "Bank auswählen...",
          bank_cbe: "Commercial Bank of Ethiopia (CBE)",
          bank_abyssinia: "Abyssinia Bank",
          bank_awash: "Awash Bank",
          bank_telebirr: "Telebirr",
          bank_other: "Andere",
          ph_telebirr_phone: "Telefonnummer (+251 912 345 678)",
          ph_account_number: "Kontonummer",
          
          // Shop Categories
          category_toys_kids: "Spielzeug & Kinder",
          category_jewelry: "Schmuck & Accessoires",
          category_pet_supplies: "Tierbedarf",
          category_other: "Andere",
          submitting: "Wird eingereicht...",
          submit_request: "Anfrage einreichen",
          delete_request: "Anfrage löschen",
          
          // Team Performance
          msg_permission_denied: "Nur Shop-Besitzer können die Teamleistung einsehen",
          role_owner: "Besitzer",
          role_collaborator: "Manager",
          role_helper: "Verkaufspersonal",
          role_observer: "Beobachter",
          time_just_now: "Gerade eben",
          time_minutes_ago: "vor {{count}}m",
          time_hours_ago: "vor {{count}}h",
          time_days_ago: "vor {{count}}d",
          
          // Shop Analytics
          range_7d: "Letzte 7 Tage",
          range_30d: "Letzte 30 Tage",
          range_90d: "Letzte 90 Tage",
          range_all: "Alle Zeit",
          kpi_total_sales: "Gesamtumsatz",
          kpi_total_orders: "Gesamtbestellungen",
          kpi_conversion_rate: "Conversion-Rate",
          section_top_products: "Top-Produkte",
          section_daily_orders: "Tägliche Bestellungen",
          section_product_performance: "Produktleistung",
          views_count: "{{count}} Aufrufe",
          
          // Product Detail
          in_stock: "Auf Lager",
          out_of_stock: "Nicht vorrätig",
          aria_prev_image: "Vorheriges Bild",
          aria_next_image: "Nächstes Bild",
          share_product: "Produkt teilen",
          similar_products: "Ähnliche Produkte",
          similar_items: "Ähnliche Artikel",
          
          // Platform Admin
          stat_total_shops: "Gesamt Shops",
          stat_total_users: "Gesamt Benutzer",
          stat_total_products: "Gesamt Produkte",
          stat_total_orders: "Gesamt Bestellungen",
          stat_active_shops: "{{count}} aktiv",
          action_manage_shops: "Shops verwalten",
          action_manage_users: "Benutzer verwalten",
          action_all_products: "Alle Produkte",
          action_universal_shop: "Universal Shop",
          action_reports: "Berichte",
          action_settings: "Einstellungen",
          action_categories: "Kategorien",
          
          // Profile
          msg_profile_saved: "Profil gespeichert",
          
          // Settings
          link_terms: "Nutzungsbedingungen",
          link_privacy: "Datenschutzrichtlinie",
          rel_noopener: "noopener noreferrer",
          
          // Shop List
          logo_preview: "Logo-Vorschau",
          btn_change_logo: "✓ Logo ändern",
          btn_upload_logo: "Logo hochladen",
          creating: "Erstelle…",
          
          // Common Messages
          failed_to_load: "Laden fehlgeschlagen",
          no_info: "keine Info",
          select_condition: "Zustand auswählen",
          
          // Checkout & Cart
          title_checkout: "Zur Kasse",
          title_cart: "Warenkorb",
          empty_cart_message: "Ihr Warenkorb ist leer",
          btn_place_order: "Bestellung aufgeben",
          btn_continue_shopping: "Weiter einkaufen",
          delivery_address: "Lieferadresse",
          payment_method: "Zahlungsmethode",
          order_summary: "Bestellübersicht",
          
          // Orders
          order_status_pending: "Ausstehend",
          order_status_paid: "Bezahlt",
          order_status_shipped: "Versandt",
          order_status_delivered: "Geliefert",
          order_status_cancelled: "Storniert",
          
          // Inventory
          title_inventory: "Inventar",
          title_inventory_history: "Inventarverlauf",
          btn_add_stock: "Lagerbestand hinzufügen",
          btn_adjust_stock: "Lagerbestand anpassen",
          btn_record_sale: "Verkauf erfassen",
          label_quantity: "Menge",
          label_reason: "Grund",
          label_notes: "Notizen",
          
          // Admin
          title_admin_panel: "Admin-Panel",
          title_admin_shops: "Shops verwalten",
          title_admin_users: "Benutzer verwalten",
          title_admin_products: "Alle Produkte",
          title_admin_categories: "Kategorien verwalten",
          title_admin_reports: "Berichte",
          title_admin_settings: "Admin-Einstellungen",
          title_admin_universal: "Universal Shop",
          
          // Shop Info
          shop_info: "Shop-Informationen",
          shop_phone: "Shop-Telefon",
          shop_telegram: "Shop-Telegram",
          shop_location: "Shop-Standort",
          delivery_info: "Lieferinformationen",
          payment_methods: "Zahlungsmethoden",
          bank_accounts: "Bankkonten",
          
          // Common UI
          btn_view_details: "Details anzeigen",
          btn_view_more: "Mehr anzeigen",
          btn_load_more: "Mehr laden",
          btn_refresh: "Aktualisieren",
          btn_filter: "Filtern",
          btn_sort: "Sortieren",
          btn_apply: "Anwenden",
          btn_reset: "Zurücksetzen",
          btn_search: "Suchen",
          btn_clear: "Löschen",
          btn_confirm: "Bestätigen",
          btn_yes: "Ja",
          btn_no: "Nein",
          
          // Validation
          validation_required: "Dieses Feld ist erforderlich",
          validation_invalid_email: "Ungültige E-Mail-Adresse",
          validation_invalid_phone: "Ungültige Telefonnummer",
          validation_min_length: "Mindestlänge beträgt {{count}} Zeichen",
          validation_max_length: "Maximale Länge beträgt {{count}} Zeichen",
          
          // Time formats
          format_date: "DD.MM.YYYY",
          format_time: "HH:mm",
          format_datetime: "DD.MM.YYYY HH:mm",
          
          // Checkout specific
          checkout_title: "Zur Kasse",
          checkout_subtitle: "Schließen Sie Ihre Bestellung ab",
          order_summary: "Bestellübersicht",
          contact: "Kontakt",
          phone_number: "Telefonnummer",
          delivery_address: "Lieferadresse",
          region: "Region",
          city: "Stadt",
          select_region: "Region auswählen...",
          select_city: "Stadt auswählen...",
          woreda_label: "Woreda / Unterbezirk / Gebiet",
          woreda_placeholder: "z.B. Kirkos, Bole, Yeka...",
          woreda_placeholder_other: "Geben Sie Ihre Woreda oder Ihr Gebiet an",
          special_reference: "Besondere Referenz (Optional)",
          special_reference_placeholder: "Orientierungspunkt / Wegbeschreibung (z.B. in der Nähe des Blue Nile Hotels)",
          order_note: "Bestellnotiz (Optional)",
          order_note_placeholder: "Besondere Anweisungen für Ihre Bestellung...",
          payment_method: "Zahlungsmethode",
          cash_on_delivery: "Nachnahme",
          cash_on_delivery_desc: "Bezahlen Sie bar bei Lieferung Ihrer Bestellung",
          bank_transfer: "Banküberweisung / Mobile Money",
          bank_transfer_desc: "Bezahlen Sie vor der Lieferung per Banküberweisung oder Mobile Money",
          payment_instructions: "Zahlungsanweisungen",
          please_transfer: "Bitte überweisen Sie",
          to_following_accounts: "auf eines der folgenden Konten:",
          account_name: "Kontoinhaber",
          account_number: "Kontonummer",
          phone: "Telefon",
          after_payment_note: "Bitte geben Sie nach der Zahlung Ihre Transaktionsdetails unten an.",
          transaction_ref: "Transaktionsreferenznummer *",
          transaction_ref_placeholder: "Transaktions-/Referenznummer eingeben",
          transaction_ref_hint: "Geben Sie die Transaktions-ID oder Referenznummer von Ihrem Zahlungsbeleg ein",
          payment_receipt: "Zahlungsbeleg (Optional)",
          upload_receipt: "Laden Sie einen Screenshot oder ein Foto Ihres Zahlungsbelegs hoch (Max 5MB)",
          file_size_error: "Dateigröße muss kleiner als 5MB sein",
          place_order: "Bestellung aufgeben",
          placing_order: "Bestellung wird aufgegeben...",
          cart_empty: "Ihr Warenkorb ist leer.",
          select_region_error: "Bitte wählen Sie eine Lieferregion aus.",
          select_city_error: "Bitte wählen Sie eine Stadt aus.",
          specify_woreda_error: "Bitte geben Sie Ihre Woreda/Unterbezirk/Gebiet an.",
          transaction_ref_error: "Bitte geben Sie Ihre Transaktionsreferenznummer ein.",
          receipt_upload_failed: "Beleg-Upload fehlgeschlagen",
          order_placed_success: "Bestellung erfolgreich aufgegeben",
          checkout_failed: "Bestellung konnte nicht aufgegeben werden.",
          total: "Gesamt",
          
          // Cart specific
          cart_qty_increase_error: "Menge konnte nicht erhöht werden. Bitte versuchen Sie es erneut.",
          cart_update_error: "Artikel konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.",
          cart_remove_error: "Artikel konnte nicht entfernt werden. Bitte versuchen Sie es erneut.",
          cart_add_items_hint: "Fügen Sie Artikel aus dem Shop hinzu, um zu beginnen",
          btn_continue_shopping: "Weiter einkaufen",
          cart_item_singular: "Artikel",
          cart_items_plural: "Artikel",
          cart_no_match: "Keine Artikel entsprechen Ihrer Suche",
          subtotal: "Zwischensumme",
          btn_proceed_checkout: "Zur Kasse gehen",
          
          // Settings specific
          settings_privacy_data: "Datenschutz & Daten",
          clear_history_desc: "Alle kürzlich angesehenen Produkte entfernen",
          clear_search_history_desc: "Alle Ihre Suchanfragen entfernen",
          confirm_clear_browsing_history: "Browserverlauf löschen? Dies entfernt alle kürzlich angesehenen Produkte.",
          confirm_clear_search_history: "Suchverlauf löschen?",
          search_history_cleared: "Suchverlauf gelöscht",
          app_version: "App-Version",
          telegram_mini_app: "Telegram Mini App",
          help_support: "Hilfe & Support",
          help_support_desc: "Brauchen Sie Hilfe? Kontaktieren Sie uns über den Shop, bei dem Sie einkaufen, oder wenden Sie sich an die Plattform-Administratoren.",
          
          // Universal specific
          search_everything: "Alles durchsuchen…",
          failed_load_products: "Produkte konnten nicht geladen werden",
          loading_more_products: "Weitere Produkte werden geladen...",
          seen_all_products: "Sie haben alle Produkte gesehen",
        },
      },
    },
  });

export default i18n;
