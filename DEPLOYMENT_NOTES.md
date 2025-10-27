# Deployment Notes - v3.1 Fixes

## Quick Deployment Checklist

### Pre-Deployment
- [ ] Backup current deployment URL
- [ ] Note current version number
- [ ] Export copy of current code.gs and index.html
- [ ] Review all changes in this PR

### OAuth Configuration (Required for Issue 1)
- [ ] Create Google OAuth Client ID
- [ ] Create Microsoft Azure App Registration
- [ ] Create Apple Service ID
- [ ] Update placeholders in index.html:
  - Line 14: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
  - Line 17: `YOUR_MICROSOFT_CLIENT_ID`
  - Line 20: `YOUR_APPLE_SERVICE_ID`

### Deployment Steps
1. [ ] Open Google Apps Script project
2. [ ] Copy updated `code.gs` content
3. [ ] Copy updated `index.html` content
4. [ ] Update OAuth credentials (if configuring social login)
5. [ ] Deploy new version:
   - Deploy → New Deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
   - Click "Deploy"
6. [ ] Copy new deployment URL
7. [ ] Test deployment (see Testing section below)

### Post-Deployment Verification
- [ ] Test admin OTP login
- [ ] Test guest login
- [ ] Test social login (if configured)
- [ ] Check Dashboard glowing effects
- [ ] Verify narration toggle
- [ ] Run refresh function if needed
- [ ] Monitor Apps Script logs for errors

## Configuration Details

### 1. Google OAuth Setup (30 minutes)

**Prerequisites:**
- Google Cloud account
- Existing or new Google Cloud project

**Steps:**
1. Navigate to https://console.cloud.google.com/
2. Select or create project
3. Enable APIs:
   - Google Sign-In API
   - Google Identity Services
4. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Name: "Trading Signals - Social Login"
   - Authorized JavaScript origins:
     - Your deployed web app URL
     - https://script.google.com (for testing)
   - Authorized redirect URIs:
     - Your deployed web app URL
5. Copy Client ID (format: `XXXXXXXXXX.apps.googleusercontent.com`)
6. Update in index.html line 14

**Testing:**
```javascript
// In browser console after deployment:
google.accounts.id.initialize({
    client_id: 'YOUR_CLIENT_ID',
    callback: (response) => console.log(response)
});
```

### 2. Microsoft OAuth Setup (30 minutes)

**Prerequisites:**
- Microsoft Azure account
- Azure subscription (free tier works)

**Steps:**
1. Navigate to https://portal.azure.com/
2. Go to "Azure Active Directory"
3. Click "App registrations" → "New registration"
4. Configure:
   - Name: "Trading Signals App"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: "Single-page application (SPA)"
   - URL: Your deployed web app URL
5. After creation, note the Application (client) ID
6. Go to "Authentication" → "Implicit grant and hybrid flows"
7. Enable:
   - Access tokens
   - ID tokens
8. Copy Application (client) ID
9. Update in index.html line 17

**Testing:**
```javascript
// In browser console after deployment:
const msalConfig = {
    auth: {
        clientId: 'YOUR_CLIENT_ID',
        authority: 'https://login.microsoftonline.com/common'
    }
};
const msalInstance = new msal.PublicClientApplication(msalConfig);
```

### 3. Apple Sign-In Setup (45 minutes)

**Prerequisites:**
- Apple Developer account ($99/year)
- Verified domain

**Steps:**
1. Navigate to https://developer.apple.com/account/
2. Go to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" → "+" → "Services IDs"
4. Register new Service ID:
   - Description: "Trading Signals Social Login"
   - Identifier: `com.yourcompany.tradingsignals`
5. Enable "Sign in with Apple"
6. Configure:
   - Primary App ID: Select your app
   - Domains: Your domain
   - Return URLs: Your deployed web app URL
7. Save and download configuration
8. Copy Service ID
9. Update in index.html line 20

**Note:** Apple Sign-In requires:
- HTTPS (enforced by Google Apps Script)
- Verified domain ownership
- Additional backend verification (JWT validation)

