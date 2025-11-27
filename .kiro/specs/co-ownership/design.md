# Design Document

## Overview

The co-ownership system enables shop owners to promote trusted collaborators to co-owner status, allowing multiple users to share full administrative control of a shop. This design ensures that ownership transitions are intentional, reversible, and maintain shop stability by preventing scenarios where a shop has no owners.

The system builds on the existing role-based access control (RBAC) infrastructure, leveraging the `Membership` model and `ShopRole` enum. The key innovation is enabling multiple OWNER roles per shop while enforcing business rules around promotion eligibility and minimum owner requirements.

## Architecture

### System Components

1. **Backend API Layer**
   - Role promotion/demotion endpoints
   - Validation middleware for ownership rules
   - Audit logging service

2. **Database Layer**
   - Existing `Membership` table (no schema changes needed)
   - Existing `MembershipAudit` table for tracking changes
   - Transaction management for atomic role updates

3. **Frontend UI Layer**
   - Member detail page with promotion/demotion actions
   - Confirmation dialogs with ownership implications
   - Team list with owner badges
   - Audit log viewer

4. **Permission System**
   - Existing permission functions (no changes needed)
   - All OWNER roles have identical permissions

### Data Flow

```
Owner initiates promotion
    ↓
Frontend validates user is COLLABORATOR
    ↓
Confirmation dialog displays implications
    ↓
Owner confirms
    ↓
Backend validates:
  - Actor is OWNER
  - Target is COLLABORATOR
  - Shop exists
    ↓
Database transaction:
  - Update Membership.role to OWNER
  - Create MembershipAudit entry
  - Commit transaction
    ↓
Frontend updates UI
    ↓
Target user sees notification
```

## Components and Interfaces

### Backend API Endpoints

#### POST /api/team/:tenantId/members/:userId/promote-to-owner

Promotes a collaborator to owner status.

**Request:**
```typescript
// No body required
```

**Response:**
```typescript
{
  success: boolean;
  membership: {
    id: string;
    tenantId: string;
    userId: string;
    role: 'OWNER';
    createdAt: string;
    updatedAt: string;
  };
  audit: {
    id: string;
    action: 'ROLE_UPDATE';
    fromRole: 'COLLABORATOR';
    toRole: 'OWNER';
    actorId: string;
    targetId: string;
    createdAt: string;
  };
}
```

**Errors:**
- 403: Actor is not an owner
- 400: Target is not a collaborator
- 404: Membership not found

#### POST /api/team/:tenantId/members/:userId/demote-to-collaborator

Demotes an owner to collaborator status.

**Request:**
```typescript
// No body required
```

**Response:**
```typescript
{
  success: boolean;
  membership: {
    id: string;
    tenantId: string;
    userId: string;
    role: 'COLLABORATOR';
    createdAt: string;
    updatedAt: string;
  };
  audit: {
    id: string;
    action: 'ROLE_UPDATE';
    fromRole: 'OWNER';
    toRole: 'COLLABORATOR';
    actorId: string;
    targetId: string;
    createdAt: string;
  };
}
```

**Errors:**
- 403: Actor is not an owner
- 400: Target is not an owner OR is the last remaining owner
- 404: Membership not found

#### GET /api/team/:tenantId/audit

Retrieves membership audit log with optional filtering.

**Query Parameters:**
```typescript
{
  action?: 'ROLE_UPDATE' | 'INVITE_CREATE' | 'JOIN_ACCEPT' | 'REMOVE';
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  audits: Array<{
    id: string;
    tenantId: string;
    actorId: string;
    targetId: string;
    action: string;
    fromRole: string | null;
    toRole: string | null;
    createdAt: string;
    actor: {
      tgId: string;
      name: string;
      username: string;
    };
    target: {
      tgId: string;
      name: string;
      username: string;
    };
  }>;
  total: number;
}
```

### Frontend Components

#### PromoteToOwnerDialog Component

```typescript
interface PromoteToOwnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  memberName: string;
  memberUsername: string;
}
```

Displays:
- Warning about equal privileges
- List of owner permissions
- Explanation that co-owners can manage other owners
- Confirmation checkbox
- Confirm/Cancel buttons

#### DemoteOwnerDialog Component

```typescript
interface DemoteOwnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  memberName: string;
  memberUsername: string;
  isLastOwner: boolean;
}
```

Displays:
- Warning about removing owner privileges
- Explanation of collaborator permissions
- Error message if last owner
- Confirm/Cancel buttons

#### OwnerBadge Component

```typescript
interface OwnerBadgeProps {
  role: ShopRole;
  showLabel?: boolean;
}
```

Visual indicator for owner status in team lists.

## Data Models

No schema changes required. The existing models support co-ownership:

### Membership Model (Existing)

```prisma
model Membership {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  role      ShopRole @default(MEMBER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [tgId])

  @@unique([tenantId, userId])
  @@index([tenantId, role])
  @@index([userId])
}
```

**Key Points:**
- No unique constraint on `role` field
- Multiple OWNER roles per `tenantId` are allowed
- `@@unique([tenantId, userId])` ensures one membership per user per shop

