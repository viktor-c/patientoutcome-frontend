# Middleware

This folder contains custom middleware that is **NOT** auto-generated.

## Important
**Do not move this folder into `/src/api/`** - The `/src/api/` directory is auto-generated and gets deleted/recreated when regenerating API code.

## Files

### authMiddleware.ts
Global authentication middleware for API requests.

**Behavior:**
- **401 Unauthorized**: User not logged in → automatically logout and redirect to login page
- **403 Forbidden**: User lacks permission → let component handle the error gracefully

**Usage:**
This middleware is automatically applied to all API clients in `src/api.ts`.
