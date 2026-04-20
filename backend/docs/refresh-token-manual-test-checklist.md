# Refresh Token Manual Test Checklist

Use this checklist to verify the login, refresh, and logout flow end to end.

## 1. Setup
- [ ] Backend is running and connected to the expected database
- [ ] Frontend is running and points to the correct API base URL
- [ ] Browser localStorage and cookies are cleared before testing
- [ ] Test account exists for `CUSTOMER`
- [ ] Test account exists for `EVENT_ORGANIZER`

## 2. Login Flow
- [ ] Open the login page
- [ ] Login with valid email and password
- [ ] Verify API response returns:
  - [ ] `accessToken`
  - [ ] `refreshToken`
  - [ ] `user`
- [ ] Verify frontend stores `accessToken` in localStorage
- [ ] Verify frontend stores `refreshToken` in localStorage
- [ ] Verify user state is updated in the navbar/profile UI
- [ ] Verify protected pages are accessible after login

## 3. Invalid Login Handling
- [ ] Login with wrong password
- [ ] Verify response shows `401`
- [ ] Verify no token is saved in localStorage
- [ ] Login with non-existent email/username
- [ ] Verify response shows `401`
- [ ] Verify no user session is created

## 4. Refresh Token Flow
- [ ] Login successfully
- [ ] Copy the current `accessToken` and `refreshToken` values for reference
- [ ] Force the access token to become invalid by one of these methods:
  - [ ] Manually remove `accessToken` from localStorage
  - [ ] Replace `accessToken` with an invalid string
  - [ ] Wait until the token naturally expires
- [ ] Trigger an authenticated request such as `GET /auth/me`
- [ ] Verify frontend automatically calls `POST /auth/refresh`
- [ ] Verify backend returns a new `accessToken`
- [ ] Verify original request is retried automatically
- [ ] Verify user stays logged in without redirecting to login
- [ ] Verify new `accessToken` is written back to localStorage
- [ ] Verify `refreshToken` remains unchanged unless the flow explicitly rotates it

## 5. Expired Refresh Token Flow
- [ ] Login successfully
- [ ] Replace `refreshToken` with an invalid string
- [ ] Trigger an authenticated request after access token is invalid
- [ ] Verify `POST /auth/refresh` fails with `401`
- [ ] Verify frontend clears auth state
- [ ] Verify localStorage tokens are removed
- [ ] Verify user is redirected or treated as logged out

## 6. Logout Flow
- [ ] Login successfully
- [ ] Click logout from navbar
- [ ] Verify frontend calls `POST /auth/logout`
- [ ] Verify backend removes refresh token record from database
- [ ] Verify `accessToken` is removed from localStorage
- [ ] Verify `refreshToken` is removed from localStorage
- [ ] Verify auth store user becomes `null`
- [ ] Verify protected routes are no longer accessible

## 7. Password Change Impact
- [ ] Login successfully
- [ ] Change password from profile page
- [ ] Verify user is logged out after password change if that is the expected behavior in the frontend flow
- [ ] Verify old refresh token no longer works
- [ ] Login again with the new password
- [ ] Verify new session is created normally

## 8. Multi-Tab Behavior
- [ ] Login in one tab
- [ ] Open the app in a second tab
- [ ] Verify both tabs see the same login state after refresh/bootstrap
- [ ] Logout in one tab
- [ ] Verify the second tab loses session on next auth check
- [ ] Verify refresh attempts fail after logout

## 9. Organizer Role Checks
- [ ] Login as `EVENT_ORGANIZER`
- [ ] Verify organizer-only pages or dashboard routes are accessible
- [ ] Login as `CUSTOMER`
- [ ] Verify organizer-only pages return unauthorized or are blocked in UI

## 10. API-Level Checks
- [ ] `POST /auth/login` returns `accessToken`, `refreshToken`, and `user`
- [ ] `POST /auth/refresh` returns a new `accessToken`
- [ ] `POST /auth/logout` succeeds with a valid refresh token
- [ ] `GET /auth/me` succeeds with a valid access token
- [ ] Protected endpoints return `401` when access token is missing or invalid

## 11. Database Checks
- [ ] After login, a row exists in `refresh_tokens`
- [ ] `tokenHash` is stored, not the raw token
- [ ] `expiresAt` is set to about 7 days from login time
- [ ] After logout, the refresh token row is deleted
- [ ] After using refresh, the existing token row is still valid until logout or expiry

## 12. Cleanup
- [ ] Remove test tokens from localStorage
- [ ] Delete test refresh token rows from database if needed
- [ ] Confirm app starts in a logged-out state on reload

## Expected Outcome
- [ ] Access token can expire without forcing immediate logout
- [ ] Refresh token restores a new access token automatically
- [ ] Logout fully invalidates the session
- [ ] Invalid refresh tokens do not keep the user logged in
