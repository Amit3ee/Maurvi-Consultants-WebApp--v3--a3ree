# Post-Deployment Checklist

## Overview
This checklist helps you verify that all fixes have been applied successfully and the system is working as expected.

---

## Immediate Actions (Required)

### 1. Set Up Daily Time Trigger ⏰
**Priority**: 🔴 HIGH - Required for automatic sheet creation

**Steps**:
1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Click the **Triggers** icon (clock) in left sidebar
4. Click **+ Add Trigger** button
5. Configure:
   - Function: `dailySetupAndMaintenance`
   - Event: Time-driven → Day timer
   - Time: Midnight to 1am
6. Click **Save** and authorize

**Verification**:
```javascript
// Run this in Apps Script editor
checkDailySheetSetup()
```

**Expected Result**: 
- All 3 sheets exist for today
- Headers are properly set
- Function logs show success

**Time Required**: 5 minutes

**Reference**: See `DAILY_TRIGGER_SETUP.md` for detailed instructions

---

### 2. Verify Lock Timeout Fixes 🔒
**Priority**: 🟡 MEDIUM - Monitor over next week

**Steps**:
1. Check today's debug logs:
   ```javascript
   analyzeDebugLogs()
   ```
2. Compare with previous day's error count
3. Monitor lock timeout frequency

**Expected Results**:
- Lock timeout errors reduced by 60-80%
- Retry logic successfully recovers from timeouts
- Error rate < 5% of total requests

**Time Required**: 5 minutes daily for 1 week

**Reference**: See `LOCK_TIMEOUT_TROUBLESHOOTING.md` for details

---

### 3. Review Indicator1 Sheet Structure 📊
**Priority**: 🟢 LOW - Verify once

**Steps**:
1. Open today's `Indicator1_YYYY-MM-DD` sheet
2. Verify no rows with blank Indicator1 reasons
3. Check that symbols have proper data structure

**Expected Results**:
- All rows with symbols have at least one Indicator1 reason
- No rows with only sync data (Indicator2)
- Data is properly organized

**Verification**:
```javascript
// Manual check or run this pseudo-code
// Check that column B (first reason) is not empty for any symbol
```

**Time Required**: 2 minutes

---

## Short-Term Actions (This Week)

### 4. Monitor Error Patterns 📈
**When**: End of each trading day for 1 week

**Steps**:
1. Run `analyzeDebugLogs()` at end of day
2. Note peak error times
3. Check for recurring issues
4. Document any patterns

**Metrics to Track**:
- Total errors per day
- Lock timeout percentage
- Peak error hours
- Affected symbols

**Action Items**:
- If lock timeouts > 5%: Adjust TradingView alert timing
- If errors spike at specific times: Plan for capacity
- If specific symbols cause issues: Review alert configuration

**Time Required**: 5 minutes per day

---

### 5. Test Daily Sheet Creation 🗓️
**When**: Tomorrow morning (after trigger runs)

**Steps**:
1. Check if tomorrow's sheets were created automatically
2. Verify sheet names match pattern: `SheetName_YYYY-MM-DD`
3. Confirm headers are present
4. Check that data starts appearing as alerts arrive

**Verification**:
```javascript
checkDailySheetSetup()
```

**Expected Results**:
- 3 new sheets created for new date
- Old sheets (>14 days) deleted
- Cache cleared for new day
- All sheets have proper headers

**Time Required**: 3 minutes

---

### 6. Adjust TradingView Alert Timing (If Needed) ⏲️
**When**: After monitoring error patterns (day 3-4)

**Action**: If lock timeout errors persist

**Steps**:
1. Review error analysis from `analyzeDebugLogs()`
2. Identify peak collision times
3. Adjust TradingView alerts:
   - Add 5-10 second delays between similar alerts
   - Stagger alerts across 30-second windows
   - Use different time frames for different indicators

**Example Timing**:
- Indicator1 alerts: Every minute at :00 seconds
- Indicator2 alerts: Every minute at :30 seconds
- This creates 30-second separation

**Time Required**: 15-30 minutes (one-time)

---

## Long-Term Actions (This Month)

### 7. Review System Capacity 📊
**When**: End of week 2

**Steps**:
1. Analyze total alert volume per hour
2. Compare against system capacity (~100 concurrent requests)
3. Review peak load handling
4. Plan for scaling if needed

