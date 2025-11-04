import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type TenantLite = {
  slug: string;
  name: string;
  logoWebUrl?: string | null;
  publishUniversal?: boolean;
};

export default function ShopActionsMenu({ tenant }: { tenant: TenantLite }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { slug } = useParams();

  function copyLink() {
    const url = `${window.location.origin}/shop/${tenant.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center"
        aria-label="Shop menu"
      >
        {tenant.logoWebUrl ? (
          <img src={tenant.logoWebUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-semibold">{tenant.name?.[0] ?? "S"}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-neutral-200 z-50"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="py-1 text-sm">
            <button className="w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={() => nav(`/shop/${slug}/settings`)}>
              Shop settings
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={() => nav(`/shop/${slug}/orders`)}>
              Orders
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={() => nav(`/shop/${slug}/categories`)}>
              Categories
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={() => nav(`/shop/${slug}/invitations`)}>
              Invitations
            </button>

            <div className="h-px bg-neutral-200 my-1" />

            <button className="w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={() => nav(`/shop/${slug}?view=customer`)}>
              View as customer
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-neutral-50" onClick={copyLink}>
              Copy shop link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
