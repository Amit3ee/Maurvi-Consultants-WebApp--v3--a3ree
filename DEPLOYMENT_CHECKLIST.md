# Deployment Checklist for Login Screen Redesign

## ✅ Pre-Deployment Verification

### Code Verification (Completed)
- [x] Backend functions implemented (6 new functions)
- [x] Frontend UI redesigned with social login buttons
- [x] Guest OTP workflow implemented
- [x] Email notifications configured
- [x] Session management updated
- [x] Error handling added
- [x] Documentation created

### Files Changed
- [x] `code.gs` - Added 557 new lines (user management + guest OTP)
- [x] `index.html` - Updated 262 lines (new login UI)
- [x] `LOGIN_REDESIGN.md` - New documentation file

## 📋 Deployment Steps

### 1. Deploy to Google Apps Script

```bash
# These changes should be deployed via the Apps Script editor
1. Open Google Apps Script project
2. Copy updated code.gs content
3. Copy updated index.html content
4. Save both files
5. Deploy as new version (or update existing deployment)
```

### 2. Test Backend Functions

In Apps Script editor, test these functions manually:

```javascript
// Test 1: Generate guest OTP
generateGuestOTP()
// Expected: OTP email sent to admin

// Test 2: Register test user
registerSocialUser("test@example.com", "Test User", "google")
// Expected: Registration email sent to admin

// Test 3: List users
listRegisteredUsers()
// Expected: Returns list of registered users

// Test 4: Approve test user
approveUser("test@example.com")
// Expected: Approval email sent to user
```

### 3. Configure OAuth Providers (Optional - for full social login)

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized JavaScript origins:
   - `https://script.google.com`
   - Your web app URL
6. Update `initGoogleSignIn()` in index.html with Client ID

#### Microsoft OAuth Setup
1. Go to [Azure Portal](https://portal.azure.com)
2. Register new application
3. Configure redirect URIs
4. Get Application (client) ID
5. Update `initMicrosoftSignIn()` in index.html with Client ID

#### Apple OAuth Setup
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create Service ID for Sign in with Apple
3. Configure domains and return URLs
4. Get Service ID
5. Update `initAppleSignIn()` in index.html with Service ID

## 🧪 Testing Checklist

### Guest Login Testing
- [ ] Click "Request Guest OTP"
- [ ] Verify OTP email received by admin
- [ ] Enter OTP in login screen
- [ ] Verify successful login
- [ ] Check 24-hour session works

### Social Login Testing (After OAuth setup)
- [ ] Click "Continue with Google"
- [ ] Complete Google authentication
- [ ] Verify registration email sent to admin
- [ ] Verify "Waiting for Approval" message shown
- [ ] Run `approveUser()` function
- [ ] Verify approval email sent to user
- [ ] Login again - should work without OTP

### UI Testing
- [ ] Test in Chrome (desktop)
- [ ] Test in Safari (desktop)
- [ ] Test in Firefox (desktop)
- [ ] Test on mobile devices
- [ ] Test dark/light mode toggle
- [ ] Test theme toggle on login screen
- [ ] Test background toggle on login screen

### Security Testing
- [ ] Verify unapproved users cannot access app
- [ ] Verify OTP expires after 3 minutes
- [ ] Verify sessions expire after 24 hours
- [ ] Verify only admin can approve users
- [ ] Test invalid OTP handling
- [ ] Test expired OTP handling

## 📧 Email Configuration

Ensure Gmail API permissions are granted:
1. Go to Apps Script project
2. Run any email function once
3. Authorize Gmail permissions when prompted

## 🔧 Admin Operations

### Approving Users

Open Apps Script editor and run:
```javascript
approveUser("user@example.com")
```

### Viewing All Users

```javascript
var result = listRegisteredUsers();
Logger.log(JSON.stringify(result, null, 2));
```

### Checking User Status

```javascript
var status = checkUserApproval("user@example.com");
Logger.log(JSON.stringify(status, null, 2));
```

## 🚨 Troubleshooting

### Issue: OTP not received
**Solution:** Check Apps Script execution logs, verify ADMIN_EMAIL is correct

### Issue: Social login shows "coming soon"
**Solution:** This is expected until OAuth is configured (see section 3 above)

### Issue: User approval not working
**Solution:** 
1. Check PropertiesService has write permissions
2. Run `listRegisteredUsers()` to verify data
3. Check execution logs for errors

### Issue: Session expires too quickly
**Solution:** Check CacheService TTL settings (default is 24 hours)

## 📊 Monitoring

After deployment, monitor:
- [ ] Apps Script execution logs
- [ ] Email delivery success rate
- [ ] User registration rate
- [ ] Approval request backlog
- [ ] Failed login attempts

## 🔄 Rollback Plan

If issues occur:
1. Revert to previous deployment version in Apps Script
2. Previous commit: `50bf966` (before this PR)
3. All data in PropertiesService persists (no data loss)

## 📝 Post-Deployment Tasks

- [ ] Update README.md with new login instructions
- [ ] Notify users about new login options
- [ ] Create admin guide for user approval
- [ ] Set up monitoring for registration emails
- [ ] Document OAuth setup process
- [ ] Train admin on approval workflow

## ✅ Success Criteria

Deployment is successful when:
- [x] Backend functions execute without errors
- [x] Guest OTP emails are received
- [x] Login screen renders correctly
- [ ] Social login redirects work (after OAuth setup)
- [ ] User approval workflow works end-to-end
- [ ] Sessions persist for 24 hours
- [ ] All emails are delivered successfully

## 🎉 Go Live

Once all checks pass:
1. Enable web app for production
2. Share login URL with users
3. Monitor first 24 hours closely
4. Be ready to approve new users
5. Collect user feedback

---

**Note:** OAuth integration (Step 3) is optional. The system works fully with guest login only. Social login will show "coming soon" until OAuth is configured.
