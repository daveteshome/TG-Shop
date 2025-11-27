// apps/backend/src/lib/permissions.ts
export enum ShopRole {
  OWNER = 'OWNER',
  COLLABORATOR = 'COLLABORATOR',
  HELPER = 'HELPER',
  MEMBER = 'MEMBER',
}

export function canAddStock(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER || role === ShopRole.COLLABORATOR;
}

export function canRecordSale(role: ShopRole | string | null): boolean {
  return (
    role === ShopRole.OWNER ||
    role === ShopRole.COLLABORATOR ||
    role === ShopRole.HELPER
  );
}

export function canAdjustStock(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER || role === ShopRole.COLLABORATOR;
}

export function canViewCostPrices(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER || role === ShopRole.COLLABORATOR;
}

export function canViewInventoryHistory(role: ShopRole | string | null): boolean {
  return true; // All roles can view
}

export function canEditProducts(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER || role === ShopRole.COLLABORATOR;
}

export function canDeleteProducts(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER;
}

export function canViewAnalytics(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER || role === ShopRole.COLLABORATOR;
}

export function canManageTeam(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER;
}

export function canInviteMembers(role: ShopRole | string | null): boolean {
  return role === ShopRole.OWNER || role === ShopRole.COLLABORATOR;
}