## File Changes Summary

### code.gs Changes
- Lines 167-287: Enhanced `doGet()` with approval handler
- Line 304: Increased lock timeout to 60 seconds
- Lines 788-839: Updated approval email with buttons
- Lines 1486-1531: Added sync filtering logic
- Lines 2150-2249: Added `refreshRearrangeCurrentData()` function

### index.html Changes
- Lines 11-20: Added OAuth SDK script tags
- Lines 1725-1831: Implemented real OAuth functions
- Lines 799-858: Added animated glow CSS
- Lines 2283-2308: Enhanced voice loading
- Lines 2428-2520: Improved speech synthesis
- Line 2639: Added dashboard glow logic
- Lines 2736-2738: Removed live feed glow

## Testing Procedures

### Quick Smoke Test (5 minutes)
```bash
# 1. Open web app
# 2. Try guest login with admin email
# 3. Navigate through all tabs
# 4. Check for console errors
# 5. Verify glowing effects on Dashboard
```

### Complete Test Suite (30 minutes)

#### Test 1: Authentication (10 minutes)
- [ ] Admin OTP login works
- [ ] Guest OTP request sent to admin
- [ ] Social login buttons appear
- [ ] (If configured) Google login works
- [ ] (If configured) Microsoft login works
- [ ] (If configured) Apple login works
- [ ] Session persists after refresh

#### Test 2: Approval Flow (5 minutes)
- [ ] Register test social user
- [ ] Receive approval email
- [ ] Click approve button
- [ ] See success page
- [ ] User receives confirmation
- [ ] User can login

#### Test 3: Dashboard Features (10 minutes)
- [ ] Navigate to Dashboard tab
- [ ] Verify synced signals display
- [ ] Check glowing effects visible
- [ ] Observe pulsing animation
- [ ] Verify color coding (orange/blue/purple)
- [ ] Hover to pause animation
- [ ] Click signal for details

#### Test 4: Data Filtering (3 minutes)
- [ ] Navigate to Logs tab
- [ ] Check HVD section
- [ ] Check Oversold section
- [ ] Check Overbought section
- [ ] Verify all show synced signals only
- [ ] Compare with raw Indicator2 sheet

#### Test 5: Narration (2 minutes)
- [ ] Click volume toggle
- [ ] Hear "Narration enabled"
- [ ] Wait for new signal (or refresh)
- [ ] Hear symbol spoken
- [ ] Check console logs

### Performance Test (Optional)
```javascript
// In browser console:
console.time('data-load');
// Refresh page
// After data loads:
console.timeEnd('data-load');
// Should be < 3 seconds
```

## Rollback Plan

### If Critical Issues Found

**Immediate Rollback (5 minutes):**
1. Go to Apps Script: Deploy → Manage deployments
2. Click "Edit" on latest deployment
3. Change to previous version
4. Click "Deploy"
5. Verify old version is live

**Code Rollback (10 minutes):**
```bash
# From repository
git log --oneline  # Find previous commit
git revert b2a15c9  # Revert latest
git revert 6848197  # Revert previous
git push

# Then update Apps Script manually
```

### Gradual Rollback
If some features work but others don't:

1. **Social Login Issues**: Comment out OAuth SDK scripts
2. **Approval Email Issues**: Revert email template only
3. **Glow Effect Issues**: Revert CSS animations
4. **Filter Issues**: Revert `getDashboardData()` function
5. **Narration Issues**: Revert voice loading logic

## Monitoring

### Apps Script Logs
Monitor for these errors:
- `Lock timeout` - Should not occur with 60s timeout
- `Sheet not found` - May need daily setup trigger
- `Failed to send approval email` - Check email quota
- `OAuth verification failed` - Check token validation

### Browser Console
Monitor for these warnings:
- `Narration disabled or not supported` - User's browser issue
- `No voices available` - Voice loading failed
- `OAuth library not loaded` - CDN/network issue
- `Failed to fetch` - Backend error

