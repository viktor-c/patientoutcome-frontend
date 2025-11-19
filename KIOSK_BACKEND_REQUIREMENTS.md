# Kiosk & Consultation Notes Backend Requirements

## Summary
This document outlines the backend API endpoints needed to support the requested frontend features.

## Current Backend Status

### ✅ Already Implemented
1. **Kiosk Management**
   - `POST /kiosk/:kioskUserId/consultation/:consultationId` - Assign consultation to kiosk
   - `DELETE /kiosk/:kioskUserId/consultation` - Revoke/unlink consultation from kiosk
   - `GET /kiosk/:kioskUserId/consultation` - Get consultation for specific kiosk user

2. **User Management**
   - `GET /user/kiosk-users` - Get all users with kiosk role

3. **Consultation Management**
   - `PUT /consultation/:consultationId` - Update consultation (includes notes)
   - Notes are part of the consultation model already

### ❌ Missing Backend Endpoints

#### 1. Get Available Kiosk Users (Not Assigned)
**Endpoint:** `GET /user/kiosk-users/available`

**Purpose:** Return only kiosk users that don't currently have an active consultation assigned

**Implementation needed in:**
- `patientoutcome-backend/src/api/user/userRouter.ts` - Add route
- `patientoutcome-backend/src/api/user/userController.ts` - Add controller method
- `patientoutcome-backend/src/api/user/userService.ts` - Add service method

**Logic:**
```typescript
async getAvailableKioskUsers() {
  // 1. Get all kiosk users
  const kioskUsers = await userRepository.findAllByRoleAsync("kiosk")
  
  // 2. Get all active kiosk entries
  const activeKiosks = await kioskRepository.getAllKiosks()
  
  // 3. Filter out users that have active kiosk entries
  const activeKioskUserIds = activeKiosks.map(k => k.kioskUserId.toString())
  const availableUsers = kioskUsers.filter(u => !activeKioskUserIds.includes(u._id.toString()))
  
  return availableUsers
}
```

#### 2. Get All Kiosks with Details
**Endpoint:** `GET /kiosk` or `GET /kiosk/all`

**Purpose:** Get all kiosk entries with populated user and consultation data for admin view

**Implementation needed in:**
- `patientoutcome-backend/src/api/kiosk/kioskRouter.ts` - Add route
- `patientoutcome-backend/src/api/kiosk/kioskController.ts` - Add controller method
- `patientoutcome-backend/src/api/kiosk/kioskService.ts` - Add service method

**Response Shape:**
```typescript
{
  kioskUserId: User,          // Populated user object
  consultationId: Consultation, // Populated consultation with forms
  assignedAt: Date,           // When consultation was assigned
  lastAccessed: Date,         // Last time kiosk accessed the consultation
  status: {
    opened: boolean,          // Has the kiosk opened the consultation
    completed: boolean        // Has the consultation been completed
  }
}
```

**Logic:**
```typescript
async getAllKiosks() {
  const kiosks = await kioskRepository.getAllKiosks() // Already exists
  // kiosks should be populated with user and consultation data
  return kiosks
}
```

## Frontend Implementation Plan

### 1. Consultation Overview - Notes Card ✅
- Display existing notes from `consultation.notes`
- Add button to create new notes
- Use `PUT /consultation/:consultationId` to update notes array
- Each note has: `note`, `createdBy`, `dateCreated`, `dateModified`

### 2. Consultation Overview - Kiosk Assignment ⚠️
- Add dropdown/autocomplete to select kiosk user
- Use `GET /user/kiosk-users/available` to populate dropdown (NEEDS BACKEND)
- Use `POST /kiosk/:kioskUserId/consultation/:consultationId` to assign ✅
- Show current kiosk assignment if exists
- Button to revoke assignment using `DELETE /kiosk/:kioskUserId/consultation` ✅

### 3. Kiosk List View ⚠️
- New view: `src/views/Kiosk/KioskListView.vue`
- Use `GET /kiosk/all` to fetch all kiosk assignments (NEEDS BACKEND)
- Display table/cards with:
  - Kiosk user name
  - Assigned consultation details
  - Assignment date
  - Status (opened, completed)
  - Action button to revoke
- Use `DELETE /kiosk/:kioskUserId/consultation` to revoke ✅

## Implementation Priority

### Phase 1: Works with Current Backend
1. ✅ Add notes card to ConsultationOverview (using existing consultation update API)
2. ⚠️ Add kiosk dropdown (can use `GET /user/kiosk-users` but will show ALL kiosk users, not just available ones)
3. ✅ Add assign/revoke buttons (using existing kiosk endpoints)

### Phase 2: Requires Backend Changes
4. ❌ Filter kiosk dropdown to show only available users (needs new endpoint)
5. ❌ Create KioskListView with full status (needs new endpoint)

## Recommendation

**Option A: Implement Phase 1 now** (works with current backend, some limitations)
- Notes functionality: Full feature
- Kiosk assignment: Works but dropdown shows all kiosk users (may assign to one that's already assigned)

**Option B: Add backend endpoints first** (complete solution)
- Requires backend changes and API regeneration
- Then implement all frontend features

Which approach would you prefer?
