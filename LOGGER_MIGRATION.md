# Frontend Logger Migration Guide

## Overview

The frontend has a structured logger service (`src/services/logger.ts`) that should be used for **important events** while keeping `console.*` for browser debugging.

## When to Use Logger vs Console

### Use Structured Logger For:
- ✅ **Errors** - All `console.error()` calls
- ✅ **Warnings** - All `console.warn()` calls  
- ✅ **Important Events** - User actions, authentication, form submissions, API failures
- ✅ **Application State Changes** - Setup complete, logout, registration success

### Keep Console For:
- ✅ **Debug Information** - `console.debug()` for development
- ✅ **Development Logging** - Temporary logs during feature development
- ✅ **Component Lifecycle** - Component mount/unmount debugging

## Migration Pattern

### Before (Console Only):
```typescript
// ❌ No context, not persisted, hard to track
console.error('Login failed:', error)
console.warn('Username not available')
console.log('Form submitted')
```

### After (Structured Logger):
```typescript
import { logger } from '@/services/logger'

// ✅ Structured, persisted, searchable
logger.error('Login failed', { username, error })
logger.warn('Username not available', { username })
logger.info('Form submitted successfully', { formId, userId })

// Keep console for debugging
console.debug('Component data:', componentState)
```

## Step-by-Step Migration

### 1. Add Import
```typescript
import { logger } from '@/services/logger'
```

### 2. Replace Error Logs
```typescript
// Before
catch (error) {
  console.error('Failed to fetch data:', error)
}

// After
catch (error) {
  logger.error('Failed to fetch data', { endpoint, userId, error })
}
```

### 3. Replace Warning Logs
```typescript
// Before
if (!isValid) {
  console.warn('Validation failed')
}

// After
if (!isValid) {
  logger.warn('Validation failed', { field, value })
}
```

### 4. Add Info Logs for Important Events
```typescript
// Before
await apiClient.submitForm(...)
// No logging

// After
await apiClient.submitForm(...)
logger.info('Form submitted successfully', { formId, consultationId })
```

## File-by-File Migration Checklist

### High Priority (User-Facing Errors)

- [ ] **LoginView.vue**
  - [ ] Setup check errors → `logger.error()`
  - [ ] Login errors → `logger.error()`
  - [ ] Successful login → `logger.info()`

- [ ] **RegisterView.vue**
  - [ ] Username check errors → `logger.warn()`
  - [ ] Registration errors → `logger.error()`
  - [ ] Successful registration → `logger.info()`

- [ ] **LogoutView.vue**
  - [ ] Logout errors → `logger.error()`
  - [ ] Successful logout → `logger.info()`

- [ ] **SetupView.vue**
  - [ ] Setup errors → `logger.error()`
  - [ ] Admin creation → `logger.info()`
  - [ ] Data seeding → `logger.info()`

### Medium Priority (Feature Errors)

- [ ] **FeedbackView.vue**
  - [ ] Captcha errors → `logger.warn()` / `logger.error()`
  - [ ] Submission errors → `logger.error()`
  - [ ] Successful submission → `logger.info()`

- [ ] **ActivityLogView.vue**
  - [ ] SSE connection errors → `logger.error()`
  - [ ] SSE parsing errors → `logger.error()`
  - [ ] Connection established → `logger.info()`

- [ ] **FormView.vue**
  - [ ] Data fetch errors → `logger.error()`
  - [ ] Form submission → `logger.info()`
  - Keep `console.debug()` for form data changes

- [ ] **KioskView.vue**
  - [ ] Load errors → `logger.error()`
  - [ ] Kiosk session start → `logger.info()`

- [ ] **Kiosk/KioskListView.vue**
  - [ ] Fetch errors → `logger.error()`
  - [ ] Revoke access → `logger.info()`

- [ ] **KioskForm.vue**
  - [ ] Form fetch errors → `logger.error()`
  - [ ] Form submission → `logger.info()`
  - Keep `console.log()` for debugging

- [ ] **PatientFlow/BeginPatientFlowView.vue**
  - [ ] Code validation errors → `logger.warn()`
  - [ ] Flow start errors → `logger.error()`
  - Keep `console.debug()` for flow debugging

### Low Priority

- [ ] **api.ts**
  - [ ] API initialization → `logger.info()`
  - Keep `console.debug()` for config debugging

## Example Implementations

