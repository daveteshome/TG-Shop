# Implementation Plan

- [ ] 1. Backend: Add promotion and demotion endpoints
  - Create POST /api/team/:tenantId/members/:userId/promote-to-owner endpoint
  - Create POST /api/team/:tenantId/members/:userId/demote-to-collaborator endpoint
  - Implement validation for role eligibility (only COLLABORATOR can be promoted)
  - Implement validation for minimum owner count (cannot demote/remove last owner)
  - Use database transactions for atomic updates
  - Create audit log entries for all role changes
  - _Requirements: 1.2, 1.4, 1.5, 4.2, 4.4, 4.5, 5.1, 5.2, 7.1, 7.2, 7.5_

- [ ]* 1.1 Write property test for promotion eligibility
  - **Property 1: Only collaborators can be promoted to owner**
  - **Validates: Requirements 1.2**

- [ ]* 1.2 Write property test for promotion role update
  - **Property 2: Promotion updates role to OWNER**
  - **Validates: Requirements 1.4**

- [ ]* 1.3 Write property test for promotion audit logging
  - **Property 3: Promotion creates audit log entry**
  - **Validates: Requirements 1.5**

- [ ]* 1.4 Write property test for demotion role update
  - **Property 6: Demotion updates role to COLLABORATOR**
  - **Validates: Requirements 4.4**

- [ ]* 1.5 Write property test for demotion audit logging
  - **Property 7: Demotion creates audit log entry**
  - **Validates: Requirements 4.5**

- [ ]* 1.6 Write property test for last owner protection
  - **Property 8: Cannot demote last owner**
  - **Validates: Requirements 5.1, 5.4**

- [ ]* 1.7 Write property test for last owner removal protection
  - **Property 9: Cannot remove last owner**
  - **Validates: Requirements 5.2, 5.3**

- [ ]* 1.8 Write property test for multiple owner operations
  - **Property 10: Multiple owners enable demotion and removal**
  - **Validates: Requirements 5.5**

- [ ]* 1.9 Write property test for shop owner invariant
  - **Property 16: Shops always have at least one owner**
  - **Validates: Requirements 7.5**

- [ ] 2. Backend: Add audit log endpoint
  - Create GET /api/team/:tenantId/audit endpoint
  - Implement filtering by action type and date range
  - Implement pagination (limit/offset)
  - Include actor and target user details in response
  - _Requirements: 6.3, 6.4, 6.5_

- [ ]* 2.1 Write property test for audit log filtering
  - **Property 13: Audit log filtering works correctly**
  - **Validates: Requirements 6.5**

- [ ]* 2.2 Write property test for audit entry fields
  - **Property 11: Audit entries contain required fields**
  - **Validates: Requirements 6.1, 6.2, 6.4**

- [ ] 3. Frontend: Create promotion dialog component
  - Create PromoteToOwnerDialog component
  - Display warning about equal privileges
  - List all owner permissions
  - Explain that co-owners can manage other owners
  - Require explicit confirmation checkbox
  - Handle API call to promotion endpoint
  - Show success/error notifications
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Frontend: Create demotion dialog component
  - Create DemoteOwnerDialog component
  - Display warning about removing owner privileges
  - Explain collaborator permissions
  - Show error message if attempting to demote last owner
  - Handle API call to demotion endpoint
  - Show success/error notifications
  - _Requirements: 4.3_

- [ ] 5. Frontend: Update member detail page with promotion/demotion actions
  - Add "Promote to Owner" button for collaborators (visible to owners only)
  - Add "Demote to Collaborator" button for owners (visible to other owners only)
  - Hide promotion button for helpers and members
  - Integrate PromoteToOwnerDialog
  - Integrate DemoteOwnerDialog
  - Update member list after successful role change
  - _Requirements: 1.1, 4.1_

- [ ]* 5.1 Write property test for UI permission display
  - **Property 17: UI updates reflect new owner permissions**
  - **Validates: Requirements 8.2, 8.4**

- [ ] 6. Frontend: Add owner badge to team list
  - Create OwnerBadge component
  - Display badge for all members with OWNER role
  - Use distinct color/icon for owner badge
  - Add badge to team member list
  - Add badge to member detail page
  - _Requirements: 2.5_

- [ ]* 6.1 Write property test for owner badge display
  - **Property 4: Owner badge displays for all owners**
  - **Validates: Requirements 2.5**

- [ ] 7. Frontend: Add notifications for role changes
  - Display success notification when promoted to owner
  - Display success notification when demoted
  - Show welcome message for new co-owners on first shop access
  - Update UI elements to reflect new permissions immediately
  - _Requirements: 8.1, 8.3, 8.5_

- [ ] 8. Frontend: Create audit log viewer page
  - Create AuditLog component/page
  - Display audit entries in chronological order
  - Show actor name, target name, action, role changes, and timestamp
  - Implement filtering by action type
  - Implement date range filtering
  - Add pagination controls
  - _Requirements: 6.3, 6.4, 6.5_

- [ ] 9. Update permission checks to support multiple owners
  - Verify existing permission functions work with multiple OWNER roles
  - Test that all owners have identical permissions
  - Ensure no hardcoded assumptions about single owner
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 9.1 Write property test for co-owner permission equality
  - **Property 5: Co-owners have identical permissions**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
