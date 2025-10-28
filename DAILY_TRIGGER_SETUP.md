# Daily Sheet Auto-Creation Setup Guide

## Overview
The application uses date-suffixed sheets (e.g., `Indicator1_2025-10-27`) for data organization. A daily maintenance function automatically creates new sheets at the start of each day and purges old sheets after 14 days.

## Function: `dailySetupAndMaintenance()`

This function performs the following tasks:
1. Creates new date-suffixed sheets for today (`Indicator1_YYYY-MM-DD`, `Indicator2_YYYY-MM-DD`, `DebugLogs_YYYY-MM-DD`)
2. Adds appropriate headers to each sheet type
3. Deletes sheets older than 14 days (purge date)
4. Clears cache for the new day

## Setting Up the Time-Based Trigger

### Step 1: Open Apps Script Editor
1. Open your Google Sheet
2. Go to **Extensions > Apps Script**

### Step 2: Access Triggers
1. In the Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
2. Or go to the menu and click **Triggers**

### Step 3: Create New Trigger
1. Click **+ Add Trigger** button (bottom right)
2. Configure the trigger with these settings:
   - **Choose which function to run:** `dailySetupAndMaintenance`
   - **Choose which deployment should run:** `Head`
   - **Select event source:** `Time-driven`
   - **Select type of time based trigger:** `Day timer`
   - **Select time of day:** `Midnight to 1am` (or `12am to 1am`)
   - **Failure notification settings:** `Notify me daily` (recommended)
3. Click **Save**

### Step 4: Authorize the Trigger
1. You may be prompted to authorize the trigger
2. Click **Review Permissions**
3. Select your Google account
4. Click **Allow** to grant necessary permissions

### Step 5: Verify Trigger Setup
1. The trigger should now appear in the triggers list
2. It will show:
   - Function: `dailySetupAndMaintenance`
   - Event: Time-driven, Day timer, Midnight to 1am
   - Status: Enabled

## Manual Testing

Before relying on the automatic trigger, you can manually test the function:

1. In the Apps Script editor, select `dailySetupAndMaintenance` from the function dropdown
2. Click the **Run** button
3. Check the **Execution log** for any errors
4. Verify that today's sheets were created in your Google Sheet

Alternatively, run the test function:
```javascript
testDailySetup()
```

## Monitoring

### Checking Execution History
1. Go to **Triggers** in Apps Script editor
2. Click on the trigger you created
3. View the execution history to see when it last ran and if there were any errors

### Debug Logs
- Any errors during daily setup are logged to the `DebugLogs_YYYY-MM-DD` sheet
- Check the logs if you notice missing sheets or issues

### Email Notifications
- If you enabled failure notifications, you'll receive an email if the trigger fails
- The email will include error details and execution logs

## Troubleshooting

### Sheets Not Created
- **Check trigger is enabled:** Go to Triggers and verify the trigger is listed and enabled
- **Check execution history:** Look for errors in the trigger execution history
- **Run manually:** Try running `dailySetupAndMaintenance()` manually to see if there are errors
- **Check permissions:** Ensure the script has permission to access your Google Sheets

### Multiple Sheets Created
- This can happen if the trigger runs multiple times
- Check trigger settings to ensure only one daily trigger exists
- Delete duplicate triggers if found

### Old Sheets Not Deleted
- The function deletes sheets older than 14 days
- Check the `purgeDateSuffix` calculation in the code
- Verify sheet names match the pattern `SheetName_YYYY-MM-DD`

### Trigger Authorization Issues
- If the trigger stops working, it may need re-authorization
- Go to Triggers, delete the old trigger, and create a new one
- This will prompt for re-authorization

## Recommended Schedule

**Optimal Time:** Midnight to 1am (00:00 - 01:00)
- This ensures sheets are ready before the market opens
- Minimal trading activity at this time
- Allows time for any issues to be resolved before trading hours

**Alternative Times:**
- 11pm to Midnight (23:00 - 00:00) - for next day preparation
- 1am to 2am (01:00 - 02:00) - if midnight slot is busy

## Important Notes

1. **Time Zone:** The trigger uses your script's time zone (set in Apps Script project settings)
2. **Sheet Retention:** Sheets are kept for 14 days, then automatically deleted
3. **Cache Clearing:** The function clears the symbol row map cache for the new day
4. **Sheet Ordering:** New sheets are inserted at the beginning (position 0) for easy access
5. **Idempotency:** Running the function multiple times in the same day is safe - it won't create duplicate sheets

## Emergency Manual Creation

If the trigger fails and you need sheets immediately, you can:

1. Run `dailySetupAndMaintenance()` manually from Apps Script editor
2. Or create sheets manually with names:
   - `Indicator1_YYYY-MM-DD`
   - `Indicator2_YYYY-MM-DD`
   - `DebugLogs_YYYY-MM-DD`
3. Add headers as defined in the `dailySetupAndMaintenance()` function

## Support

For issues or questions:
- Check the `DebugLogs_YYYY-MM-DD` sheet for error details
- Review the Apps Script execution logs
- Contact the system administrator with specific error messages