### Login Error Example
```typescript
// File: LoginView.vue
import { logger } from '@/services/logger'

const handleLogin = async () => {
  try {
    await apiClient.login({ username: username.value, password: password.value })
    logger.info('User logged in successfully', { username: username.value })
    router.push({ name: 'home' })
  } catch (error) {
    logger.error('Login failed', { 
      username: username.value, 
      error: error instanceof Error ? error.message : String(error)
    })
    errorMessage.value = t('login.error')
  }
}
```

### API Error Example
```typescript
// File: FormView.vue
import { logger } from '@/services/logger'

const fetchConsultation = async () => {
  try {
    const data = await apiClient.getConsultation({ consultationId: route.params.consultationId })
    console.log('FormView: Consultation data fetched successfully:', data) // Keep for debugging
    consultationData.value = data
  } catch (error) {
    logger.error('Failed to fetch consultation data', {
      consultationId: route.params.consultationId,
      error: error instanceof Error ? error.message : String(error)
    })
    errorMessage.value = 'Failed to load consultation data'
  }
}
```

### Warning Example
```typescript
// File: RegisterView.vue
import { logger } from '@/services/logger'

const checkUsernameAvailability = async () => {
  try {
    const response = await apiClient.checkUsername({ username: username.value })
    usernameAvailable.value = response.available
    if (!response.available) {
      logger.warn('Username already taken', { username: username.value })
    }
  } catch (error) {
    logger.warn('Username availability check failed', { 
      username: username.value, 
      error 
    })
  }
}
```

### SSE Connection Example
```typescript
// File: ActivityLogView.vue
import { logger } from '@/services/logger'

const connectSSE = () => {
  console.debug('Connecting to SSE at', `${baseURL}/activitylog/stream`) // Keep
  
  eventSource.onopen = () => {
    console.log('📡 Connected to activity log stream') // Keep for immediate feedback
    logger.info('SSE connection established', { endpoint: 'activitylog/stream' })
    connectionError.value = false
  }
  
  eventSource.onerror = (error) => {
    logger.error('SSE connection error', { endpoint: 'activitylog/stream', error })
    connectionError.value = true
  }
}
```

## Testing Your Changes

### 1. Verify Logger Works
```typescript
// In browser console
logger.getLocalLogs()  // Should show your new log entries
logger.exportLogs()    // Should include structured data
```

### 2. Check Docker Logs
```bash
# Frontend logs should include important events
docker logs patientoutcome-frontend-dev | grep -E "Login|Register|Error"
```

### 3. Verify Local Storage
```typescript
// In browser console
localStorage.getItem('app_logs')
```

## Benefits

Once migrated, you'll have:

✅ **Searchable History** - Filter logs by level, message, data  
✅ **Persistent Storage** - Logs survive page refresh  
✅ **Downloadable Logs** - Users can download logs for support  
✅ **Structured Data** - Context included with every log  
✅ **Error Tracking** - All errors automatically captured  
✅ **Remote Logging** - Ready for backend log collection (optional)

## Best Practices

1. **Always Include Context**
   ```typescript
   // ❌ Bad
   logger.error('Failed')
   
   // ✅ Good
   logger.error('Failed to submit form', { formId, userId, error })
   ```

2. **Use Appropriate Levels**
   ```typescript
   logger.error()  // System errors, API failures
   logger.warn()   // Validation issues, recoverable problems
   logger.info()   // Important user actions, state changes
   logger.debug()  // Detailed debugging (use sparingly)
   ```

3. **Keep Console for Development**
   ```typescript
   // These are fine to keep
   console.debug('Component mounted with props:', props)
   console.log('Current form state:', formState)
   ```

4. **Don't Log Sensitive Data**
   ```typescript
   // ❌ Bad
   logger.info('User logged in', { password: password.value })
   
   // ✅ Good
   logger.info('User logged in', { username: username.value })
   ```

## Quick Reference

```typescript
import { logger } from '@/services/logger'

// Basic usage
logger.debug('Debug message')
logger.info('Info message')
logger.warn('Warning message')
logger.error('Error message')

// With structured data
logger.error('API call failed', { 
  endpoint: '/api/users',
  status: 500,
  error: error.message 
})

// Browser utilities
logger.getLocalLogs()     // Get all stored logs
logger.downloadLogs()     // Download as JSON file
logger.clearLocalLogs()   // Clear storage
logger.exportLogs()       // Get as JSON string
```

## Migration Progress Tracking

Create checkboxes as you complete each file:

```markdown
## Completed
- [x] main.ts (already done)
- [x] api.ts

## In Progress
- [ ] LoginView.vue
- [ ] RegisterView.vue

## Todo
- [ ] FormView.vue
- [ ] KioskView.vue
...
```

Keep track in your own document or issue tracker.
