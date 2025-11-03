import React from "react";

type ShopHeaderBarProps = {
  title?: string;
  onMenuClick?: () => void;
  onAddProduct?: () => void;
  onOpenShopMenu?: () => void;
  shopLogo?: string | null;
};

export default function ShopHeaderBar({
  title = "Shop",
  onMenuClick,
  onAddProduct,
  onOpenShopMenu,
  shopLogo,
}: ShopHeaderBarProps) {
  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-neutral-200">
      {/* Left: Hamburger */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-neutral-100"
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Center: Title */}
      <h1 className="text-lg font-semibold">{title}</h1>

      {/* Right: +Add Product + Shop Menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAddProduct}
          className="px-3 py-1 rounded-full bg-black text-white text-sm font-medium"
        >
          + Add Product
        </button>

        <button
          onClick={onOpenShopMenu}
          className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center"
          aria-label="Shop menu"
        >
          {shopLogo ? (
            <img src={shopLogo} alt="Shop" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-neutral-700">S</span>
          )}
        </button>
      </div>
    </header>
  );
}
