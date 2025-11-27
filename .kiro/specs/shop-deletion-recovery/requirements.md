# Requirements Document

## Introduction

This feature enables shop owners to manage deleted shops through a complete lifecycle: hiding deleted shops from the main shop list, viewing deleted shops in a dedicated section, restoring shops within a 30-day grace period, and automatically permanently deleting shops after 30 days. This specification covers all three phases: Phase 1 (filtering deleted shops from My Shops page), Phase 2 (deleted shops management UI and restore functionality), and Phase 3 (automated permanent deletion after 30 days).

## Glossary

- **Shop**: A merchant store entity in the system that can be soft-deleted or permanently deleted
- **Soft Delete**: Marking a shop as deleted by setting the deletedAt timestamp without removing data
- **Hard Delete**: Permanently removing shop data from the database
- **Grace Period**: The 30-day window during which deleted shops can be restored
- **Shop Owner**: A user with OWNER role for a shop
- **Deleted Shops Section**: A UI section in the user profile/settings showing soft-deleted shops
- **Restore Operation**: The action of un-deleting a shop by clearing its deletedAt timestamp
- **Cleanup Job**: An automated system process that permanently deletes shops after the grace period

## Requirements

### Requirement 1

**User Story:** As a shop owner, I want deleted shops to be hidden from my "My Shops" page, so that I only see active shops in my main shop list.

#### Acceptance Criteria

1. WHEN the system fetches shops for the "My Shops" page THEN the system SHALL filter out shops where deletedAt is not null
2. WHEN a user deletes a shop THEN the system SHALL immediately remove it from the "My Shops" page display
3. WHEN the backend returns shop lists THEN the system SHALL include only shops where deletedAt is null
4. WHEN a shop is soft-deleted THEN the system SHALL set the deletedAt timestamp to the current date and time
5. WHEN displaying the shop count THEN the system SHALL count only shops where deletedAt is null

### Requirement 2

**User Story:** As a shop owner, I want to view my deleted shops in a dedicated section, so that I can see what shops I have deleted and potentially restore them.

#### Acceptance Criteria

1. WHEN a user navigates to their profile or settings page THEN the system SHALL display a "Deleted Shops" section
2. WHEN the deleted shops section is displayed THEN the system SHALL show all shops where deletedAt is not null and the user is the owner
3. WHEN displaying each deleted shop THEN the system SHALL show the shop name, deletion date, and days remaining until permanent deletion
4. WHEN a shop has been deleted for more than 30 days THEN the system SHALL NOT display it in the deleted shops section
5. WHEN there are no deleted shops THEN the system SHALL display a message indicating no deleted shops exist

### Requirement 3

**User Story:** As a shop owner, I want to restore a deleted shop, so that I can recover from accidental deletions or change my mind about closing a shop.

#### Acceptance Criteria

1. WHEN a user clicks the restore button on a deleted shop THEN the system SHALL set the shop's deletedAt field to null
2. WHEN a shop is restored THEN the system SHALL immediately show the shop in the "My Shops" page
3. WHEN a shop is restored THEN the system SHALL remove it from the "Deleted Shops" section
4. WHEN a restore operation completes THEN the system SHALL display a success message to the user
5. WHEN a restore operation fails THEN the system SHALL display an error message and maintain the current state

### Requirement 4

**User Story:** As a shop owner, I want confirmation before restoring a shop, so that I don't accidentally restore shops I intended to keep deleted.

#### Acceptance Criteria

1. WHEN a user clicks the restore button THEN the system SHALL display a confirmation dialog
2. WHEN the confirmation dialog is displayed THEN the system SHALL show the shop name and ask for explicit confirmation
3. WHEN a user confirms the restore action THEN the system SHALL proceed with the restore operation
4. WHEN a user cancels the restore action THEN the system SHALL close the dialog and maintain the current state

### Requirement 5

**User Story:** As a system administrator, I want shops deleted for more than 30 days to be permanently removed, so that we maintain data hygiene and comply with data retention policies.

#### Acceptance Criteria

1. WHEN the cleanup job runs THEN the system SHALL identify all shops where deletedAt is more than 30 days in the past
2. WHEN shops are identified for permanent deletion THEN the system SHALL permanently delete the shop records from the database
3. WHEN the cleanup job runs THEN the system SHALL execute at least once per day
4. WHEN shops are permanently deleted THEN the system SHALL also delete associated data including products, orders, and team memberships
5. WHEN the cleanup job completes THEN the system SHALL log the number of shops permanently deleted

### Requirement 6

**User Story:** As a shop owner, I want to see how many days remain before my deleted shop is permanently removed, so that I can make an informed decision about restoration.

#### Acceptance Criteria

1. WHEN viewing a deleted shop THEN the system SHALL calculate days remaining as 30 minus the number of days since deletedAt
2. WHEN days remaining is greater than 7 THEN the system SHALL display the count in normal styling
3. WHEN days remaining is 7 or fewer THEN the system SHALL display the count with warning styling
4. WHEN days remaining is 1 or fewer THEN the system SHALL display the count with urgent styling
5. WHEN calculating days remaining THEN the system SHALL use the current date and the deletedAt timestamp
