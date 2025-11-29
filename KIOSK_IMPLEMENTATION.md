# Kiosk User Role Implementation

This document describes the implementation of the "kiosk" user role functionality for the Patient Outcome Frontend application.

## Overview

The kiosk user role is designed for special display terminals that show consultation information and forms for patients. When a user with the "kiosk" role logs in, they are directed to a specialized view that displays their assigned consultation and available forms.

## Components Added/Modified

### 1. User Store (`src/stores/userStore.ts`)
- Added `role` field to track user roles
- Added `isKioskUser()` method to check if the current user has the "kiosk" role
- Updated `SessionData` interface to include optional `role` field
- Updated `setSession()` and `clearSession()` methods to handle the role field

### 2. KioskView Component (`src/views/KioskView.vue`)
- New Vue component that provides a kiosk-specific interface
- Displays consultation information including patient code and consultation date
- Shows a list of forms that need to be completed for the consultation
- Uses the `kioskApi.getConsultation()` method to fetch consultation data
- Provides buttons to navigate to form completion

### 3. Router Configuration (`src/router/index.ts`)
- Added `/kiosk` route that maps to the KioskView component
- Updated navigation guards to:
  - Redirect kiosk users to the kiosk view upon login
  - Restrict kiosk users to only access kiosk-related routes
  - Allow kiosk users to access form completion routes

### 4. API Integration (`src/api.ts`)
- Added `kioskApi` instance for making kiosk-related API calls
- Imported and configured `KioskApi` from the generated API client

### 5. Internationalization
- Added translations for kiosk-related UI elements in both English (`src/locales/en.ts`) and German (`src/locales/de.ts`)
- Includes translations for:
  - Kiosk title and welcome messages
  - Consultation information labels
  - Form status indicators
  - Error and loading messages

### 6. Login View Updates (`src/views/LoginView.vue`)
- Updated to handle role information from login response
- Modified redirect logic to respect user roles after login

## Backend API Integration

The implementation uses the following API endpoints:

### KioskApi Endpoints
- `GET /kiosk/consultation` - Gets the current active consultation for the logged-in kiosk user
- `PUT /kiosk/consultation/status` - Updates consultation status for the kiosk user

## User Flow

1. **Login**: A user with "kiosk" role logs in through the standard login form
2. **Redirect**: The application automatically redirects them to `/kiosk` 
3. **Consultation Display**: The kiosk view loads and displays:
   - Consultation information (patient code, date, reason)
   - List of forms to be completed
   - Status of each form (completed/pending)
4. **Form Access**: Users can click on forms to start filling them out
5. **Restricted Navigation**: Kiosk users cannot access other parts of the application

## Role Detection

Currently, the role is expected to be provided by the backend login API. The frontend checks for a `role` field in the login response and stores it in the user session.

**Note**: If the backend doesn't yet provide the `role` field in the login response, you'll need to:
1. Update the backend API to include role information in the login response
2. Ensure the API models are regenerated to include the role field
3. Test with a user that has the "kiosk" role assigned

## Navigation Guards

The router includes guards that:
- Prevent unauthorized access to kiosk routes
- Restrict kiosk users to appropriate routes only
- Automatically redirect users based on their role after login

Allowed routes for kiosk users:
- `/kiosk` - Main kiosk view
- `/consultation/forms/consultation/:consultationId` - Form completion
- `/consultation/forms/external-code/:externalCode` - Form completion via external code

## Error Handling

The kiosk view includes proper error handling for:
- Failed consultation loading
- Missing consultation data
- Network connectivity issues
- API errors

Users can refresh the consultation data using the refresh button.

## Styling

The kiosk view uses a clean, card-based layout optimized for touch interfaces:
- Large, clearly labeled sections
- High contrast colors for form status
- Prominent action buttons
- Responsive design for different screen sizes

## Future Enhancements

Potential improvements could include:
- Auto-refresh of consultation data
- Offline mode support
- Voice navigation
- Accessibility improvements for different user needs
- Multi-language support expansion
