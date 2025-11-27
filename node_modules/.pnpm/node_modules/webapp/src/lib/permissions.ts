// apps/webapp/src/lib/permissions.ts
export type ShopRole = 'OWNER' | 'COLLABORATOR' | 'HELPER' | 'MEMBER';

export function canAddStock(role: ShopRole | null): boolean {
  return role === 'OWNER' || role === 'COLLABORATOR';
}

export function canRecordSale(role: ShopRole | null): boolean {
  return role === 'OWNER' || role === 'COLLABORATOR' || role === 'HELPER';
}

export function canAdjustStock(role: ShopRole | null): boolean {
  return role === 'OWNER' || role === 'COLLABORATOR';
}

export function canViewCostPrices(role: ShopRole | null): boolean {
  return role === 'OWNER' || role === 'COLLABORATOR';
}

export function canViewInventoryHistory(role: ShopRole | null): boolean {
  return true; // All roles can view
}

export function canEditProducts(role: ShopRole | null): boolean {
  return role === 'OWNER' || role === 'COLLABORATOR';
}

export function canDeleteProducts(role: ShopRole | null): boolean {
  return role === 'OWNER';
}

export function canViewAnalytics(role: ShopRole | null): boolean {
  return role === 'OWNER' || role === 'COLLABORATOR';
}

export function canManageTeam(role: ShopRole | null): boolean {
  return role === 'OWNER';
}

export function getRoleBadgeColor(role: ShopRole): string {
  switch (role) {
    case 'OWNER':
      return '#dc2626'; // red
    case 'COLLABORATOR':
      return '#2563eb'; // blue
    case 'HELPER':
      return '#16a34a'; // green
    case 'MEMBER':
      return '#6b7280'; // gray
    default:
      return '#6b7280';
  }
}

export function getRoleLabel(role: ShopRole): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'COLLABORATOR':
      return 'Manager';
    case 'HELPER':
      return 'Sales Staff';
    case 'MEMBER':
      return 'Member';
    default:
      return role;
  }
}
