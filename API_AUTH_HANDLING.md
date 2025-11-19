# API Authentication & Error Handling

## Problem
When the user's session expires or authentication fails, API requests return 401 Unauthorized errors. Previously, these errors were not handled centrally, causing the app to appear to work while actually failing silently.

## Solution Implemented
A centralized authentication middleware has been added to handle 401 Unauthorized responses globally across all API calls.

### Current Implementation (typescript-fetch with Middleware)

**Location:** `src/api/middleware/authMiddleware.ts`

This middleware:
1. Intercepts all API responses
2. Checks for 401 Unauthorized status
3. Automatically logs out the user via the user store
4. Redirects to the login page with a session-expired indicator
5. Throws an error to prevent further processing of failed requests

**Configuration:** `src/api.ts`
All API clients are configured with this middleware, so every API call is automatically protected.

### How It Works

```typescript
// authMiddleware checks every API response
if (response.status === 401) {
  // 1. Log out user
  await userStore.logout()
  
  // 2. Redirect to login
  router.push({ name: 'login', query: { reason: 'session-expired' } })
  
  // 3. Throw error to stop further processing
  throw new Error('Unauthorized: Session expired')
}
```

### Benefits
- ✅ **Centralized:** One place to handle all auth errors
- ✅ **Automatic:** No need to manually check for 401 in every component
- ✅ **User-friendly:** Immediate logout and redirect on session expiry
- ✅ **Type-safe:** Works with generated TypeScript API clients
- ✅ **No manual API calls:** Keeps the benefit of OpenAPI code generation

---

## Alternative: Switching to Axios (Future Consideration)

If you want even easier interceptor management in the future, you can switch to axios-based API generation:

### Benefits of Axios
- More mature and widely-used interceptor system
- Better error handling capabilities
- Easier to mock for testing
- More community support and examples

### How to Switch to Axios

1. **Regenerate API with axios generator:**
   ```bash
   rm -rf src/api && npx @openapitools/openapi-generator-cli generate -i http://localhost:40001/openapi/v1/swagger.json -g typescript-axios -o src/api
   ```

2. **Install axios if not already present:**
   ```bash
   npm install axios
   ```

3. **Create axios interceptor:**
   ```typescript
   // src/api/interceptors/authInterceptor.ts
   import type { AxiosError, AxiosResponse } from 'axios'
   import { useUserStore } from '@/stores/userStore'
   import router from '@/router'
   
   export const setupAuthInterceptor = (axiosInstance: any) => {
     axiosInstance.interceptors.response.use(
       (response: AxiosResponse) => response,
       async (error: AxiosError) => {
         if (error.response?.status === 401) {
           const userStore = useUserStore()
           await userStore.logout()
           router.push({ name: 'login', query: { reason: 'session-expired' } })
         }
         return Promise.reject(error)
       }
     )
   }
   ```

4. **Update configuration in src/api.ts:**
   ```typescript
   import axios from 'axios'
   import { Configuration, UserApi, /* other APIs */ } from '@/api'
   import { setupAuthInterceptor } from '@/api/interceptors/authInterceptor'
   
   const axiosInstance = axios.create({
     baseURL: import.meta.env.VITE_API_URL,
     withCredentials: true
   })
   
   setupAuthInterceptor(axiosInstance)
   
   const apiConfig = new Configuration({
     basePath: import.meta.env.VITE_API_URL,
   })
   
   export const userApi = new UserApi(apiConfig, undefined, axiosInstance)
   // ... other APIs
   ```

### Comparison

| Feature | typescript-fetch (Current) | typescript-axios |
|---------|---------------------------|------------------|
| Bundle size | Smaller (uses native fetch) | Larger (+axios dependency) |
| Setup complexity | Middleware syntax | Interceptor syntax (simpler) |
| Browser compatibility | Modern browsers only | Wider compatibility |
| Error handling | Works (via middleware) | More intuitive |
| Community support | Good | Excellent |
| Testing/Mocking | Requires more setup | Easier with axios-mock-adapter |

---

## Recommendations

### For Now: Keep Current Implementation ✅
The middleware solution works well and requires no additional dependencies. The current implementation:
- Handles all 401 errors centrally
- Auto-logs out users on session expiry
- Maintains type safety and code generation benefits
- Has minimal overhead

### Future: Consider Axios if...
- You need more complex request/response transformations
- You want easier testing setup
- You're adding more API providers/services
- The team is more familiar with axios patterns

---

## Testing the Implementation

### Manual Testing
1. Log in to the application
2. Wait for session to expire (or manually clear session cookie in browser DevTools)
3. Try to perform any action that makes an API call
4. Should see console warning and automatic redirect to login page

### What to Look For
- Console message: `"Authentication failed: 401 Unauthorized detected. Logging out user."`
- Automatic redirect to `/` (login page)
- Query parameter: `?reason=session-expired`
- User store cleared
- No more silent failures

---

## Troubleshooting

### Issue: Router import error
**Symptom:** `Cannot read property 'push' of undefined`
**Fix:** Ensure router is exported as default in `src/router/index.ts`:
```typescript
export default router
```

### Issue: Infinite redirect loop
**Symptom:** Constantly redirecting to login
**Fix:** Make sure login page doesn't make authenticated API calls on mount

### Issue: User store not clearing
**Symptom:** User data persists after 401
**Fix:** Verify `userStore.logout()` properly clears all state

---

## Additional Improvements

### Show User-Friendly Message
Update `LoginView.vue` to show a message when redirected due to session expiry:

```typescript
// In LoginView.vue
import { useRoute } from 'vue-router'

const route = useRoute()
const sessionExpired = computed(() => route.query.reason === 'session-expired')

// In template:
<v-alert v-if="sessionExpired" type="warning" class="mb-4">
  {{ t('auth.sessionExpired') }}
</v-alert>
```

### Add to i18n:
```typescript
// en.ts
auth: {
  sessionExpired: 'Your session has expired. Please log in again.'
}

// de.ts
auth: {
  sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
}
```

---

## Summary

✅ **Implemented:** Centralized 401 error handling via middleware
✅ **Works with:** Current OpenAPI typescript-fetch generator
✅ **No dependencies added:** Uses existing infrastructure
✅ **Future-proof:** Can easily migrate to axios if needed

The authentication error handling is now centralized and automatic across your entire application!