### Key Metrics
- Login success rate: Should be >95%
- Approval email delivery: Should be 100%
- Glow effect render time: Should be <100ms
- Voice loading time: Should be <500ms
- Data refresh time: Should be <3s

## Troubleshooting

### Social Login Not Working
1. Verify OAuth credentials configured
2. Check JavaScript console for errors
3. Verify redirect URIs match exactly
4. Test with incognito window
5. Check Apps Script logs for token validation errors

### Approval Emails Not Received
1. Check spam folder
2. Verify ADMIN_EMAIL in code.gs
3. Check email quota (100/day for free accounts)
4. Test with `MailApp.sendEmail()` directly
5. Check Apps Script logs for send errors

### Glowing Effects Not Appearing
1. Navigate to Dashboard tab (not Live Feed)
2. Verify signals are synced (have Indicator2 reasons)
3. Check browser console for CSS errors
4. Try hard refresh (Ctrl+F5)
5. Verify sync reason matches patterns (hvd, oversold, overbought)

### Narration Not Working
1. Check browser supports SpeechSynthesis API
2. Verify voices loaded in console
3. Try enabling in browser settings
4. Test with simple text: `speechSynthesis.speak(new SpeechSynthesisUtterance('test'))`
5. Check for browser extensions blocking audio

### Lock Timeout Still Occurring
1. Check Apps Script quota usage
2. Reduce webhook frequency if possible
3. Consider implementing queue system
4. Increase timeout further (max 5 minutes)
5. Optimize data processing in doPost()

## Security Considerations

### OAuth Tokens
- Never log or display full tokens
- Validate tokens server-side (partial implementation)
- Implement token expiration checks
- Consider implementing token refresh

### Approval Process
- Verify admin email before processing approvals
- Log all approval/rejection actions
- Consider rate limiting registration requests
- Implement CAPTCHA for production

### Data Access
- Verify session tokens on every request
- Implement row-level security if needed
- Audit log sensitive operations
- Consider implementing user roles

## Performance Optimization

### Already Implemented
- 30-second cache TTL
- Symbol row map caching (24 hours)
- Efficient sheet operations
- Minimal data transfer

### Future Improvements
- Implement data pagination
- Add lazy loading for historical data
- Consider moving to Cloud Functions for scale
- Implement service worker for offline support

## Support Contacts

### For Issues
1. Check FIXES_DOCUMENTATION.md
2. Review Apps Script logs
3. Test with provided test procedures
4. Check browser console
5. Contact repository owner

### Resources
- [Google OAuth Documentation](https://developers.google.com/identity/gsi/web/guides/overview)
- [Microsoft MSAL Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Apple Sign-In Documentation](https://developer.apple.com/documentation/sign_in_with_apple/)
- [Google Apps Script Documentation](https://developers.google.com/apps-script)

## Version Information

**Current Version:** v3.1  
**Previous Version:** v3.0  
**Release Date:** 2025-01-XX  
**Compatibility:** Backward compatible with v3.0 data

## Success Criteria

Deployment is successful if:
- [ ] All 8 original issues are resolved
- [ ] No new errors in Apps Script logs
- [ ] No JavaScript console errors
- [ ] Authentication works (at minimum guest + admin OTP)
- [ ] Dashboard displays correctly
- [ ] Glowing effects render properly
- [ ] Data filtering works correctly
- [ ] Performance is acceptable (<3s load time)

## Next Steps After Deployment

1. **Monitor for 24 hours**
   - Check Apps Script logs hourly
   - Monitor error rates
   - Track user feedback

2. **Configure OAuth (if not done)**
   - Set up Google OAuth
   - Set up Microsoft OAuth
   - Set up Apple Sign-In
   - Test each provider

3. **Documentation**
   - Update user guide with new features
   - Document OAuth setup for future reference
   - Add troubleshooting guides

4. **Future Enhancements**
   - Consider implementing 2FA
   - Add user management UI
   - Implement role-based access
   - Add analytics tracking

---

**Deployment Prepared By:** GitHub Copilot Agent  
**Document Version:** 1.0  
**Last Updated:** 2025-01-XX