### MembershipAudit Model (Existing)

```prisma
model MembershipAudit {
  id        String    @id @default(cuid())
  tenantId  String
  actorId   String
  targetId  String
  action    String
  fromRole  ShopRole?
  toRole    ShopRole?
  createdAt DateTime  @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt])
  @@index([actorId])
  @@index([targetId])
}
```

**Usage:**
- `action`: "ROLE_UPDATE" for promotions/demotions
- `fromRole`: Previous role (e.g., "COLLABORATOR")
- `toRole`: New role (e.g., "OWNER")
- `actorId`: User who performed the action
- `targetId`: User whose role changed



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Only collaborators can be promoted to owner

*For any* shop member, attempting to promote them to owner should succeed only if their current role is COLLABORATOR, and should fail with an appropriate error for any other role.

**Validates: Requirements 1.2**

### Property 2: Promotion updates role to OWNER

*For any* valid promotion request (owner promoting a collaborator), the target user's membership role should be updated to OWNER in the database.

**Validates: Requirements 1.4**

### Property 3: Promotion creates audit log entry

*For any* successful promotion, an audit log entry should be created with action "ROLE_UPDATE", fromRole "COLLABORATOR", toRole "OWNER", and the correct actor and target IDs.

**Validates: Requirements 1.5**

### Property 4: Owner badge displays for all owners

*For any* team member list, all members with role OWNER should have an owner badge displayed in the UI.

**Validates: Requirements 2.5**

### Property 5: Co-owners have identical permissions

*For any* two users with OWNER role in the same shop, they should have identical permissions for all operations (settings, team management, products, analytics, orders).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 6: Demotion updates role to COLLABORATOR

*For any* valid demotion request (owner demoting another owner when multiple owners exist), the target user's membership role should be updated to COLLABORATOR.

**Validates: Requirements 4.4**

### Property 7: Demotion creates audit log entry

*For any* successful demotion, an audit log entry should be created with action "ROLE_UPDATE", fromRole "OWNER", toRole "COLLABORATOR", and the correct actor and target IDs.

**Validates: Requirements 4.5**

### Property 8: Cannot demote last owner

*For any* shop with exactly one owner, attempting to demote that owner should fail with an error message, and the owner's role should remain unchanged.

**Validates: Requirements 5.1, 5.4**

### Property 9: Cannot remove last owner

*For any* shop with exactly one owner, attempting to remove that owner from the shop should fail with an error message, and the membership should remain unchanged.

**Validates: Requirements 5.2, 5.3**

### Property 10: Multiple owners enable demotion and removal

*For any* shop with two or more owners, any owner should be able to be demoted or removed, and the operation should succeed.

**Validates: Requirements 5.5**

### Property 11: Audit entries contain required fields

*For any* promotion or demotion operation, the created audit entry should contain non-null values for actorId, targetId, action, fromRole, toRole, and createdAt fields.

**Validates: Requirements 6.1, 6.2, 6.4**

### Property 12: Audit log returns ownership changes

*For any* query to the audit log, all returned entries with action "ROLE_UPDATE" involving OWNER role should be included in the results.

**Validates: Requirements 6.3**

### Property 13: Audit log filtering works correctly

*For any* audit log query with filters (action type, date range), only entries matching all specified filters should be returned.

**Validates: Requirements 6.5**

### Property 14: Failed role changes maintain previous state

*For any* role change operation that fails (due to validation error, constraint violation, or database error), the membership role should remain unchanged from its previous value.

**Validates: Requirements 7.2**

### Property 15: Role changes invalidate permission caches

*For any* successful role change, subsequent permission checks for the affected user should reflect the new role, not the cached old role.

**Validates: Requirements 7.4**

### Property 16: Shops always have at least one owner

*For any* completed role change operation (promotion, demotion, removal), the shop should have at least one member with role OWNER.

**Validates: Requirements 7.5**

### Property 17: UI updates reflect new owner permissions

*For any* user whose role changes to OWNER, the UI should display owner-specific elements (settings access, team management, etc.) after the role change.

**Validates: Requirements 8.2, 8.4**

## Error Handling

### Validation Errors

1. **Non-collaborator promotion attempt**
   - HTTP 400 Bad Request
   - Message: "Only collaborators can be promoted to owner"
   - No database changes

2. **Last owner demotion attempt**
   - HTTP 400 Bad Request
   - Message: "Cannot demote the last owner. Promote another member to owner first."
   - No database changes

3. **Last owner removal attempt**
   - HTTP 400 Bad Request
   - Message: "Cannot remove the last owner. Promote another member to owner first."
   - No database changes

4. **Non-owner actor attempt**
   - HTTP 403 Forbidden
   - Message: "Only owners can promote or demote members"
   - No database changes

### Database Errors

1. **Transaction failure**
   - HTTP 500 Internal Server Error
   - Message: "Failed to update member role. Please try again."
   - Automatic rollback of all changes
   - Error logged for debugging

2. **Membership not found**
   - HTTP 404 Not Found
   - Message: "Member not found"
   - No database changes

