# Login Screen Redesign Documentation

## Overview

The login screen has been completely redesigned to support two authentication methods:
1. **Social Login** - Sign in with Google, Microsoft, or Apple accounts (with admin approval)
2. **Guest Login** - Temporary access using OTP sent to admin

## Features Implemented

### 1. Social Login

Users can sign in using their existing accounts from:
- **Google** - OAuth 2.0 integration
- **Microsoft** - Azure AD integration  
- **Apple** - Sign in with Apple integration

#### User Flow:
1. User clicks social login button (Google/Microsoft/Apple)
2. User completes OAuth authentication with provider
3. Backend registers user and sends approval request to admin
4. User sees "Waiting for Approval" message
5. Admin receives email and approves user via Apps Script
6. User receives approval email
7. User can now sign in without OTP using their social account

### 2. Guest Login

Guest users can request temporary access using OTP:

#### Guest Flow:
1. User clicks "Request Guest OTP" button
2. OTP is generated and sent to admin email (amit3ree@gmail.com)
3. User sees message: "OTP sent to admin. Please ask admin for the code."
4. Admin shares the 6-digit OTP with guest
5. Guest enters OTP in the login screen
6. Guest gains temporary access (24-hour session)

## Backend Functions Added

### User Management Functions

```javascript
// Register new social login user
registerSocialUser(email, name, provider)

// Check if user is approved
checkUserApproval(email)

// Approve user (admin function)
approveUser(email)

// List all registered users (admin function)
listRegisteredUsers()

// Verify social login token and create session
verifySocialLogin(idToken, provider)
```

### Guest Login Functions

```javascript
// Generate guest OTP (sent to admin)
generateGuestOTP()

// Verify guest OTP
verifyGuestOTP(otp)
```

## Admin Functions

### Approving Users

To approve a user, admin needs to run this in Apps Script editor:

```javascript
approveUser("user@example.com")
```

### Viewing Registered Users

To see all registered users:

```javascript
listRegisteredUsers()
```

This will return a list of all users with their approval status.

## Email Notifications

### New User Registration
Admin receives an email when a new user registers:
- User's name and email
- Provider used (Google/Microsoft/Apple)
- Registration timestamp
- Instructions to approve

### User Approval
User receives an email when approved:
- Confirmation of approval
- Instructions to sign in
- Provider information

### Guest OTP Request
Admin receives an email with:
- 6-digit OTP code (formatted as XXX-XXX)
- Validity duration (3 minutes)
- Information that it's a guest request

## Security Features

1. **User Approval Workflow** - All new social logins require admin approval
2. **Session Management** - 24-hour sessions with automatic refresh
3. **OTP Expiration** - Guest OTPs expire after 3 minutes
4. **Secure Storage** - User data stored in PropertiesService
5. **Admin-Only Approval** - Only admin can approve new users

## OAuth Integration (To Be Completed)

The current implementation has placeholders for OAuth integration. To complete:

### Google Sign-In
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add authorized JavaScript origins
3. Implement using Google Identity Services:
   ```html
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   ```
4. Initialize in `initGoogleSignIn()` function

### Microsoft Sign-In
1. Register app in Azure Portal
2. Configure redirect URIs
3. Implement using MSAL.js:
   ```html
   <script src="https://alcdn.msauth.net/browser/2.x.x/js/msal-browser.min.js"></script>
   ```
4. Initialize in `initMicrosoftSignIn()` function

### Apple Sign-In
1. Configure Sign in with Apple in Apple Developer Portal
2. Create Service ID
3. Implement using Sign in with Apple JS:
   ```html
   <script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>
   ```
4. Initialize in `initAppleSignIn()` function

## UI Components

### Social Login Section
- Three branded buttons (Google, Microsoft, Apple)
- Hover effects with brand colors
- "Waiting for Approval" state with spinner
- Clear separation from guest login

### Guest Login Section
- 6-digit OTP input (XXX-XXX format)
- "Request Guest OTP" button
- Helper text explaining the process
- Timer showing OTP validity

### Visual Design
- Glassmorphic material design
- Smooth animations and transitions
- Dark/Light mode support
- Responsive layout

## Testing

### Testing Social Login (Mock)
Add `?test_google_oauth=true` to URL to simulate Google OAuth:
```
http://localhost:8080/?test_google_oauth=true
```

### Testing Guest Login
1. Click "Request Guest OTP"
2. Check admin email for OTP
3. Enter OTP in the input fields
4. Should login successfully

## Migration Notes

### For Existing Admin User
The existing admin user (amit3ree@gmail.com) is automatically approved for all login methods and bypasses the approval workflow.

### Data Storage
- User data: PropertiesService (`registeredUsers` property)
- Sessions: CacheService (24-hour TTL)
- OTPs: CacheService (3-minute TTL)

## Known Limitations

1. OAuth providers not yet integrated (placeholders show "coming soon")
2. Token verification uses simple base64 encoding (needs proper JWT verification)
3. No admin UI for managing approvals (use Apps Script functions)
4. Single admin email only (hardcoded)

## Future Enhancements

1. Complete OAuth integration for all providers
2. Add admin dashboard for user management
3. Support multiple admin emails
4. Add user roles and permissions
5. Implement remember me functionality
6. Add password reset for social logins
7. Support for additional OAuth providers (LinkedIn, GitHub, etc.)

## Screenshots

### Login Screen
![Login Screen](https://github.com/user-attachments/assets/172918cc-2379-43c0-bdd9-1215fe750cb7)

The redesigned login screen shows:
- Company logo and branding
- Social login buttons (Google, Microsoft, Apple)
- Visual separator (OR divider)
- Guest login section with OTP inputs
- Helper text and clear messaging
- Dark mode with glassmorphic design
