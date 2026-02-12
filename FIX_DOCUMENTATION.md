# Fix: Removed Forced Manus OAuth Login Redirect

## Problem
The site was forcing all visitors to log in via Manus OAuth, even when trying to access public pages like the home page. This happened even in incognito mode.

## Root Cause
In `/client/src/main.tsx`, there was a global error handler that automatically redirected users to the Manus OAuth login page whenever ANY tRPC query returned an "UNAUTHORIZED" error:

```typescript
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl(); // ← Automatic redirect!
};
```

This meant that when an unauthenticated user visited the home page:
1. The `useAuth()` hook would call `trpc.auth.me.useQuery()`
2. The server would return an UNAUTHORIZED error (no session cookie)
3. The global error handler would catch this and redirect to Manus OAuth login
4. User would be forced to log in just to view the home page

## Solution
**Removed the automatic redirect logic** from `/client/src/main.tsx`. Now the error handlers only log errors for debugging purposes:

```typescript
// Log errors for debugging but don't auto-redirect to login
// Individual components should handle authentication requirements
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    console.error("[API Query Error]", error);
  }
});
```

## Changes Made
1. **Removed** `redirectToLoginIfUnauthorized()` function
2. **Removed** automatic redirect calls from query and mutation error handlers
3. **Removed** unused imports (`UNAUTHED_ERR_MSG`, `TRPCClientError`, `getLoginUrl`)
4. **Kept** error logging for debugging purposes

## Expected Behavior After Fix
- ✅ Unauthenticated users can visit the home page without being redirected
- ✅ Public pages (home, pricing, how-to) are accessible without login
- ✅ Protected pages (dashboard, discover, etc.) still require authentication
- ✅ Individual components handle their own authentication requirements
- ✅ Users can choose to sign up or log in via buttons on the home page

## Testing
Due to persistent OAuth authentication in the development environment, this fix requires testing in a true incognito browser session by the end user.

### How to Test:
1. Open an incognito/private browser window
2. Navigate to the site's home page
3. **Expected**: You should see the home page with "Get Started Free" and "Sign In" buttons
4. **Expected**: You should NOT be redirected to Manus OAuth login
5. Click "Sign In" or "Get Started Free" to voluntarily initiate authentication

## Architecture Note
This fix aligns with the user's requirement: **"Do not force a redirect to a specific external login page upon initial site visit; instead, allow direct access to the site with the option to sign up or log in."**

Individual components that require authentication should use the `useAuth()` hook with the `redirectOnUnauthenticated` option if needed, rather than relying on global redirect behavior.