3. **Concurrent modification**
   - HTTP 409 Conflict
   - Message: "Member role was modified by another user. Please refresh and try again."
   - No database changes

### Error Recovery

- All errors should be logged with context (tenantId, userId, actorId, attempted action)
- Failed transactions should automatically rollback
- UI should display user-friendly error messages
- Users should be able to retry operations after fixing issues

## Testing Strategy

### Unit Testing

Unit tests will verify individual functions and components:

1. **Permission Functions**
   - Test that `canManageTeam()` returns true for OWNER role
   - Test that all permission functions treat multiple owners equally

2. **Validation Logic**
   - Test role eligibility checks (only COLLABORATOR can be promoted)
   - Test minimum owner count validation
   - Test actor permission validation

3. **UI Components**
   - Test PromoteToOwnerDialog renders correctly
   - Test DemoteOwnerDialog shows error for last owner
   - Test OwnerBadge displays for OWNER role

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using a PBT library. We'll use **fast-check** for JavaScript/TypeScript property-based testing.

Each property-based test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

Property-based tests must be tagged with comments explicitly referencing the correctness property from this design document using the format: `**Feature: co-ownership, Property {number}: {property_text}**`

1. **Property 1: Only collaborators can be promoted**
   - Generate random users with various roles
   - Verify promotion succeeds only for COLLABORATOR role
   - Verify appropriate errors for other roles

2. **Property 2: Promotion updates role**
   - Generate random shops with owners and collaborators
   - Promote collaborator and verify role is OWNER

3. **Property 3: Promotion creates audit entry**
   - Generate random promotion scenarios
   - Verify audit entry exists with correct fields

4. **Property 5: Co-owners have identical permissions**
   - Generate shops with multiple owners
   - Verify all permission functions return same result for all owners

5. **Property 8: Cannot demote last owner**
   - Generate shops with single owner
   - Verify demotion fails with error

6. **Property 10: Multiple owners enable operations**
   - Generate shops with 2+ owners
   - Verify demotion and removal succeed

7. **Property 16: Shops always have at least one owner**
   - Generate various role change scenarios
   - Verify shop always has at least one OWNER after operation

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Promotion Flow**
   - Owner logs in
   - Navigates to member detail page
   - Clicks promote button
   - Confirms dialog
   - Verifies role updated in database
   - Verifies audit entry created
   - Verifies UI updates

2. **Demotion Flow**
   - Owner logs in with multiple owners present
   - Navigates to another owner's detail page
   - Clicks demote button
   - Confirms dialog
   - Verifies role updated
   - Verifies audit entry created

3. **Last Owner Protection**
   - Create shop with single owner
   - Attempt to demote owner
   - Verify error message
   - Verify role unchanged

4. **Permission Verification**
   - Promote collaborator to owner
   - Log in as new owner
   - Verify access to all owner features
   - Verify can manage other members

### Test Data Generation

For property-based tests, we'll need generators for:

1. **Shop Generator**
   - Random shop with configurable number of owners, collaborators, helpers, members
   - Ensures at least one owner exists

2. **User Generator**
   - Random user with tgId, name, username
   - Random role assignment

3. **Membership Generator**
   - Random membership linking user to shop with role
   - Ensures unique user per shop

4. **Role Change Request Generator**
   - Random actor (owner)
   - Random target (any role)
   - Random operation (promote/demote)

## Implementation Notes

### Database Transactions

All role change operations must use database transactions:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Verify constraints (minimum owners, role eligibility)
  const ownerCount = await tx.membership.count({
    where: { tenantId, role: 'OWNER' }
  });
  
  if (operation === 'demote' && ownerCount <= 1) {
    throw new Error('Cannot demote last owner');
  }
  
  // 2. Update membership role
  const updated = await tx.membership.update({
    where: { id: membershipId },
    data: { role: newRole }
  });
  
  // 3. Create audit entry
  await tx.membershipAudit.create({
    data: {
      tenantId,
      actorId,
      targetId,
      action: 'ROLE_UPDATE',
      fromRole: oldRole,
      toRole: newRole
    }
  });
  
  return updated;
});
```

### Permission Cache Invalidation

After role changes, invalidate any cached permission data:

```typescript
// Clear user's permission cache
await redis.del(`permissions:${userId}:${tenantId}`);

// Or if using in-memory cache
permissionCache.delete(`${userId}:${tenantId}`);
```

### UI State Management

Frontend should optimistically update UI after successful API call:

```typescript
// Update local state
setMembers(members.map(m => 
  m.userId === targetUserId 
    ? { ...m, role: 'OWNER' }
    : m
));

// Show success notification
toast.success(`${memberName} is now a co-owner`);
```

### Audit Log Pagination

Implement cursor-based pagination for audit log to handle large datasets:

```typescript
const audits = await prisma.membershipAudit.findMany({
  where: { tenantId, ...filters },
  take: limit,
  skip: offset,
  orderBy: { createdAt: 'desc' },
  include: {
    actor: { select: { tgId: true, name: true, username: true } },
    target: { select: { tgId: true, name: true, username: true } }
  }
});
```