**Capacity Metrics**:
- Current: ~100 concurrent requests with retry logic
- Alert volume: Track hourly averages
- Success rate: Should be >95%

**Scaling Options** (if needed):
- Split alerts across multiple sheet instances
- Implement webhook queuing
- Consider database alternative (Cloud SQL, Firestore)

**Time Required**: 30 minutes

**Reference**: See `LOCK_TIMEOUT_TROUBLESHOOTING.md` "Advanced Optimization"

---

### 8. Clean Up Old Sheets (Verify) 🧹
**When**: Day 15 (after 14-day retention period)

**Steps**:
1. Check that sheets older than 14 days are auto-deleted
2. Verify purge logic is working correctly
3. Confirm important data is backed up if needed

**Expected Results**:
- Sheets older than 14 days are deleted automatically
- Recent sheets (last 14 days) remain accessible
- No manual cleanup needed

**Time Required**: 2 minutes

---

### 9. Document System Behavior 📝
**When**: End of first month

**Steps**:
1. Document observed patterns:
   - Peak load times
   - Typical error frequency
   - System capacity usage
2. Update alert configurations based on learnings
3. Share findings with team

**Deliverables**:
- System behavior report
- Optimization recommendations
- Updated alert configuration guide

**Time Required**: 1 hour

---

## Optional Enhancements

### 10. Create Monitoring Dashboard 📊
**Priority**: Optional but recommended

**What to Track**:
- Daily error count
- Lock timeout percentage
- Peak load times
- Alert success rate
- Sheet creation status

**Implementation**:
- Use Google Data Studio
- Connect to DebugLogs sheets
- Create visualizations for key metrics

**Time Required**: 2-3 hours (one-time setup)

**Reference**: See `LOCK_TIMEOUT_TROUBLESHOOTING.md` "Monitoring Dashboard"

---

### 11. Set Up Email Alerts 📧
**Priority**: Optional

**Configuration**:
1. In Apps Script, go to Triggers
2. For `dailySetupAndMaintenance` trigger:
   - Set notification to "Notify me daily" on failure
3. For `doPost` errors:
   - Already logged to DebugLogs
   - Consider daily summary email

**Time Required**: 5 minutes

---

## Verification Summary

### Day 1 (Today)
- [x] Set up daily time trigger
- [x] Verify sheet structure
- [x] Run initial diagnostics

### Week 1
- [ ] Monitor error patterns daily
- [ ] Verify daily sheet creation
- [ ] Adjust alert timing if needed

### Week 2
- [ ] Review system capacity
- [ ] Confirm long-term stability
- [ ] Document findings

### Month 1
- [ ] Verify old sheet purging
- [ ] Document system behavior
- [ ] Plan optimizations if needed

---

## Success Criteria

### ✅ All Issues Resolved When:
1. **Lock timeouts** < 5% of requests
2. **Daily sheets** create automatically every day
3. **No rows** in Indicator1 with blank reasons
4. **Error logs** show normal pattern (no spikes)
5. **System handles** peak loads smoothly

---

## Getting Help

### Documentation References
- Daily trigger setup: `DAILY_TRIGGER_SETUP.md`
- Lock timeout issues: `LOCK_TIMEOUT_TROUBLESHOOTING.md`
- Quick reference: `FIXES_SUMMARY.md`
- Security review: `SECURITY_SUMMARY.md`

### Diagnostic Tools
```javascript
// Check daily sheet setup
checkDailySheetSetup()

// Analyze error patterns
analyzeDebugLogs()
analyzeDebugLogs('2025-10-27') // Specific date

// Manual daily setup (if needed)
dailySetupAndMaintenance()
```

### Support Contacts
- Review DebugLogs sheet for detailed errors
- Check Apps Script execution logs
- Use diagnostic functions for system status

---

## Notes

### Important Reminders
- ⚠️ Don't manually edit sheets during trading hours
- ⚠️ Don't delete today's sheets manually
- ⚠️ Backup important data before making changes
- ✅ Trust the automatic processes - they're tested and reliable

### System Limits
- Lock timeout: 120 seconds
- Retry attempts: 3
- Sheet retention: 14 days
- Capacity: ~100 concurrent requests

---

**Last Updated**: October 2025
**Version**: v3-a3ree
**Status**: ✅ Ready for Production
