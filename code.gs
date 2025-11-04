// --- CONFIGURATION ---
// !!! IMPORTANT: Create a new Google Sheet and paste its ID here.
const SHEET_ID = '1L87XM1Ob1_aUiImsEMhl2_p6mV5U_ZHuXiWm0WclCW8'; // Updated Sheet ID

// Legacy sheet names - kept for mock data function compatibility
const SHEET_INDICATOR_1 = 'Indicator1';
const SHEET_INDICATOR_2 = 'Indicator2';
const SHEET_LOGS = 'DebugLogs'; // Optional: for logging errors

const OTP_VALIDITY_MINUTES = 3;
const SESSION_VALIDITY_HOURS = 24; // 1 day session
const ADMIN_EMAIL = 'amit3ree@gmail.com'; // OTPs will be sent here

// --- !!! GEMINI API KEY !!! ---
// Replace "YOUR_GEMINI_API_KEY" with your actual Gemini API Key
// Get one here: https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;


// --- DAILY SETUP AND MAINTENANCE ---

/**
 * Daily setup and maintenance function to manage sheet lifecycle.
 * Should be set on a daily time-based trigger (e.g., 12-1 AM).
 */
function dailySetupAndMaintenance() {
  let logSheet;
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    logSheet = ss.getSheetByName(SHEET_LOGS);
    
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = new Date();
    
    // Calculate current date suffix (YYYY-MM-DD)
    const currentDateSuffix = Utilities.formatDate(today, scriptTimeZone, 'yyyy-MM-dd');
    
    // Calculate purge date (14 days old)
    const purgeDate = new Date(today);
    purgeDate.setDate(today.getDate() - 14);
    const purgeDateSuffix = Utilities.formatDate(purgeDate, scriptTimeZone, 'yyyy-MM-dd');
    
    Logger.log(`Daily Setup: Current date: ${currentDateSuffix}, Purge date: ${purgeDateSuffix}`);
    
    // 1. Create new date-suffixed sheets for today in correct order at the beginning
    const sheetNames = [
      `Indicator1_${currentDateSuffix}`,
      `Indicator2_${currentDateSuffix}`,
      `DebugLogs_${currentDateSuffix}`
    ];
    
    // Insert sheets in reverse order so they appear in correct order (Indicator1, Indicator2, DebugLogs)
    for (let i = sheetNames.length - 1; i >= 0; i--) {
      const sheetName = sheetNames[i];
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        // Insert at position 0 (beginning) - sheets will be added in reverse order
        sheet = ss.insertSheet(sheetName, 0);
        Logger.log(`Created new sheet: ${sheetName} at position 0`);
        
        // Add headers based on sheet type
        if (sheetName.startsWith('Indicator1_')) {
          // Create headers: Symbol + 5 Indicator1 pairs + 21 Sync Reason pairs = 53 columns (A-BA)
          const headers = ['Symbol'];
          // Indicator1 columns (5 pairs = 10 columns)
          for (let i = 1; i <= 5; i++) {
            headers.push(`Reason ${i}`, `Time ${i}`);
          }
          // Sync Reason columns (21 pairs = 42 columns)
          for (let i = 1; i <= 21; i++) {
            headers.push(`Sync Reason ${i}`, `Sync Time ${i}`);
          }
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        } else if (sheetName.startsWith('Indicator2_')) {
          // Indicator2 sheet now includes Nifty data
          sheet.getRange('A1:E1').setValues([['Date', 'Time', 'Ticker', 'Reason', 'Capital (Cr)']]);
        } else if (sheetName.startsWith('DebugLogs_')) {
          sheet.getRange('A1:E1').setValues([['Timestamp', 'Context', 'Error Message', 'Details', 'Stack']]);
        }
      } else {
        Logger.log(`Sheet already exists: ${sheetName}`);
      }
    }
    
    // 2. Delete old sheets with purge date suffix
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
      const name = sheet.getName();
      if (name.includes(`_${purgeDateSuffix}`)) {
        ss.deleteSheet(sheet);
        Logger.log(`Deleted old sheet: ${name}`);
      }
    });
    
    // 3. Clear cache for the new day (self-healing)
    const cache = CacheService.getScriptCache();
    const cacheKey = `symbolRowMap_${currentDateSuffix}`;
    cache.remove(cacheKey);
    Logger.log(`Cleared cache for key: ${cacheKey}`);
    
    Logger.log('Daily setup and maintenance completed successfully.');
    
  } catch (err) {
    Logger.log(`dailySetupAndMaintenance ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(logSheet, 'dailySetupAndMaintenance Error', err, '');
    throw err;
  }
}


// --- WEB APP ---

/**
 * Writes data to a specific row in the correct columns based on source.
 * @param {Sheet} sheet - The sheet to write to
 * @param {number} row - The target row number
 * @param {string} source - Either "Indicator1" or "Indicator2"
 * @param {string} reason - The reason/signal text
 * @param {string} time - The timestamp
 */
function writeDataToRow(sheet, row, source, reason, time) {
  const REASON_START_COL = 2; // Column B for Indicator1 reasons
  const SYNC_REASON_START_COL = 12; // Column L for Indicator2 sync reasons
  const MAX_COLS_INDICATOR1 = 10; // 5 pairs of [reason, time] columns for Indicator1
  const MAX_COLS_INDICATOR2 = 42; // 21 pairs of [reason, time] columns for Indicator2
  
  let startCol;
  let maxCols;
  if (source === 'Indicator1') {
    startCol = REASON_START_COL;
    maxCols = MAX_COLS_INDICATOR1;
  } else if (source === 'Indicator2') {
    startCol = SYNC_REASON_START_COL;
    maxCols = MAX_COLS_INDICATOR2;
  } else {
    Logger.log(`writeDataToRow: Unknown source "${source}"`);
    return;
  }
  
  // Get the current values in this row's section
  const range = sheet.getRange(row, startCol, 1, maxCols);
  const values = range.getValues()[0];
  
  // Find the first empty cell (looking at pairs: reason cell should be empty)
  let firstEmptyIndex = -1;
  for (let i = 0; i < values.length; i += 2) {
    if (!values[i] || values[i] === '') {
      firstEmptyIndex = i;
      break;
    }
  }
  
  if (firstEmptyIndex === -1) {
    Logger.log(`writeDataToRow: Row ${row} is full for source ${source}. Cannot write more data.`);
    return;
  }
  
  // Write [reason, time] to the correct cell
  sheet.getRange(row, startCol + firstEmptyIndex, 1, 2).setValues([[reason, time]]);
  Logger.log(`writeDataToRow: Wrote to row ${row}, col ${startCol + firstEmptyIndex}: [${reason}, ${time}]`);
}

/**
 * Serves the main HTML page of the web app.
 * Also handles approval/rejection requests via URL parameters.
 */
function doGet(e) {
  try {
      // Check if this is an approval/rejection request
      if (e && e.parameter) {
        if (e.parameter.action === 'approve' && e.parameter.email) {
          return handleApprovalRequest(e.parameter.email, true);
        } else if (e.parameter.action === 'reject' && e.parameter.email) {
          return handleApprovalRequest(e.parameter.email, false);
        }
      }
      
      // Normal app loading
      return HtmlService.createHtmlOutputFromFile('index.html')
        .setTitle('Automated Trading Signals')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
      Logger.log(`doGet Error: ${err.message} Stack: ${err.stack}`);
      return HtmlService.createHtmlOutput("<p>Error loading application. Please contact support.</p>");
  }
}

/**
 * Handles approval/rejection requests from email links
 */
function handleApprovalRequest(email, isApproval) {
  try {
    const props = PropertiesService.getScriptProperties();
    const usersJson = props.getProperty('registeredUsers') || '{}';
    const users = JSON.parse(usersJson);
    
    if (!users[email]) {
      return HtmlService.createHtmlOutput(`
        <html>
          <head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;text-align:center;background:#f5f5f7;}h1{color:#ff3b30;}</style></head>
          <body><h1>❌ User Not Found</h1><p>The user ${email} was not found in the registration list.</p></body>
        </html>
      `);
    }
    
    if (isApproval) {
      // Approve the user
      users[email].approved = true;
      users[email].approvedAt = new Date().toISOString();
      props.setProperty('registeredUsers', JSON.stringify(users));
      Logger.log(`User ${email} approved via email link`);
      
      // Send approval notification to user
      try {
        MailApp.sendEmail({
          to: email,
          subject: 'Your Access Has Been Approved - Maurvi Consultants',
          htmlBody: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f7;}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}h1{color:#1d1d1f;font-size:24px;margin:0 0 16px 0;}.success-box{background:rgba(48,209,88,0.1);padding:20px;border-radius:8px;border-left:4px solid #30d158;margin:16px 0;}.footer{margin-top:24px;padding-top:24px;border-top:1px solid #e5e5e7;color:#86868b;font-size:12px;}</style></head>
            <body>
              <div class="container">
                <h1>✅ Access Approved!</h1>
                <p>Good news! Your access to the Maurvi Consultants Trading Signals Platform has been approved.</p>
                <div class="success-box">
                  <strong>You can now sign in</strong> using your ${users[email].provider} account.
                </div>
                <p>Simply click the "${users[email].provider}" button on the login screen to access the platform.</p>
                <div class="footer">
                  <p>Maurvi Consultants - Trading Signals Platform</p>
                  <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
      } catch (emailErr) {
        Logger.log(`Failed to send approval notification: ${emailErr.message}`);
      }
      
      return HtmlService.createHtmlOutput(`
        <html>
          <head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;text-align:center;background:#f5f5f7;}h1{color:#30d158;}p{color:#1d1d1f;font-size:16px;}</style></head>
          <body><h1>✅ User Approved</h1><p>${email} has been approved and notified via email.</p><p>You can close this window now.</p></body>
        </html>
      `);
    } else {
      // Reject the user (remove from registration list)
      delete users[email];
      props.setProperty('registeredUsers', JSON.stringify(users));
      Logger.log(`User ${email} rejected and removed via email link`);
      
      // Send rejection notification to user
      try {
        MailApp.sendEmail({
          to: email,
          subject: 'Registration Update - Maurvi Consultants',
          htmlBody: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f7;}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}h1{color:#1d1d1f;font-size:24px;margin:0 0 16px 0;}.info-box{background:rgba(255,59,48,0.1);padding:20px;border-radius:8px;border-left:4px solid #ff3b30;margin:16px 0;}.footer{margin-top:24px;padding-top:24px;border-top:1px solid #e5e5e7;color:#86868b;font-size:12px;}</style></head>
            <body>
              <div class="container">
                <h1>Registration Update</h1>
                <p>Thank you for your interest in the Maurvi Consultants Trading Signals Platform.</p>
                <div class="info-box">
                  Your registration request has not been approved at this time.
                </div>
                <p>If you have any questions, please contact the administrator.</p>
                <div class="footer">
                  <p>Maurvi Consultants - Trading Signals Platform</p>
                  <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
      } catch (emailErr) {
        Logger.log(`Failed to send rejection notification: ${emailErr.message}`);
      }
      
      return HtmlService.createHtmlOutput(`
        <html>
          <head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;text-align:center;background:#f5f5f7;}h1{color:#ff3b30;}p{color:#1d1d1f;font-size:16px;}</style></head>
          <body><h1>❌ User Rejected</h1><p>${email} has been rejected and notified via email.</p><p>You can close this window now.</p></body>
        </html>
      `);
    }
  } catch (err) {
    Logger.log(`handleApprovalRequest ERROR: ${err.message} Stack: ${err.stack}`);
    return HtmlService.createHtmlOutput(`
      <html>
        <head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:40px;text-align:center;background:#f5f5f7;}h1{color:#ff3b30;}</style></head>
        <body><h1>❌ Error</h1><p>An error occurred: ${err.message}</p></body>
      </html>
    `);
  }
}

/**
 * Handles all POST requests (TradingView alerts) with Dynamic Row Mapping.
 * Supports multiple alert message formats:
 * - Indicator1: {"scrip": "SYMBOL", "timestamp": "...", "reason": "..."}
 * - Indicator2 HVD: {"timestamp": "...", "ticker": "SYMBOL", "reason": "HVD", "capital_deployed_cr": "150"}
 * - Indicator2 Pattern: {"timestamp": "...", "ticker": "SYMBOL", "reason": "Bullish Engulfing"}
 * - Indicator2 Standalone: {"timestamp": "...", "ticker": "SYMBOL", "reason": "Oversold - RSI Below 30"}
 * 
 * NOTE: Timestamps from indicators are IGNORED. Server time is used for all signals.
 * 
 * Data Flow:
 * - Indicator1 signals: Create row in Indicator1 sheet (columns B-K for signals)
 * - Indicator2 signals: Always stored in Indicator2 sheet
 *   - If symbol exists in Indicator1 sheet: Also sync to sync columns (L-BA)
 *   - If symbol doesn't exist in Indicator1 sheet: Only stored in Indicator2 sheet
 * - Nifty signals (ticker = "NIFTY" or "Nifty1!"): Only stored in Indicator2 sheet, no row mapping
 */
function doPost(e) {
  let logSheet;
  const lock = LockService.getScriptLock();
  
  try {
    // Acquire lock with 120 second timeout to handle high concurrent load
    // Retry up to 3 times with exponential backoff if lock fails
    let lockAcquired = false;
    let retryCount = 0;
    const maxRetries = 3;
    const lockTimeout = 120000; // 120 seconds
    
    while (!lockAcquired && retryCount < maxRetries) {
      try {
        lock.waitLock(lockTimeout);
        lockAcquired = true;
      } catch (lockErr) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to acquire lock after ${maxRetries} retries: ${lockErr.message}`);
        }
        // Exponential backoff: wait 1s, 2s, 4s
        Utilities.sleep(Math.pow(2, retryCount - 1) * 1000);
      }
    }
    
    const postData = e.postData.contents;
    if (!postData) { throw new Error("Received empty postData."); }
    const data = JSON.parse(postData);

    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Get current date suffix and time (ALWAYS use server time, ignore indicator timestamps)
    const scriptTimeZone = Session.getScriptTimeZone();
    const timestamp = new Date();
    const dateSuffix = Utilities.formatDate(timestamp, scriptTimeZone, 'yyyy-MM-dd');
    const time = Utilities.formatDate(timestamp, scriptTimeZone, 'HH:mm:ss');
    
    logSheet = ss.getSheetByName(`DebugLogs_${dateSuffix}`);
    
    // Determine indicator type by JSON keys
    // Indicator 1 uses "scrip" key
    // Indicator 2 uses "ticker" key
    let indicatorType = null;
    let symbol = null;
    
    if (data.scrip) {
      // This is Indicator 1
      indicatorType = 'Indicator1';
      symbol = data.scrip;
    } else if (data.ticker) {
      // This is Indicator 2
      indicatorType = 'Indicator2';
      symbol = data.ticker;
    } else {
      throw new Error("Missing required field: must have either 'scrip' or 'ticker'");
    }
    
    // Validate reason is present
    if (!data.reason) {
      throw new Error("Missing required field: reason");
    }
    
    Logger.log(`Received ${indicatorType} signal: ${symbol}, Reason: ${data.reason}, Time: ${time}`);
    
    // --- Handle Indicator2 signals (append to Indicator2 sheet) ---
    if (indicatorType === 'Indicator2') {
      const ind2Sheet = ss.getSheetByName(`Indicator2_${dateSuffix}`);
      if (!ind2Sheet) {
        throw new Error(`Sheet not found: Indicator2_${dateSuffix}`);
      }
      
      // Append to Indicator2 sheet (includes Nifty data now)
      ind2Sheet.appendRow([
        dateSuffix,
        time,
        symbol,
        data.reason,
        data.capital_deployed_cr || ''
      ]);
      
      Logger.log(`Indicator2 signal appended: ${symbol} at ${time}`);
      
      // Check if this is a Nifty signal - if so, we're done (no row mapping needed)
      const symbolUpper = (symbol || '').toUpperCase();
      if (symbolUpper === 'NIFTY' || symbolUpper === 'NIFTY1!' || symbolUpper === 'NIFTY 50') {
        Logger.log(`Nifty signal processed: ${symbol}`);
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'success', 
          indicator: indicatorType,
          symbol: symbol,
          time: time,
          note: 'Nifty signal stored in Indicator2 sheet only'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // For non-Nifty Indicator2 signals, continue to sync with Indicator1 sheet
    }
    
    // --- Handle Dynamic Row Mapping for Indicator1 sheet ---
    // IMPORTANT: Only Indicator1 signals create new rows. Indicator2 signals only sync to existing rows.
    const ind1Sheet = ss.getSheetByName(`Indicator1_${dateSuffix}`);
    if (!ind1Sheet) {
      throw new Error(`Sheet not found: Indicator1_${dateSuffix}`);
    }
    
    // Get the row map from cache
    const cacheKey = `symbolRowMap_${dateSuffix}`;
    const cache = CacheService.getScriptCache();
    const cachedMap = cache.get(cacheKey);
    let symbolMap = {};
    
    // Parse cached map with error handling
    if (cachedMap !== null) {
      try {
        symbolMap = JSON.parse(cachedMap);
      } catch (parseErr) {
        Logger.log(`Cache parse error: ${parseErr.message}. Using empty map.`);
        symbolMap = {};
      }
    }
    
    // Find or assign row for this symbol ("Fixed Address" Logic)
    let targetRow = symbolMap[symbol];
    
    if (targetRow === undefined) {
      // Symbol not yet in Indicator1 sheet
      // CRITICAL: Only Indicator1 signals create new rows
      // Indicator2 signals for non-existent symbols should NOT create rows
      if (indicatorType === 'Indicator1') {
        // Only Indicator1 signals create new rows
        targetRow = ind1Sheet.getLastRow() + 1;
        
        // Write symbol to Column A
        ind1Sheet.getRange(targetRow, 1).setValue(symbol);
        
        // Update and save the map
        symbolMap[symbol] = targetRow;
        cache.put(cacheKey, JSON.stringify(symbolMap), 86400); // Cache for 24 hours
        
        Logger.log(`New symbol "${symbol}" assigned to row ${targetRow} by Indicator1`);
      } else {
        // Indicator2 signal for a symbol not yet in Indicator1 sheet
        // Don't create a row, just log and return success
        // This prevents rows with blank Indicator1 reasons
        Logger.log(`Indicator2 signal for "${symbol}" - no Indicator1 row exists yet. Signal stored in Indicator2 sheet only.`);
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'success', 
          indicator: indicatorType,
          symbol: symbol,
          time: time,
          note: 'Stored in Indicator2 sheet only - no Indicator1 row exists (preventing blank Indicator1 reason)'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      Logger.log(`Using existing row ${targetRow} for symbol "${symbol}"`);
    }
    
    // Write data to the correct row based on indicator type
    // Format the reason: if HVD with capital, format as "HVD (X Cr)"
    let reasonToWrite = data.reason;
    if (indicatorType === 'Indicator2' && data.reason && data.reason.toUpperCase() === 'HVD' && data.capital_deployed_cr) {
      reasonToWrite = `HVD (${data.capital_deployed_cr} Cr)`;
    }
    writeDataToRow(ind1Sheet, targetRow, indicatorType, reasonToWrite, time);
    
    // Clear cache for both Indicator1 and Indicator2 sheets to ensure immediate updates
    const cacheService = CacheService.getScriptCache();
    cacheService.remove(`sheetData_Indicator1_${dateSuffix}`);
    cacheService.remove(`sheetData_Indicator2_${dateSuffix}`);
    Logger.log(`Cache cleared for immediate data refresh`);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      indicator: indicatorType,
      symbol: symbol,
      row: targetRow,
      time: time
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`doPost CRITICAL ERROR: ${err.message} Stack: ${err.stack}. Received Data: ${e.postData ? e.postData.contents : 'No postData'}`);
    
    // Enhanced error logging with more context
    const errorContext = {
      timestamp: new Date().toISOString(),
      message: err.message,
      stack: err.stack,
      receivedData: e.postData ? e.postData.contents : 'No postData',
      errorType: err.name || 'Unknown'
    };
    
    // Log to sheet if possible
    _logErrorToSheet(logSheet, 'doPost Error', err, JSON.stringify(errorContext));
    
    // Return detailed error for lock timeout issues
    if (err.message && err.message.includes('lock')) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Server busy - concurrent request limit reached. Please retry.',
        errorType: 'lock_timeout',
        retryable: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: err.message,
      errorType: 'processing_error',
      retryable: false
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    // Always release the lock
    lock.releaseLock();
  }
}

/**
 * Utility to log errors to the DebugLogs sheet (date-based).
 */
function _logErrorToSheet(logSheet, context, error, details = '') {
    try {
        if (!logSheet) {
            const ss = SpreadsheetApp.openById(SHEET_ID);
            const scriptTimeZone = Session.getScriptTimeZone();
            const dateSuffix = Utilities.formatDate(new Date(), scriptTimeZone, 'yyyy-MM-dd');
            logSheet = ss.getSheetByName(`DebugLogs_${dateSuffix}`);
            if (!logSheet) {
                 Logger.log(`Cannot log error: DebugLogs_${dateSuffix} sheet not found.`);
                 return;
            }
        }
        logSheet.appendRow([new Date(), context, error.message, details, error.stack]);
    } catch (logErr) {
        Logger.log(`CRITICAL: Failed to write error to DebugLogs: ${logErr.message}. Original error: ${error.message}`);
    }
}

// --- AUTHENTICATION FUNCTIONS ---
function generateOTPServer(email) {
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    Logger.log(`generateOTPServer: Unauthorized attempt by ${email}`);
    return { status: 'error', message: 'Unauthorized user.' };
  }
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedOTP = `${otp.substring(0, 3)}-${otp.substring(3, 6)}`;
    const cache = CacheService.getScriptCache();
    cache.put(`otp_${email}`, otp, OTP_VALIDITY_MINUTES * 60);
    Logger.log(`Generated OTP ${formattedOTP} for ${email}`);
    MailApp.sendEmail({
      to: email,
      subject: `Your Trading Signals OTP: ${formattedOTP}`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background: rgba(255, 255, 255, 0.98);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border-radius: 24px; 
              padding: 0;
              box-shadow: 
                0 20px 60px rgba(0, 0, 0, 0.3),
                0 8px 24px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 40px 60px 40px;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: shimmer 6s ease-in-out infinite;
            }
            @keyframes shimmer {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(10%, 10%); }
            }
            .logo { 
              font-size: 32px; 
              font-weight: 800; 
              color: white;
              margin-bottom: 12px;
              text-align: center;
              position: relative;
              z-index: 1;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              letter-spacing: -0.5px;
            }
            .tagline {
              color: rgba(255, 255, 255, 0.9);
              font-size: 14px;
              text-align: center;
              position: relative;
              z-index: 1;
              font-weight: 500;
              letter-spacing: 0.5px;
            }
            .content { 
              padding: 40px; 
              text-align: center;
            }
            h1 { 
              color: #1d1d1f; 
              font-size: 28px; 
              margin: 0 0 12px 0; 
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .subtitle { 
              color: #86868b; 
              font-size: 16px; 
              margin: 0 0 32px 0;
              line-height: 1.5;
            }
            .otp-box { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              font-size: 48px; 
              font-weight: 800; 
              letter-spacing: 12px; 
              padding: 32px; 
              border-radius: 16px; 
              margin: 32px 0; 
              font-family: 'SF Mono', 'Courier New', monospace;
              box-shadow: 
                0 8px 24px rgba(102, 126, 234, 0.4),
                0 4px 12px rgba(118, 75, 162, 0.3),
                inset 0 2px 0 rgba(255, 255, 255, 0.2),
                inset 0 -2px 0 rgba(0, 0, 0, 0.1);
              position: relative;
              overflow: hidden;
            }
            .otp-box::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
              animation: slide 3s ease-in-out infinite;
            }
            @keyframes slide {
              0% { left: -100%; }
              50%, 100% { left: 100%; }
            }
            .validity { 
              display: flex;
              align-items: center;
              justify-content: center;
              color: #86868b; 
              font-size: 14px; 
              margin: 24px 0;
              font-weight: 500;
            }
            .validity::before {
              content: '⏱️';
              margin-right: 8px;
              font-size: 18px;
            }
            .warning { 
              color: #ff3b30; 
              font-size: 13px; 
              margin: 24px 0; 
              padding: 20px; 
              background: linear-gradient(135deg, rgba(255, 59, 48, 0.08), rgba(255, 59, 48, 0.12));
              border-radius: 12px; 
              border-left: 4px solid #ff3b30;
              text-align: left;
              line-height: 1.6;
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
            }
            .warning::before {
              content: '⚠️';
              margin-right: 8px;
              font-size: 16px;
            }
            .footer { 
              color: #86868b; 
              font-size: 12px; 
              margin-top: 32px; 
              padding-top: 24px; 
              border-top: 1px solid #e5e5e7;
              line-height: 1.6;
            }
            .footer p { margin: 8px 0; }
            .footer strong { color: #1d1d1f; font-weight: 600; }
            @media (max-width: 600px) {
              .container { margin: 10px; border-radius: 20px; }
              .header { padding: 30px 20px 50px 20px; }
              .content { padding: 30px 20px; }
              .otp-box { font-size: 36px; letter-spacing: 8px; padding: 24px; }
              h1 { font-size: 24px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Maurvi Consultants</div>
              <div class="tagline">Automated Trading Signals Platform</div>
            </div>
            <div class="content">
              <h1>Your One-Time Password</h1>
              <p class="subtitle">Use this secure code to access your Trading Signals Dashboard</p>
              
              <div class="otp-box">${formattedOTP}</div>
              
              <p class="validity">Valid for ${OTP_VALIDITY_MINUTES} minutes</p>
              
              <div class="warning">
                <strong>Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for your OTP via email, phone, or any other method.
              </div>
              
              <div class="footer">
                <p>If you didn't request this OTP, please ignore this email.</p>
                <p><strong>Session Duration:</strong> Once logged in, you'll remain authenticated for ${SESSION_VALIDITY_HOURS} hours.</p>
                <p>&copy; ${new Date().getFullYear()} Maurvi Consultants. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });
    Logger.log(`Sent OTP email to ${email}`);
    return { status: 'success' };
  } catch (err) {
    Logger.log(`generateOTPServer CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'generateOTPServer Error', err, `Email: ${email}`); // Try logging even if sheet wasn't opened yet
    return { status: 'error', message: 'Failed to send email: ' + err.message };
  }
}

function verifyOTPServer(email, otp) {
   if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    Logger.log(`verifyOTPServer: Unauthorized attempt by ${email}`);
    return { status: 'error', message: 'Unauthorized user.' };
  }
  try {
      const cache = CacheService.getScriptCache();
      const storedOTP = cache.get(`otp_${email}`);
      if (!storedOTP) { Logger.log(`verifyOTPServer: OTP expired or not found for ${email}`); return { status: 'error', message: 'OTP expired or was invalid. Please request a new one.' }; }
      const submittedOTP = otp.replace('-', '');
      if (submittedOTP === storedOTP) {
        const sessionToken = Utilities.computeHmacSha256Signature(email + new Date().getTime(), Utilities.getUuid()).map(b => (b + 256).toString(16).slice(-2)).join('');
        cache.put(`session_${sessionToken}`, email, SESSION_VALIDITY_HOURS * 3600);
        cache.remove(`otp_${email}`);
        Logger.log(`verifyOTPServer: OTP verified for ${email}. Session token created.`);
        return { status: 'success', sessionToken: sessionToken, userInfo: { name: email.split('@')[0] } };
      } else {
        Logger.log(`verifyOTPServer: Invalid OTP entered for ${email}. Submitted: ${submittedOTP}, Expected: ${storedOTP}`);
        return { status: 'error', message: 'Invalid OTP. Please try again.' };
      }
  } catch (err) {
       Logger.log(`verifyOTPServer CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
       _logErrorToSheet(null, 'verifyOTPServer Error', err, `Email: ${email}`);
       return { status: 'error', message: 'Server error during OTP verification.' };
  }
}

function verifySessionServer(sessionToken) {
  try {
      const cache = CacheService.getScriptCache();
      const email = cache.get(`session_${sessionToken}`);
      if (email) {
        cache.put(`session_${sessionToken}`, email, SESSION_VALIDITY_HOURS * 3600);
        Logger.log(`verifySessionServer: Valid session found for ${email}. Refreshed.`);
        return { status: 'success', userInfo: { name: email.split('@')[0], email: email } };
      } else {
        Logger.log(`verifySessionServer: Session token invalid or expired: ${sessionToken}`);
        return { status: 'error', message: 'Session expired.' };
      }
  } catch (err) {
      Logger.log(`verifySessionServer CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
      _logErrorToSheet(null, 'verifySessionServer Error', err, `Token: ${sessionToken}`);
      return { status: 'error', message: 'Server error during session verification.' };
  }
}

// --- SOCIAL LOGIN / USER MANAGEMENT FUNCTIONS ---

/**
 * Registers a new user from social login (Google, Microsoft, Apple)
 * Stores user info and sends approval request to admin
 */
function registerSocialUser(email, name, provider) {
  try {
    Logger.log(`registerSocialUser: Attempting to register ${email} from ${provider}`);
    
    const props = PropertiesService.getScriptProperties();
    const usersJson = props.getProperty('registeredUsers') || '{}';
    const users = JSON.parse(usersJson);
    
    // Check if user already exists
    if (users[email]) {
      Logger.log(`registerSocialUser: User ${email} already registered`);
      return { 
        status: 'existing', 
        approved: users[email].approved,
        message: users[email].approved ? 'User already approved' : 'Waiting for admin approval'
      };
    }
    
    // Register new user
    users[email] = {
      name: name,
      provider: provider,
      approved: false,
      registeredAt: new Date().toISOString()
    };
    
    props.setProperty('registeredUsers', JSON.stringify(users));
    Logger.log(`registerSocialUser: User ${email} registered successfully`);
    
    // Send approval request to admin
    try {
      const webAppUrl = ScriptApp.getService().getUrl();
      const approveUrl = `${webAppUrl}?action=approve&email=${encodeURIComponent(email)}`;
      const rejectUrl = `${webAppUrl}?action=reject&email=${encodeURIComponent(email)}`;
      
      MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: `New User Registration Request - ${name}`,
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f7; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              h1 { color: #1d1d1f; font-size: 24px; margin: 0 0 16px 0; }
              .info { background: #f5f5f7; padding: 16px; border-radius: 8px; margin: 16px 0; }
              .info-item { margin: 8px 0; }
              .label { font-weight: 600; color: #1d1d1f; }
              .value { color: #86868b; }
              .button-container { margin: 24px 0; text-align: center; }
              .approve-btn { 
                display: inline-block; 
                background: linear-gradient(135deg, #30d158 0%, #28cd41 100%); 
                color: white; 
                padding: 14px 32px; 
                border-radius: 8px; 
                text-decoration: none; 
                font-weight: 600; 
                margin: 8px;
                box-shadow: 0 2px 8px rgba(48, 209, 88, 0.3);
              }
              .reject-btn { 
                display: inline-block; 
                background: linear-gradient(135deg, #ff3b30 0%, #d32f2f 100%); 
                color: white; 
                padding: 14px 32px; 
                border-radius: 8px; 
                text-decoration: none; 
                font-weight: 600; 
                margin: 8px;
                box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3);
              }
              .footer { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e5e7; color: #86868b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔔 New User Registration</h1>
              <p>A new user has requested access to the Trading Signals Platform.</p>
              
              <div class="info">
                <div class="info-item"><span class="label">Name:</span> <span class="value">${name}</span></div>
                <div class="info-item"><span class="label">Email:</span> <span class="value">${email}</span></div>
                <div class="info-item"><span class="label">Provider:</span> <span class="value">${provider}</span></div>
                <div class="info-item"><span class="label">Registered:</span> <span class="value">${new Date().toLocaleString()}</span></div>
              </div>
              
              <p><strong>Click one of the buttons below to approve or reject this user:</strong></p>
              
              <div class="button-container">
                <a href="${approveUrl}" class="approve-btn">✓ Approve User</a>
                <a href="${rejectUrl}" class="reject-btn">✗ Reject User</a>
              </div>
              
              <p style="font-size: 12px; color: #86868b; margin-top: 16px;">
                Clicking approve will grant immediate access to the user and send them a confirmation email.
                Clicking reject will remove the registration request and notify the user.
              </p>
              
              <div class="footer">
                <p>Maurvi Consultants - Trading Signals Platform</p>
                <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      Logger.log(`registerSocialUser: Approval request email sent to admin`);
    } catch (emailErr) {
      Logger.log(`registerSocialUser: Failed to send approval email: ${emailErr.message}`);
      // Don't fail registration if email fails
    }
    
    return { 
      status: 'success', 
      approved: false,
      message: 'Registration successful. Waiting for admin approval.'
    };
    
  } catch (err) {
    Logger.log(`registerSocialUser CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'registerSocialUser Error', err, `Email: ${email}, Provider: ${provider}`);
    return { status: 'error', message: 'Server error during registration.' };
  }
}

/**
 * Checks if a social login user is approved
 */
function checkUserApproval(email) {
  try {
    // Admin is always approved
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return { status: 'success', approved: true, isAdmin: true };
    }
    
    const props = PropertiesService.getScriptProperties();
    const usersJson = props.getProperty('registeredUsers') || '{}';
    const users = JSON.parse(usersJson);
    
    if (!users[email]) {
      Logger.log(`checkUserApproval: User ${email} not found`);
      return { status: 'error', message: 'User not registered' };
    }
    
    Logger.log(`checkUserApproval: User ${email} approval status: ${users[email].approved}`);
    return { 
      status: 'success', 
      approved: users[email].approved,
      isAdmin: false
    };
    
  } catch (err) {
    Logger.log(`checkUserApproval CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'checkUserApproval Error', err, `Email: ${email}`);
    return { status: 'error', message: 'Server error checking approval status.' };
  }
}

/**
 * Approves a user for access (admin function)
 */
function approveUser(email) {
  try {
    Logger.log(`approveUser: Attempting to approve ${email}`);
    
    const props = PropertiesService.getScriptProperties();
    const usersJson = props.getProperty('registeredUsers') || '{}';
    const users = JSON.parse(usersJson);
    
    if (!users[email]) {
      const message = `User ${email} not found in registration list`;
      Logger.log(`approveUser: ${message}`);
      return { status: 'error', message: message };
    }
    
    users[email].approved = true;
    users[email].approvedAt = new Date().toISOString();
    props.setProperty('registeredUsers', JSON.stringify(users));
    
    Logger.log(`approveUser: User ${email} approved successfully`);
    
    // Send approval notification to user
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'Your Access Has Been Approved - Maurvi Consultants',
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f7; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              h1 { color: #1d1d1f; font-size: 24px; margin: 0 0 16px 0; }
              .success-box { background: linear-gradient(135deg, rgba(48, 209, 88, 0.1), rgba(48, 209, 88, 0.15)); padding: 20px; border-radius: 8px; border-left: 4px solid #30d158; margin: 16px 0; }
              .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
              .footer { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e5e7; color: #86868b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Access Approved!</h1>
              <p>Good news! Your access to the Maurvi Consultants Trading Signals Platform has been approved.</p>
              
              <div class="success-box">
                <strong>You can now sign in</strong> using your ${users[email].provider} account without needing to enter an OTP.
              </div>
              
              <p>Simply click the "${users[email].provider}" button on the login screen to access the platform.</p>
              
              <div class="footer">
                <p>Maurvi Consultants - Trading Signals Platform</p>
                <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      Logger.log(`approveUser: Approval notification sent to ${email}`);
    } catch (emailErr) {
      Logger.log(`approveUser: Failed to send approval notification: ${emailErr.message}`);
      // Don't fail approval if email fails
    }
    
    return { status: 'success', message: `User ${email} approved successfully` };
    
  } catch (err) {
    Logger.log(`approveUser CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'approveUser Error', err, `Email: ${email}`);
    return { status: 'error', message: 'Server error during approval.' };
  }
}

/**
 * Lists all registered users (admin function)
 */
function listRegisteredUsers() {
  try {
    const props = PropertiesService.getScriptProperties();
    const usersJson = props.getProperty('registeredUsers') || '{}';
    const users = JSON.parse(usersJson);
    
    Logger.log(`listRegisteredUsers: Found ${Object.keys(users).length} registered users`);
    return { status: 'success', users: users };
    
  } catch (err) {
    Logger.log(`listRegisteredUsers CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'listRegisteredUsers Error', err, '');
    return { status: 'error', message: 'Server error listing users.' };
  }
}

/**
 * Verifies social login token and creates session if user is approved
 */
function verifySocialLogin(idToken, provider) {
  try {
    Logger.log(`verifySocialLogin: Verifying ${provider} token`);
    
    // For Google OAuth, we would verify the ID token here
    // For now, we'll accept the token as-is and extract email
    // In production, you should validate the token with OAuth provider
    
    // This is a placeholder - in real implementation, decode and verify the JWT token
    // For Google: https://developers.google.com/identity/sign-in/web/backend-auth
    // For Microsoft: https://docs.microsoft.com/en-us/azure/active-directory/develop/id-tokens
    // For Apple: https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api
    
    // For testing purposes, we'll extract email from a simple base64-encoded token
    // In production, replace this with proper JWT verification
    let email, name;
    try {
      const decoded = JSON.parse(Utilities.newBlob(Utilities.base64Decode(idToken)).getDataAsString());
      email = decoded.email;
      name = decoded.name || email.split('@')[0];
    } catch (decodeErr) {
      Logger.log(`verifySocialLogin: Failed to decode token: ${decodeErr.message}`);
      return { status: 'error', message: 'Invalid token format' };
    }
    
    // Check if user is admin
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      const sessionToken = Utilities.computeHmacSha256Signature(email + new Date().getTime(), Utilities.getUuid()).map(b => (b + 256).toString(16).slice(-2)).join('');
      const cache = CacheService.getScriptCache();
      cache.put(`session_${sessionToken}`, email, SESSION_VALIDITY_HOURS * 3600);
      Logger.log(`verifySocialLogin: Admin ${email} logged in via ${provider}`);
      return { 
        status: 'success', 
        sessionToken: sessionToken, 
        userInfo: { name: name, email: email, isAdmin: true } 
      };
    }
    
    // Check approval status
    const approvalCheck = checkUserApproval(email);
    if (approvalCheck.status === 'error' || !approvalCheck.approved) {
      Logger.log(`verifySocialLogin: User ${email} not approved`);
      return { 
        status: 'pending_approval', 
        message: 'Your account is waiting for admin approval. You will receive an email when approved.',
        userInfo: { name: name, email: email }
      };
    }
    
    // User is approved, create session
    const sessionToken = Utilities.computeHmacSha256Signature(email + new Date().getTime(), Utilities.getUuid()).map(b => (b + 256).toString(16).slice(-2)).join('');
    const cache = CacheService.getScriptCache();
    cache.put(`session_${sessionToken}`, email, SESSION_VALIDITY_HOURS * 3600);
    
    Logger.log(`verifySocialLogin: User ${email} logged in via ${provider}`);
    return { 
      status: 'success', 
      sessionToken: sessionToken, 
      userInfo: { name: name, email: email, isAdmin: false } 
    };
    
  } catch (err) {
    Logger.log(`verifySocialLogin CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'verifySocialLogin Error', err, `Provider: ${provider}`);
    return { status: 'error', message: 'Server error during social login verification.' };
  }
}

/**
 * Modified generateOTPServer for guest login - sends OTP to admin instead of guest
 */
function generateGuestOTP() {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedOTP = `${otp.substring(0, 3)}-${otp.substring(3, 6)}`;
    const cache = CacheService.getScriptCache();
    cache.put(`guest_otp`, otp, OTP_VALIDITY_MINUTES * 60);
    Logger.log(`Generated guest OTP ${formattedOTP}`);
    
    // Send OTP to admin
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: `Guest Login OTP Request: ${formattedOTP}`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background: rgba(255, 255, 255, 0.98);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border-radius: 24px; 
              padding: 0;
              box-shadow: 
                0 20px 60px rgba(0, 0, 0, 0.3),
                0 8px 24px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 40px 60px 40px;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: shimmer 6s ease-in-out infinite;
            }
            @keyframes shimmer {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(10%, 10%); }
            }
            .logo { 
              font-size: 32px; 
              font-weight: 800; 
              color: white;
              margin-bottom: 12px;
              text-align: center;
              position: relative;
              z-index: 1;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              letter-spacing: -0.5px;
            }
            .tagline {
              color: rgba(255, 255, 255, 0.9);
              font-size: 14px;
              text-align: center;
              position: relative;
              z-index: 1;
              font-weight: 500;
              letter-spacing: 0.5px;
            }
            .content { 
              padding: 40px; 
              text-align: center;
            }
            h1 { 
              color: #1d1d1f; 
              font-size: 28px; 
              margin: 0 0 12px 0; 
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .subtitle { 
              color: #86868b; 
              font-size: 16px; 
              margin: 0 0 32px 0;
              line-height: 1.5;
            }
            .otp-box { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              font-size: 48px; 
              font-weight: 800; 
              letter-spacing: 12px; 
              padding: 32px; 
              border-radius: 16px; 
              margin: 32px 0; 
              font-family: 'SF Mono', 'Courier New', monospace;
              box-shadow: 
                0 8px 24px rgba(102, 126, 234, 0.4),
                0 4px 12px rgba(118, 75, 162, 0.3),
                inset 0 2px 0 rgba(255, 255, 255, 0.2),
                inset 0 -2px 0 rgba(0, 0, 0, 0.1);
              position: relative;
              overflow: hidden;
            }
            .otp-box::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
              animation: slide 3s ease-in-out infinite;
            }
            @keyframes slide {
              0% { left: -100%; }
              50%, 100% { left: 100%; }
            }
            .validity { 
              display: flex;
              align-items: center;
              justify-content: center;
              color: #86868b; 
              font-size: 14px; 
              margin: 24px 0;
              font-weight: 500;
            }
            .validity::before {
              content: '⏱️';
              margin-right: 8px;
              font-size: 18px;
            }
            .info-box { 
              color: #0A84FF; 
              font-size: 13px; 
              margin: 24px 0; 
              padding: 20px; 
              background: linear-gradient(135deg, rgba(10, 132, 255, 0.08), rgba(10, 132, 255, 0.12));
              border-radius: 12px; 
              border-left: 4px solid #0A84FF;
              text-align: left;
              line-height: 1.6;
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
            }
            .info-box::before {
              content: 'ℹ️';
              margin-right: 8px;
              font-size: 16px;
            }
            .footer { 
              color: #86868b; 
              font-size: 12px; 
              margin-top: 32px; 
              padding-top: 24px; 
              border-top: 1px solid #e5e5e7;
              line-height: 1.6;
            }
            .footer p { margin: 8px 0; }
            .footer strong { color: #1d1d1f; font-weight: 600; }
            @media (max-width: 600px) {
              .container { margin: 10px; border-radius: 20px; }
              .header { padding: 30px 20px 50px 20px; }
              .content { padding: 30px 20px; }
              .otp-box { font-size: 36px; letter-spacing: 8px; padding: 24px; }
              h1 { font-size: 24px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Maurvi Consultants</div>
              <div class="tagline">Automated Trading Signals Platform</div>
            </div>
            <div class="content">
              <h1>Guest Login OTP Request</h1>
              <p class="subtitle">A guest user has requested access to the Trading Signals Platform</p>
              
              <div class="otp-box">${formattedOTP}</div>
              
              <p class="validity">Valid for ${OTP_VALIDITY_MINUTES} minutes</p>
              
              <div class="info-box">
                <strong>Guest Login:</strong> Share this OTP with the guest user to grant them temporary access to the platform.
              </div>
              
              <div class="footer">
                <p>This OTP was generated for a guest login request.</p>
                <p>&copy; ${new Date().getFullYear()} Maurvi Consultants. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });
    Logger.log(`Sent guest OTP email to admin`);
    return { status: 'success', message: 'OTP sent to admin. Please ask admin for the OTP.' };
  } catch (err) {
    Logger.log(`generateGuestOTP CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'generateGuestOTP Error', err, '');
    return { status: 'error', message: 'Failed to generate OTP: ' + err.message };
  }
}

/**
 * Verifies guest OTP (entered by guest after receiving from admin)
 */
function verifyGuestOTP(otp) {
  try {
    const cache = CacheService.getScriptCache();
    const storedOTP = cache.get(`guest_otp`);
    if (!storedOTP) {
      Logger.log(`verifyGuestOTP: OTP expired or not found`);
      return { status: 'error', message: 'OTP expired or was invalid. Please request a new one.' };
    }
    const submittedOTP = otp.replace('-', '');
    if (submittedOTP === storedOTP) {
      const sessionToken = Utilities.computeHmacSha256Signature('guest_' + new Date().getTime(), Utilities.getUuid()).map(b => (b + 256).toString(16).slice(-2)).join('');
      cache.put(`session_${sessionToken}`, 'guest@maurvi.local', SESSION_VALIDITY_HOURS * 3600);
      cache.remove(`guest_otp`);
      Logger.log(`verifyGuestOTP: Guest OTP verified. Session token created.`);
      return { status: 'success', sessionToken: sessionToken, userInfo: { name: 'Guest User', email: 'guest@maurvi.local' } };
    } else {
      Logger.log(`verifyGuestOTP: Invalid OTP entered. Submitted: ${submittedOTP}, Expected: ${storedOTP}`);
      return { status: 'error', message: 'Invalid OTP. Please try again.' };
    }
  } catch (err) {
    Logger.log(`verifyGuestOTP CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'verifyGuestOTP Error', err, '');
    return { status: 'error', message: 'Server error during OTP verification.' };
  }
}

// --- DATA-READING FUNCTIONS ---

/** Utility to get sheet data with caching - Enhanced with auto-creation */
function _getSheetData(sheetName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `sheetData_${sheetName}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData != null) { return JSON.parse(cachedData); }

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    // Auto-create sheet if it doesn't exist (for date-suffixed sheets)
    if (!sheet) {
      Logger.log(`_getSheetData: Sheet not found - ${sheetName}. Attempting to create...`);
      
      // Extract date suffix and sheet type
      const scriptTimeZone = Session.getScriptTimeZone();
      const today = Utilities.formatDate(new Date(), scriptTimeZone, 'yyyy-MM-dd');
      
      // Only auto-create if it's today's sheet
      if (sheetName.includes(`_${today}`)) {
        try {
          // Insert at position 0 to maintain correct ordering
          sheet = ss.insertSheet(sheetName, 0);
          Logger.log(`Auto-created sheet: ${sheetName} at position 0`);
          
          // Add headers based on sheet type
          if (sheetName.startsWith('Indicator1_')) {
            const headers = ['Symbol'];
            for (let i = 1; i <= 5; i++) {
              headers.push(`Reason ${i}`, `Time ${i}`);
            }
            for (let i = 1; i <= 21; i++) {
              headers.push(`Sync Reason ${i}`, `Sync Time ${i}`);
            }
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          } else if (sheetName.startsWith('Indicator2_')) {
            sheet.getRange('A1:E1').setValues([['Date', 'Time', 'Ticker', 'Reason', 'Capital (Cr)']]);
          } else if (sheetName.startsWith('DebugLogs_')) {
            sheet.getRange('A1:E1').setValues([['Timestamp', 'Context', 'Error Message', 'Details', 'Stack']]);
          }
          
          Logger.log(`Headers added to ${sheetName}`);
        } catch (createErr) {
          Logger.log(`Failed to auto-create sheet: ${createErr.message}`);
          _logErrorToSheet(null, '_getSheetData Auto-Create Error', createErr, `Sheet: ${sheetName}`);
          return [];
        }
      } else {
        // Not today's sheet - don't create
        Logger.log(`_getSheetData: Sheet not found and not today's sheet - ${sheetName}`);
        _logErrorToSheet(null, '_getSheetData Error', new Error('Sheet not found'), `Sheet: ${sheetName}`);
        return [];
      }
    }
    
    const lastRow = sheet.getLastRow();
    let data = [];
    if (lastRow > 0) { data = sheet.getDataRange().getDisplayValues(); }
    else { Logger.log(`_getSheetData: Sheet ${sheetName} is empty.`); }
    
    // Use shorter cache TTL for faster updates (30 seconds instead of 60)
    // Only cache if data is small enough (less than 90KB when stringified to avoid 100KB limit)
    try {
      const dataString = JSON.stringify(data);
      const dataSize = dataString.length;
      if (dataSize < 90000) { // Safe margin below 100KB limit
        cache.put(cacheKey, dataString, 30);
        Logger.log(`_getSheetData: Cached ${sheetName} (${dataSize} bytes)`);
      } else {
        Logger.log(`_getSheetData: Data too large to cache for ${sheetName} (${dataSize} bytes). Skipping cache.`);
      }
    } catch (cacheErr) {
      Logger.log(`_getSheetData: Failed to cache ${sheetName}: ${cacheErr.message}. Continuing without cache.`);
    }
    return data;
  } catch (err) {
    Logger.log(`_getSheetData CRITICAL ERROR for ${sheetName}: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, '_getSheetData Error', err, `Sheet: ${sheetName}`);
    return { error: `Server error in _getSheetData: ${err.message}`, stack: err.stack };
  }
}

/**
 * Helper function to convert time string (HH:mm:ss) to a comparable numeric value
 * Fixes the issue where "10:55" appears before "9:58" in string sorting
 * @param {string} timeStr - Time string in format "HH:mm:ss"
 * @return {number} - Numeric value for comparison (seconds since midnight)
 */
function _timeToSeconds(timeStr) {
  if (!timeStr || timeStr === '') return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parts.length > 2 ? (parseInt(parts[2], 10) || 0) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

/** Gets all data for the dashboard - uses today's date-suffixed sheets */
function getDashboardData() {
  try {
    Logger.log('getDashboardData: Function started.');
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = Utilities.formatDate(new Date(), scriptTimeZone, 'yyyy-MM-dd');
    Logger.log(`getDashboardData: Today's date is ${today}`);

    // Use date-suffixed sheet names (no separate Nifty sheet anymore)
    const ind1SheetName = `Indicator1_${today}`;
    const ind2SheetName = `Indicator2_${today}`;

    const ind1FullData = _getSheetData(ind1SheetName);
    const ind2FullData = _getSheetData(ind2SheetName);

    if (ind1FullData.error || ind2FullData.error) { 
      throw new Error(`Error fetching sheet data: Ind1(${ind1FullData.error}), Ind2(${ind2FullData.error})`); 
    }
    if (!Array.isArray(ind1FullData) || !Array.isArray(ind2FullData)) { 
      throw new Error("_getSheetData did not return arrays."); 
    }

    // Process Indicator1 data (skip header row)
    const ind1Data = ind1FullData.slice(ind1FullData.length > 0 ? 1 : 0);
    // Process Indicator2 data (skip header row)
    const ind2Data = ind2FullData.slice(ind2FullData.length > 0 ? 1 : 0);

    Logger.log(`getDashboardData: Data counts - Ind1: ${ind1Data.length}, Ind2: ${ind2Data.length}`);

    // Extract Nifty data from Indicator2 sheet
    const niftyData = ind2Data.filter(row => {
      const ticker = (row[2] || '').toUpperCase();
      return ticker === 'NIFTY' || ticker === 'NIFTY1!' || ticker === 'NIFTY 50';
    });

    // Build live feed from Indicator1 data (signals from indicator 1 only)
    const liveFeed = [];
    ind1Data.forEach(row => {
      if (!row[0]) return; // Skip empty rows
      const symbol = row[0];
      
      // Collect all Indicator1 signals (reason/time pairs starting from column B)
      for (let i = 1; i < 11; i += 2) {
        if (row[i] && row[i] !== '') {
          // Check if this symbol has any sync events (columns L onwards)
          let hasSyncEvents = false;
          for (let j = 11; j < 53; j += 2) {
            if (row[j] && row[j] !== '') {
              hasSyncEvents = true;
              break;
            }
          }
          
          liveFeed.push({
            symbol: symbol,
            time: row[i + 1] || '',
            reason: row[i],
            status: hasSyncEvents ? 'Synced' : 'Awaiting',
            syncTime: hasSyncEvents ? (row[12] || '') : '', // First sync time
            syncReason: hasSyncEvents ? (row[11] || '') : '' // First sync reason
          });
        }
      }
    });
    
    // Sort by time descending (fix for 10am appearing before 9am issue)
    liveFeed.sort((a, b) => _timeToSeconds(b.time) - _timeToSeconds(a.time));

    // Build logs from Indicator2 data (categorize by reason pattern)
    // Show ALL Indicator2 signals regardless of sync status
    const logs = { hvd: [], bullish: [], bearish: [], oversold: [], overbought: [] };
    
    ind2Data.forEach(row => {
      const ticker = (row[2] || '').toUpperCase();
      // Skip Nifty entries in logs
      if (ticker === 'NIFTY' || ticker === 'NIFTY1!' || ticker === 'NIFTY 50') return;
      
      const reason = (row[3] || '').toLowerCase();
      const symbol = row[2];
      const time = row[1];
      
      // Check if this signal is synced with Indicator1 (for status only)
      const ind1Row = ind1Data.find(r => r[0] === symbol);
      let isSynced = false;
      
      if (ind1Row) {
        // Check if time matches any sync time in columns L onwards
        for (let j = 12; j < 53; j += 2) {
          if (ind1Row[j] && ind1Row[j] === time) {
            isSynced = true;
            break;
          }
        }
      }
      
      // Include all Indicator2 signals with appropriate status
      const signal = { 
        symbol: symbol, 
        time: time, 
        reason: row[3], 
        capital: row[4],
        status: isSynced ? 'Synced' : 'Awaiting' // Set status based on sync state
      };
      
      // Categorize based on reason
      // Define bullish and bearish patterns
      const bullishPatterns = ['bullish', 'engulfing', 'pin bar', 'morning star', 'hammer', 'white soldiers', 'oversold'];
      const bearishPatterns = ['bearish', 'harami', 'evening star', 'shooting star', 'doji', 'overbought'];
      
      if (reason.includes('hvd')) {
        logs.hvd.push(signal);
      } else if (reason.includes('oversold')) {
        // Oversold signals go to oversold category (standalone alerts)
        logs.oversold.push(signal);
      } else if (reason.includes('overbought')) {
        // Overbought signals go to overbought category (standalone alerts)
        logs.overbought.push(signal);
      } else {
        // Check for bullish or bearish patterns in the reason text
        const isBullish = bullishPatterns.some(pattern => reason.includes(pattern));
        const isBearish = bearishPatterns.some(pattern => reason.includes(pattern));
        
        if (isBullish) {
          logs.bullish.push(signal);
        } else if (isBearish) {
          logs.bearish.push(signal);
        }
        // If neither bullish nor bearish, signal is not categorized in logs
      }
    });
    
    for (const key in logs) { 
      logs[key].sort((a, b) => _timeToSeconds(b.time) - _timeToSeconds(a.time)); 
    }

    // Build dashboard synced list (symbols with sync events from Indicator2)
    const dashboardSyncedList = [];
    ind1Data.forEach(row => {
      if (!row[0]) return;
      const symbol = row[0];
      
      // Check if there are any sync events (columns L onwards - now up to 21 pairs)
      const ind2Reasons = [];
      for (let i = 11; i < 53; i += 2) { // 11 to 52 (21 pairs starting from column L)
        if (row[i] && row[i] !== '') {
          ind2Reasons.push({
            time: row[i + 1] || '',
            reason: row[i]
          });
        }
      }
      
      if (ind2Reasons.length > 0) {
        // Get the first Indicator1 reason for this symbol
        const ind1Reason = row[1] || '';
        const ind1Time = row[2] || '';
        
        ind2Reasons.sort((a, b) => _timeToSeconds(b.time) - _timeToSeconds(a.time));
        dashboardSyncedList.push({
          symbol: symbol,
          ind1Reason: ind1Reason,
          ind1Time: ind1Time,
          ind2Reasons: ind2Reasons
        });
        
        // Update status in liveFeed for synced signals
        liveFeed.forEach(feedItem => {
          if (feedItem.symbol === symbol && feedItem.status !== 'Synced') {
            feedItem.status = 'Synced';
            feedItem.syncTime = ind2Reasons[0].time;
            feedItem.syncReason = ind2Reasons[0].reason;
          }
        });
      }
    });

    // Calculate KPIs
    const syncedSymbols = new Set(dashboardSyncedList.map(s => s.symbol));
    const kpi = { 
      totalSignals: liveFeed.length, 
      syncedSignals: syncedSymbols.size, 
      latestSignal: liveFeed.length > 0 ? liveFeed[0].symbol : '-' 
    };

    // Build tickers (HVD and patterns)
    const tickers = {
      hvd: logs.hvd.sort((a, b) => _timeToSeconds(b.time) - _timeToSeconds(a.time)).slice(0, 7),
      patterns: [...logs.bullish, ...logs.bearish].sort((a, b) => _timeToSeconds(b.time) - _timeToSeconds(a.time)).slice(0, 7)
    };

    // Get latest Nifty data (from Indicator2 sheet, filtered by ticker name)
    const latestNifty = niftyData.length > 0 ? 
      niftyData.reduce((latest, current) => 
        (_timeToSeconds(current[1]) > _timeToSeconds(latest[1]) ? current : latest), niftyData[0]) : null;
    const niftyDataObj = latestNifty ? { 
      ticker: latestNifty[2], 
      timestamp: latestNifty[1], 
      reason: latestNifty[3] 
    } : null;

    Logger.log('getDashboardData: Successfully processed all data.');

    return { kpi, niftyData: niftyDataObj, tickers, dashboardSyncedList, liveFeed, logs };
  } catch (err) {
    Logger.log(`getDashboardData CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'getDashboardData Error', err, '');
    return { error: `Server error in getDashboardData: ${err.message}`, stack: err.stack };
  }
}

/** Gets historical dates - scans for all Indicator1_ prefixed sheets */
function getHistoricalDates() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const allSheets = ss.getSheets();
    const dates = new Set();
    
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = Utilities.formatDate(new Date(), scriptTimeZone, 'yyyy-MM-dd');
    
    allSheets.forEach(sheet => {
      const name = sheet.getName();
      if (name.startsWith('Indicator1_')) {
        const dateStr = name.replace('Indicator1_', '');
        // Exclude current date
        if (dateStr !== today) {
          dates.add(dateStr);
        }
      }
    });
    
    const sortedDates = Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
    Logger.log(`getHistoricalDates: Found ${sortedDates.length} historical dates.`);
    return sortedDates;
  } catch (err) {
    Logger.log(`getHistoricalDates CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'getHistoricalDates Error', err, '');
    return { error: `Server error in getHistoricalDates: ${err.message}`, stack: err.stack };
  }
}

/** Gets signals for a specific date */
function getSignalsForDate(dateStr) {
  try {
    Logger.log(`getSignalsForDate: Fetching data for date ${dateStr}`);
    
    const ind1SheetName = `Indicator1_${dateStr}`;
    const ind1FullData = _getSheetData(ind1SheetName);
    
    if (ind1FullData.error) throw new Error(ind1FullData.error);
    if (!Array.isArray(ind1FullData)) { throw new Error("_getSheetData did not return an array for signals for date."); }
    
    const ind1Data = ind1FullData.slice(ind1FullData.length > 0 ? 1 : 0);
    
    // Build signals from Indicator1 data with all sync events
    const signalsBySymbol = {};
    ind1Data.forEach(row => {
      if (!row[0]) return; // Skip empty rows
      const symbol = row[0];
      
      // Collect all Indicator1 signals
      for (let i = 1; i < 11; i += 2) {
        if (row[i] && row[i] !== '') {
          // Collect all Indicator2 sync events (columns L onwards - up to 21 pairs)
          const ind2Reasons = [];
          for (let j = 11; j < 53; j += 2) { // 11 to 52 (21 pairs starting from column L)
            if (row[j] && row[j] !== '') {
              ind2Reasons.push({
                time: row[j + 1] || '',
                reason: row[j]
              });
            }
          }
          
          // Sort sync events by time descending
          ind2Reasons.sort((a, b) => _timeToSeconds(b.time) - _timeToSeconds(a.time));
          
          const signal = {
            symbol: symbol,
            time: row[i + 1] || '',
            reason: row[i],
            status: ind2Reasons.length > 0 ? 'Synced' : 'Awaiting',
            ind2Reasons: ind2Reasons
          };
          
          // Group by symbol for clubbing
          if (!signalsBySymbol[symbol]) {
            signalsBySymbol[symbol] = signal;
          } else {
            // Merge ind2Reasons if multiple signals for same symbol
            signalsBySymbol[symbol].ind2Reasons = [...signalsBySymbol[symbol].ind2Reasons, ...ind2Reasons];
          }
        }
      }
    });
    
    const signals = Object.values(signalsBySymbol);
    signals.sort((a, b) => _timeToSeconds(b.time) - _timeToSeconds(a.time));
    Logger.log(`getSignalsForDate: Found ${signals.length} signals for ${dateStr}`);
    return { date: dateStr, signals: signals };
  } catch (err) {
    Logger.log(`getSignalsForDate CRITICAL ERROR for ${dateStr}: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'getSignalsForDate Error', err, `Date: ${dateStr}`);
    return { error: `Server error in getSignalsForDate: ${err.message}`, stack: err.stack };
  }
}

// --- GEMINI API FUNCTIONS ---

/**
 * Calls Gemini API to analyze a trading signal using Google Search grounding.
 * @param {string} symbol The stock symbol (e.g., "RELIANCE").
 * @param {string} ind1Reason The reason from Indicator 1.
 * @param {object[]} ind2Reasons Array of sync reasons from Indicator 2 [{time: "...", reason: "..."}].
 * @return {object} Object with { analysis: "..." } or { error: "..." }.
 */
function analyzeSignalWithGemini(symbol, ind1Reason, ind2Reasons) {
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    return { error: "Gemini API Key not configured in code.gs." };
  }
  try {
    Logger.log(`analyzeSignalWithGemini: Analyzing ${symbol}. Ind1: ${ind1Reason}, Ind2 Reasons: ${JSON.stringify(ind2Reasons)}`);

    let syncReasonText = "No sync event.";
    if (ind2Reasons && ind2Reasons.length > 0) {
      // Use the latest sync reason
      syncReasonText = `Synced due to: ${ind2Reasons[0].reason} at ${ind2Reasons[0].time}.`;
    }

    const prompt = `Analyze the following trading signal for the stock symbol ${symbol}.
Indicator 1 triggered due to: "${ind1Reason}".
Sync status: ${syncReasonText}
Provide a brief, neutral analysis (1-2 paragraphs max) considering these technical triggers and current market context for ${symbol}. Use Google Search for recent news or context. Do not give financial advice. Focus on explaining what the triggers might suggest in plain language.`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      tools: [{ "google_search": {} }] // Enable grounding
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true // Prevent throwing errors for non-200 responses
    };

    const response = UrlFetchApp.fetch(GEMINI_API_ENDPOINT, options);
    const responseCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());

    if (responseCode === 200 && result.candidates && result.candidates[0].content && result.candidates[0].content.parts) {
      const analysis = result.candidates[0].content.parts[0].text;
      Logger.log(`analyzeSignalWithGemini: Success for ${symbol}. Analysis length: ${analysis.length}`);
      return { analysis: analysis };
    } else {
      const errorMsg = `Gemini API Error (HTTP ${responseCode}): ${JSON.stringify(result)}`;
      Logger.log(`analyzeSignalWithGemini: ${errorMsg}`);
      _logErrorToSheet(null, 'analyzeSignalWithGemini Error', new Error(errorMsg), `Symbol: ${symbol}`);
      return { error: `Could not get analysis from Gemini. ${result.error ? result.error.message : '(See logs)'}` };
    }

  } catch (err) {
    Logger.log(`analyzeSignalWithGemini CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'analyzeSignalWithGemini Error', err, `Symbol: ${symbol}`);
    return { error: `Server error during analysis: ${err.message}` };
  }
}

/**
 * Calls Gemini API for a general chat conversation.
 * @param {string} userMessage The user's latest message.
 * @param {object[]} chatHistory Array of previous messages [{role: "user"/"model", parts: [{text: "..."}]}].
 * @return {object} Object with { reply: "..." } or { error: "..." }.
 */
function chatWithGemini(userMessage, chatHistory) {
   if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    return { error: "Gemini API Key not configured in code.gs." };
  }
  try {
    Logger.log(`chatWithGemini: Received message. History length: ${chatHistory.length}`);

    // Ensure history is in the correct format
     const history = (chatHistory || []).map(entry => ({
         role: entry.role,
         parts: [{ text: entry.parts[0].text }] // Ensure parts structure
     }));

    const payload = {
      contents: [
        ...history, // Add previous history
        { role: "user", parts: [{ text: userMessage }] } // Add new user message
      ]
      // No grounding needed for general chat
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(GEMINI_API_ENDPOINT, options);
    const responseCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());

    if (responseCode === 200 && result.candidates && result.candidates[0].content && result.candidates[0].content.parts) {
      const reply = result.candidates[0].content.parts[0].text;
      Logger.log(`chatWithGemini: Success. Reply length: ${reply.length}`);
      return { reply: reply };
    } else {
      const errorMsg = `Gemini API Chat Error (HTTP ${responseCode}): ${JSON.stringify(result)}`;
      Logger.log(`chatWithGemini: ${errorMsg}`);
      _logErrorToSheet(null, 'chatWithGemini Error', new Error(errorMsg), `History Length: ${chatHistory.length}`);
      return { error: `Could not get chat reply from Gemini. ${result.error ? result.error.message : '(See logs)'}` };
    }

  } catch (err) {
    Logger.log(`chatWithGemini CRITICAL ERROR: ${err.message} Stack: ${err.stack}`);
    _logErrorToSheet(null, 'chatWithGemini Error', err, `History Length: ${chatHistory.length}`);
    return { error: `Server error during chat: ${err.message}` };
  }
}


// --- MOCK DATA FUNCTION ---
function _getTodayAndYesterdayStrings() { /* ... (unchanged) ... */
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const timezone = Session.getScriptTimeZone();
  return {
    todayStr: Utilities.formatDate(today, timezone, 'yyyy-MM-dd'),
    yestStr: Utilities.formatDate(yesterday, timezone, 'yyyy-MM-dd')
  };
}
function populateSheetWithMockData() { /* ... (unchanged) ... */
  let logSheet;
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ind1Sheet = ss.getSheetByName(SHEET_INDICATOR_1);
    const ind2Sheet = ss.getSheetByName(SHEET_INDICATOR_2);
    const niftySheet = ss.getSheetByName(SHEET_NIFTY);
    logSheet = ss.getSheetByName(SHEET_LOGS);

    if (!ind1Sheet || !ind2Sheet || !niftySheet) { throw new Error("One or more sheets are missing. Please create: " + SHEET_INDICATOR_1 + ", " + SHEET_INDICATOR_2 + ", " + SHEET_NIFTY); }
    if (!logSheet) { logSheet = ss.insertSheet(SHEET_LOGS); logSheet.appendRow(["Timestamp", "Context", "Error Message", "Details"]); Logger.log(`Created ${SHEET_LOGS} sheet.`); }

    const { todayStr, yestStr } = _getTodayAndYesterdayStrings();
    Logger.log(`Populating data for today (${todayStr}) and yesterday (${yestStr})`);

    const clearSheet = (sheet) => { if (sheet.getLastRow() > 1) { sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent(); } };
    clearSheet(ind1Sheet); clearSheet(ind2Sheet); clearSheet(niftySheet);

    ind1Sheet.getRange("A1:G1").setValues([["Date", "Time", "Symbol", "Reason", "Status", "Sync Time", "Sync Reason"]]);
    ind2Sheet.getRange("A1:E1").setValues([["Date", "Time", "Symbol", "Reason", "Capital (Cr)"]]);
    niftySheet.getRange("A1:D1").setValues([["Date", "Time", "Ticker", "Reason"]]);

    const ind1Data = [ [todayStr, '09:20:05', 'RELIANCE', 'Volume Surge', 'Awaiting', '', ''], [todayStr, '09:25:12', 'HDFCBANK', 'Price Breakout', 'Synced', '09:30:15', 'Bullish Engulfing'], [todayStr, '09:40:00', 'TCS', '52 Week High', 'Synced', '09:42:00', 'HVD (350 Cr.)'], [todayStr, '09:45:30', 'INFY', 'RSI Oversold', 'Awaiting', '', ''], [todayStr, '10:05:00', 'SBIN', 'Moving Avg Cross', 'Awaiting', '', ''], [todayStr, '10:10:00', 'AXISBANK', 'MACD Bullish', 'Awaiting', '', ''], [yestStr, '10:15:00', 'WIPRO', 'Support Level', 'Synced', '10:30:00', 'HVD (120 Cr.)'], [yestStr, '11:05:00', 'ITC', 'Volume Spike', 'Awaiting', '', ''], [yestStr, '14:30:00', 'LT', 'Resistance Break', 'Synced', '14:35:00', 'Bearish Harami'] ];
    const ind2Data = [ [todayStr, '09:30:15', 'HDFCBANK', 'Bullish Engulfing', ''], [todayStr, '09:42:00', 'TCS', 'HVD', '350'], [todayStr, '09:50:00', 'SBIN', 'Bearish Harami', ''], [todayStr, '10:15:00', 'AXISBANK', 'Bullish Pin Bar', ''], [yestStr, '10:30:00', 'WIPRO', 'HVD', '120'], [yestStr, '14:35:00', 'LT', 'Bearish Harami', ''] ];
    const niftyData = [ [todayStr, '09:15:10', 'NIFTY', 'Gap Up Opening'], [todayStr, '10:00:00', 'NIFTY', 'Approaching Resistance'] ];

    if (ind1Data.length > 0) { ind1Sheet.getRange(2, 1, ind1Data.length, ind1Data[0].length).setValues(ind1Data); }
    if (ind2Data.length > 0) { ind2Sheet.getRange(2, 1, ind2Data.length, ind2Data[0].length).setValues(ind2Data); }
    if (niftyData.length > 0) { niftySheet.getRange(2, 1, niftyData.length, niftyData[0].length).setValues(niftyData); }

    CacheService.getScriptCache().removeAll([`sheetData_${SHEET_INDICATOR_1}`, `sheetData_${SHEET_INDICATOR_2}`, `sheetData_${SHEET_NIFTY}`]);
    const message = "Mock data populated successfully!"; Logger.log(message); SpreadsheetApp.flush(); return message;
  } catch (err) {
    const errorMessage = "Error populating mock data: " + err.message; Logger.log(errorMessage + ` Stack: ${err.stack}`);
    _logErrorToSheet(logSheet, 'populateSheetWithMockData Error', err, ''); return errorMessage;
  }
}

// --- SIMPLE TEST FUNCTION ---
function testOpenSheet() { /* ... (unchanged) ... */
  const testSheetId = '1L87XM1Ob1_aUiImsEMhl2_p6mV5U_ZHuXiWm0WclCW8'; // Updated Sheet ID
  Logger.log(`TEST: Attempting to open sheet with ID: ${testSheetId}`);
  try {
    const ss = SpreadsheetApp.openById(testSheetId);
    Logger.log(`TEST: Successfully opened sheet. Name: ${ss.getName()}`);
    const sheetTab = ss.getSheetByName('Indicator1');
    if (sheetTab) { Logger.log(`TEST: Successfully accessed sheet tab: ${sheetTab.getName()}`); }
    else { Logger.log(`TEST: Could NOT find sheet tab: Indicator1`); }
  } catch (err) { Logger.log(`TEST ERROR: ${err.message} Stack: ${err.stack}`); throw err; }
}

/**
 * Diagnostic function to check if today's sheets are properly set up
 * Run this to verify daily sheet creation is working
 */
function checkDailySheetSetup() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = new Date();
    const dateSuffix = Utilities.formatDate(today, scriptTimeZone, 'yyyy-MM-dd');
    
    Logger.log(`=== Daily Sheet Setup Check (${dateSuffix}) ===`);
    
    const requiredSheets = [
      `Indicator1_${dateSuffix}`,
      `Indicator2_${dateSuffix}`,
      `DebugLogs_${dateSuffix}`
    ];
    
    const results = {
      date: dateSuffix,
      allSheetsExist: true,
      sheets: {}
    };
    
    requiredSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      const exists = sheet !== null;
      const hasHeaders = exists && sheet.getLastRow() >= 1;
      const rowCount = exists ? sheet.getLastRow() : 0;
      
      results.sheets[sheetName] = {
        exists: exists,
        hasHeaders: hasHeaders,
        rowCount: rowCount
      };
      
      if (!exists) {
        results.allSheetsExist = false;
        Logger.log(`❌ MISSING: ${sheetName}`);
      } else {
        Logger.log(`✅ EXISTS: ${sheetName} (${rowCount} rows)`);
      }
    });
    
    // Check for old sheets that should be purged
    const purgeDate = new Date(today);
    purgeDate.setDate(today.getDate() - 14);
    const purgeDateSuffix = Utilities.formatDate(purgeDate, scriptTimeZone, 'yyyy-MM-dd');
    
    const allSheets = ss.getSheets();
    const oldSheets = allSheets.filter(sheet => {
      const name = sheet.getName();
      return name.includes(`_${purgeDateSuffix}`);
    });
    
    results.oldSheets = {
      purgeDate: purgeDateSuffix,
      count: oldSheets.length,
      names: oldSheets.map(s => s.getName())
    };
    
    Logger.log(`\nOld sheets (${purgeDateSuffix}): ${oldSheets.length} found`);
    if (oldSheets.length > 0) {
      Logger.log(`⚠️ These sheets should be purged: ${oldSheets.map(s => s.getName()).join(', ')}`);
    }
    
    // Check cache status
    const cache = CacheService.getScriptCache();
    const cacheKey = `symbolRowMap_${dateSuffix}`;
    const cachedMap = cache.get(cacheKey);
    results.cache = {
      exists: cachedMap !== null,
      symbolCount: cachedMap ? Object.keys(JSON.parse(cachedMap)).length : 0
    };
    
    Logger.log(`\nCache status: ${cachedMap ? `✅ ${results.cache.symbolCount} symbols cached` : '❌ No cache'}`);
    
    // Summary
    Logger.log(`\n=== Summary ===`);
    if (results.allSheetsExist) {
      Logger.log(`✅ All required sheets exist for ${dateSuffix}`);
    } else {
      Logger.log(`❌ Some sheets are missing! Run dailySetupAndMaintenance() to create them.`);
    }
    
    return results;
    
  } catch (err) {
    Logger.log(`checkDailySheetSetup ERROR: ${err.message} Stack: ${err.stack}`);
    return { error: err.message, stack: err.stack };
  }
}

/**
 * Test function for dailySetupAndMaintenance
 */
function testDailySetup() {
  try {
    Logger.log('=== Testing dailySetupAndMaintenance ===');
    dailySetupAndMaintenance();
    Logger.log('=== Daily setup completed successfully ===');
    
    // Verify sheets were created
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = Utilities.formatDate(new Date(), scriptTimeZone, 'yyyy-MM-dd');
    
    const sheetNames = [
      `Indicator1_${today}`,
      `Indicator2_${today}`,
      `DebugLogs_${today}`
    ];
    
    sheetNames.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        Logger.log(`✓ Sheet exists: ${name}`);
      } else {
        Logger.log(`✗ Sheet missing: ${name}`);
      }
    });
    
  } catch (err) {
    Logger.log(`TEST ERROR: ${err.message} Stack: ${err.stack}`);
    throw err;
  }
}

/**
 * Test function for Dynamic Row Mapping
 */
function testDynamicRowMapping() {
  try {
    Logger.log('=== Testing Dynamic Row Mapping ===');
    
    // Simulate POST requests with new format
    const testData = [
      { scrip: 'RELIANCE', reason: 'Volume Surge' },
      { ticker: 'HDFCBANK', reason: 'Bullish Engulfing', capital_deployed_cr: '150' },
      { scrip: 'RELIANCE', reason: '52 Week High' },
      { ticker: 'RELIANCE', reason: 'HVD', capital_deployed_cr: '250' },
      { scrip: 'HDFCBANK', reason: 'MACD Cross' },
      { ticker: 'NIFTY', reason: 'Gap Up Opening' },
      { ticker: 'Nifty1!', reason: 'Resistance Break' }
    ];
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = Utilities.formatDate(new Date(), scriptTimeZone, 'yyyy-MM-dd');
    const ind1Sheet = ss.getSheetByName(`Indicator1_${today}`);
    const ind2Sheet = ss.getSheetByName(`Indicator2_${today}`);
    
    if (!ind1Sheet || !ind2Sheet) {
      throw new Error(`Sheets not found. Run testDailySetup() first.`);
    }
    
    // Clear cache for testing
    const cache = CacheService.getScriptCache();
    cache.remove(`symbolRowMap_${today}`);
    
    // Clear test data (keep headers)
    if (ind1Sheet.getLastRow() > 1) {
      ind1Sheet.getRange(2, 1, ind1Sheet.getLastRow() - 1, ind1Sheet.getMaxColumns()).clearContent();
    }
    if (ind2Sheet.getLastRow() > 1) {
      ind2Sheet.getRange(2, 1, ind2Sheet.getLastRow() - 1, ind2Sheet.getMaxColumns()).clearContent();
    }
    
    // Process test signals
    testData.forEach((data, index) => {
      Logger.log(`Processing signal ${index + 1}: ${JSON.stringify(data)}`);
      
      // Simulate the doPost logic
      const time = Utilities.formatDate(new Date(), scriptTimeZone, 'HH:mm:ss');
      
      // Determine indicator type by JSON keys
      let indicatorType = null;
      let symbol = null;
      
      if (data.scrip) {
        indicatorType = 'Indicator1';
        symbol = data.scrip;
      } else if (data.ticker) {
        indicatorType = 'Indicator2';
        symbol = data.ticker;
      }
      
      // Handle Indicator2 signals
      if (indicatorType === 'Indicator2') {
        ind2Sheet.appendRow([today, time, symbol, data.reason, data.capital_deployed_cr || '']);
        
        // Skip row mapping for Nifty
        const symbolUpper = (symbol || '').toUpperCase();
        if (symbolUpper === 'NIFTY' || symbolUpper === 'NIFTY1!' || symbolUpper === 'NIFTY 50') {
          Logger.log(`  → Nifty signal processed: ${symbol}`);
          return;
        }
      }
      
      // Dynamic Row Mapping
      const cacheKey = `symbolRowMap_${today}`;
      const cachedMap = cache.get(cacheKey);
      let symbolMap = {};
      
      if (cachedMap !== null) {
        try {
          symbolMap = JSON.parse(cachedMap);
        } catch (parseErr) {
          Logger.log(`Test cache parse error: ${parseErr.message}. Using empty map.`);
          symbolMap = {};
        }
      }
      
      let targetRow = symbolMap[symbol];
      
      if (targetRow === undefined) {
        targetRow = ind1Sheet.getLastRow() + 1;
        ind1Sheet.getRange(targetRow, 1).setValue(symbol);
        symbolMap[symbol] = targetRow;
        cache.put(cacheKey, JSON.stringify(symbolMap), 86400);
        Logger.log(`  → New symbol "${symbol}" assigned to row ${targetRow}`);
      } else {
        Logger.log(`  → Using existing row ${targetRow} for symbol "${symbol}"`);
      }
      
      writeDataToRow(ind1Sheet, targetRow, indicatorType, data.reason, time);
    });
    
    Logger.log('=== Test completed ===');
    Logger.log('Please check the Indicator1 and Indicator2 sheets to verify:');
    Logger.log('- Row mapping worked correctly');
    Logger.log('- Nifty signals appear only in Indicator2 sheet');
    Logger.log('- Non-Nifty signals appear in both sheets');
    
  } catch (err) {
    Logger.log(`TEST ERROR: ${err.message} Stack: ${err.stack}`);
    throw err;
  }
}

/**
 * Analyzes debug logs for patterns and issues
 * Helps identify lock timeout patterns, error frequencies, and system health
 */
function analyzeDebugLogs(dateStr) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const scriptTimeZone = Session.getScriptTimeZone();
    
    // Use today's date if not specified
    if (!dateStr) {
      dateStr = Utilities.formatDate(new Date(), scriptTimeZone, 'yyyy-MM-dd');
    }
    
    const logSheet = ss.getSheetByName(`DebugLogs_${dateStr}`);
    
    if (!logSheet) {
      Logger.log(`No debug logs found for ${dateStr}`);
      return { error: `No debug logs found for ${dateStr}` };
    }
    
    Logger.log(`=== Analyzing Debug Logs for ${dateStr} ===`);
    
    const data = logSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1); // Skip header
    
    if (rows.length === 0) {
      Logger.log('No errors logged for this date');
      return { date: dateStr, totalErrors: 0 };
    }
    
    // Analyze errors
    const analysis = {
      date: dateStr,
      totalErrors: rows.length,
      errorTypes: {},
      errorsByHour: {},
      lockTimeouts: 0,
      symbolsAffected: new Set(),
      contexts: {}
    };
    
    rows.forEach(row => {
      const timestamp = row[0];
      const context = row[1] || 'Unknown';
      const errorMessage = row[2] || '';
      const details = row[3] || '';
      
      // Count by context
      analysis.contexts[context] = (analysis.contexts[context] || 0) + 1;
      
      // Identify lock timeouts
      if (errorMessage.toLowerCase().includes('lock timeout')) {
        analysis.lockTimeouts++;
        
        // Extract symbol from details if present
        try {
          const detailsObj = JSON.parse(details);
          if (detailsObj.scrip) {
            analysis.symbolsAffected.add(detailsObj.scrip);
          } else if (detailsObj.ticker) {
            analysis.symbolsAffected.add(detailsObj.ticker);
          }
        } catch (e) {
          // Details not JSON, skip
        }
      }
      
      // Analyze by hour
      if (timestamp) {
        try {
          const date = new Date(timestamp);
          const hour = date.getHours();
          const hourKey = `${hour}:00`;
          analysis.errorsByHour[hourKey] = (analysis.errorsByHour[hourKey] || 0) + 1;
        } catch (e) {
          // Invalid timestamp, skip
        }
      }
      
      // Categorize error types
      const errorType = errorMessage.split(':')[0] || 'Unknown';
      analysis.errorTypes[errorType] = (analysis.errorTypes[errorType] || 0) + 1;
    });
    
    // Convert Set to Array for JSON serialization
    analysis.symbolsAffected = Array.from(analysis.symbolsAffected);
    
    // Log summary
    Logger.log(`\n=== Summary ===`);
    Logger.log(`Total Errors: ${analysis.totalErrors}`);
    Logger.log(`Lock Timeouts: ${analysis.lockTimeouts} (${((analysis.lockTimeouts/analysis.totalErrors)*100).toFixed(1)}%)`);
    Logger.log(`Unique Symbols Affected: ${analysis.symbolsAffected.length}`);
    
    Logger.log(`\n=== Errors by Context ===`);
    Object.entries(analysis.contexts).forEach(([context, count]) => {
      Logger.log(`  ${context}: ${count}`);
    });
    
    Logger.log(`\n=== Errors by Hour ===`);
    Object.entries(analysis.errorsByHour)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([hour, count]) => {
        Logger.log(`  ${hour}: ${count}`);
      });
    
    Logger.log(`\n=== Error Types ===`);
    Object.entries(analysis.errorTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        Logger.log(`  ${type}: ${count}`);
      });
    
    if (analysis.symbolsAffected.length > 0) {
      Logger.log(`\n=== Top Affected Symbols ===`);
      Logger.log(`  ${analysis.symbolsAffected.slice(0, 10).join(', ')}`);
      if (analysis.symbolsAffected.length > 10) {
        Logger.log(`  ... and ${analysis.symbolsAffected.length - 10} more`);
      }
    }
    
    return analysis;
    
  } catch (err) {
    Logger.log(`analyzeDebugLogs ERROR: ${err.message} Stack: ${err.stack}`);
    return { error: err.message, stack: err.stack };
  }
}

// --- LARGE MOCK DATA FUNCTIONS ---

/**
 * Populates large-scale mock data for stress testing the system.
 * Creates multiple symbols with many signals to test the 21 sync reason capacity
 * and simultaneous signal handling.
 */
function populateLargeMockData() {
  let logSheet;
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = new Date();
    const dateSuffix = Utilities.formatDate(today, scriptTimeZone, 'yyyy-MM-dd');
    
    const ind1SheetName = `Indicator1_${dateSuffix}`;
    const ind2SheetName = `Indicator2_${dateSuffix}`;
    
    logSheet = ss.getSheetByName(`DebugLogs_${dateSuffix}`);
    
    let ind1Sheet = ss.getSheetByName(ind1SheetName);
    let ind2Sheet = ss.getSheetByName(ind2SheetName);
    
    if (!ind1Sheet || !ind2Sheet) {
      throw new Error(`Required sheets not found. Please run dailySetupAndMaintenance() first.`);
    }
    
    Logger.log('Starting to populate large mock data...');
    
    // Generate 50 different symbols
    const symbols = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HDFC', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK',
      'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'HCLTECH', 'WIPRO', 'ULTRACEMCO', 'BAJFINANCE', 'SUNPHARMA', 'TITAN',
      'NESTLEIND', 'TECHM', 'POWERGRID', 'NTPC', 'ONGC', 'M&M', 'TATASTEEL', 'INDUSINDBK', 'ADANIPORTS', 'COALINDIA',
      'GRASIM', 'JSWSTEEL', 'DRREDDY', 'CIPLA', 'BRITANNIA', 'HINDALCO', 'EICHERMOT', 'HEROMOTOCO', 'BAJAJFINSV', 'SHREECEM',
      'DIVISLAB', 'TATAMOTORS', 'UPL', 'SBILIFE', 'APOLLOHOSP', 'BPCL', 'IOC', 'VEDL', 'TATACONSUM', 'DABUR'
    ];
    
    const reasons1 = [
      'Volume Surge', 'Price Breakout', '52 Week High', 'RSI Oversold', 'Moving Avg Cross',
      'MACD Bullish', 'Support Level', 'Resistance Break', 'Golden Cross', 'Bollinger Breakout'
    ];
    
    const reasons2 = [
      'Bullish Engulfing', 'HVD', 'Bearish Harami', 'Bullish Pin Bar', 'Morning Star',
      'Evening Star', 'Hammer', 'Shooting Star', 'Doji', 'Three White Soldiers'
    ];
    
    // Clear existing cache
    const cache = CacheService.getScriptCache();
    cache.remove(`symbolRowMap_${dateSuffix}`);
    
    // Clear existing data (keep headers)
    if (ind1Sheet.getLastRow() > 1) {
      ind1Sheet.getRange(2, 1, ind1Sheet.getLastRow() - 1, ind1Sheet.getMaxColumns()).clearContent();
    }
    if (ind2Sheet.getLastRow() > 1) {
      ind2Sheet.getRange(2, 1, ind2Sheet.getLastRow() - 1, ind2Sheet.getMaxColumns()).clearContent();
    }
    
    // Generate data for each symbol
    let totalSignals = 0;
    symbols.forEach((symbol, symbolIndex) => {
      const row = symbolIndex + 2; // Row 2 onwards (row 1 is header)
      
      // Write symbol in column A
      ind1Sheet.getRange(row, 1).setValue(symbol);
      
      // Generate random number of Indicator1 signals (1-5)
      const numInd1Signals = Math.floor(Math.random() * 5) + 1;
      const ind1Data = [];
      for (let i = 0; i < numInd1Signals; i++) {
        const hour = 9 + Math.floor(Math.random() * 6);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
        const reason = reasons1[Math.floor(Math.random() * reasons1.length)];
        ind1Data.push(reason, timeStr);
      }
      if (ind1Data.length > 0) {
        ind1Sheet.getRange(row, 2, 1, ind1Data.length).setValues([ind1Data]);
      }
      totalSignals += numInd1Signals;
      
      // Generate random number of Indicator2 signals (1-21 to test the capacity)
      const numInd2Signals = Math.floor(Math.random() * 21) + 1;
      const ind2Data = [];
      for (let i = 0; i < numInd2Signals; i++) {
        const hour = 9 + Math.floor(Math.random() * 6);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
        const reason = reasons2[Math.floor(Math.random() * reasons2.length)];
        ind2Data.push(reason, timeStr);
        
        // Also add to Indicator2 sheet
        const capital = reason === 'HVD' ? String(Math.floor(Math.random() * 500) + 50) : '';
        ind2Sheet.appendRow([dateSuffix, timeStr, symbol, reason, capital]);
      }
      if (ind2Data.length > 0) {
        ind1Sheet.getRange(row, 12, 1, ind2Data.length).setValues([ind2Data]);
      }
      totalSignals += numInd2Signals;
    });
    
    // Add some Nifty signals to Indicator2 sheet
    for (let i = 0; i < 10; i++) {
      const hour = 9 + Math.floor(Math.random() * 6);
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const niftyReasons = ['Gap Up Opening', 'Approaching Resistance', 'Support Test', 'Trend Reversal'];
      const reason = niftyReasons[Math.floor(Math.random() * niftyReasons.length)];
      const ticker = i % 2 === 0 ? 'NIFTY' : 'Nifty1!';
      ind2Sheet.appendRow([dateSuffix, timeStr, ticker, reason, '']);
    }
    
    // Clear cache to force fresh data load
    cache.removeAll([`sheetData_${ind1SheetName}`, `sheetData_${ind2SheetName}`]);
    
    const message = `Large mock data populated successfully!\n` +
                    `- Symbols: ${symbols.length}\n` +
                    `- Total signals: ${totalSignals}\n` +
                    `- Average signals per symbol: ${(totalSignals / symbols.length).toFixed(1)}\n` +
                    `- Nifty signals: 10 (in Indicator2 sheet)`;
    Logger.log(message);
    SpreadsheetApp.flush();
    return message;
    
  } catch (err) {
    const errorMessage = `Error populating large mock data: ${err.message}`;
    Logger.log(`${errorMessage} Stack: ${err.stack}`);
    _logErrorToSheet(logSheet, 'populateLargeMockData Error', err, '');
    return errorMessage;
  }
}

/**
 * Erases all mock data from today's sheets while preserving headers.
 * Clears Indicator1 and Indicator2 sheets for the current date.
 */
function eraseMockData() {
  let logSheet;
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = new Date();
    const dateSuffix = Utilities.formatDate(today, scriptTimeZone, 'yyyy-MM-dd');
    
    const ind1SheetName = `Indicator1_${dateSuffix}`;
    const ind2SheetName = `Indicator2_${dateSuffix}`;
    
    logSheet = ss.getSheetByName(`DebugLogs_${dateSuffix}`);
    
    let ind1Sheet = ss.getSheetByName(ind1SheetName);
    let ind2Sheet = ss.getSheetByName(ind2SheetName);
    
    if (!ind1Sheet || !ind2Sheet) {
      throw new Error(`Required sheets not found. Nothing to erase.`);
    }
    
    Logger.log('Starting to erase mock data...');
    
    // Clear data rows (keep headers in row 1)
    let clearedRows = 0;
    if (ind1Sheet.getLastRow() > 1) {
      const rowCount = ind1Sheet.getLastRow() - 1;
      ind1Sheet.getRange(2, 1, rowCount, ind1Sheet.getMaxColumns()).clearContent();
      clearedRows += rowCount;
      Logger.log(`Cleared ${rowCount} rows from ${ind1SheetName}`);
    }
    
    if (ind2Sheet.getLastRow() > 1) {
      const rowCount = ind2Sheet.getLastRow() - 1;
      ind2Sheet.getRange(2, 1, rowCount, ind2Sheet.getMaxColumns()).clearContent();
      clearedRows += rowCount;
      Logger.log(`Cleared ${rowCount} rows from ${ind2SheetName}`);
    }
    
    // Clear cache
    const cache = CacheService.getScriptCache();
    cache.removeAll([
      `symbolRowMap_${dateSuffix}`,
      `sheetData_${ind1SheetName}`,
      `sheetData_${ind2SheetName}`
    ]);
    Logger.log('Cleared all relevant caches');
    
    const message = `Mock data erased successfully!\n` +
                    `- Total rows cleared: ${clearedRows}\n` +
                    `- Sheets cleaned: Indicator1, Indicator2\n` +
                    `- Cache cleared: Yes`;
    Logger.log(message);
    SpreadsheetApp.flush();
    return message;
    
  } catch (err) {
    const errorMessage = `Error erasing mock data: ${err.message}`;
    Logger.log(`${errorMessage} Stack: ${err.stack}`);
    _logErrorToSheet(logSheet, 'eraseMockData Error', err, '');
    return errorMessage;
  }
}

/**
 * Rearranges and fixes data on the current date Indicator1 sheet
 * Rebuilds the symbol row map and fixes any wrongly written data
 */
function refreshRearrangeCurrentData() {
  let logSheet;
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const scriptTimeZone = Session.getScriptTimeZone();
    const today = new Date();
    const dateSuffix = Utilities.formatDate(today, scriptTimeZone, 'yyyy-MM-dd');
    
    const ind1SheetName = `Indicator1_${dateSuffix}`;
    logSheet = ss.getSheetByName(`DebugLogs_${dateSuffix}`);
    
    let ind1Sheet = ss.getSheetByName(ind1SheetName);
    if (!ind1Sheet) {
      throw new Error(`Sheet not found: ${ind1SheetName}`);
    }
    
    Logger.log('Starting to refresh and rearrange current data...');
    
    // Get all data from the sheet
    const lastRow = ind1Sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('No data to rearrange (only headers)');
      return { status: 'success', message: 'No data to rearrange' };
    }
    
    const allData = ind1Sheet.getRange(2, 1, lastRow - 1, ind1Sheet.getMaxColumns()).getValues();
    
    // Build a map of unique symbols with all their data
    const symbolDataMap = {};
    allData.forEach((row, index) => {
      const symbol = row[0];
      if (!symbol || symbol === '') return;
      
      if (!symbolDataMap[symbol]) {
        symbolDataMap[symbol] = {
          symbol: symbol,
          ind1Signals: [],
          ind2SyncEvents: []
        };
      }
      
      // Collect Indicator1 signals (columns B-K, pairs of reason/time)
      for (let i = 1; i < 11; i += 2) {
        if (row[i] && row[i] !== '') {
          symbolDataMap[symbol].ind1Signals.push({
            reason: row[i],
            time: row[i + 1] || ''
          });
        }
      }
      
      // Collect Indicator2 sync events (columns L-BA, pairs of reason/time)
      for (let i = 11; i < 53; i += 2) {
        if (row[i] && row[i] !== '') {
          symbolDataMap[symbol].ind2SyncEvents.push({
            reason: row[i],
            time: row[i + 1] || ''
          });
        }
      }
    });
    
    // Clear all data except headers
    if (lastRow > 1) {
      ind1Sheet.getRange(2, 1, lastRow - 1, ind1Sheet.getMaxColumns()).clearContent();
    }
    
    // Rebuild the sheet with cleaned data
    const symbols = Object.keys(symbolDataMap).sort();
    const newSymbolMap = {};
    
    symbols.forEach((symbol, index) => {
      const targetRow = index + 2; // Row 2 onwards
      const data = symbolDataMap[symbol];
      
      // Write symbol in column A
      ind1Sheet.getRange(targetRow, 1).setValue(symbol);
      
      // Write Indicator1 signals (up to 5 pairs)
      const ind1Data = [];
      data.ind1Signals.slice(0, 5).forEach(signal => {
        ind1Data.push(signal.reason, signal.time);
      });
      if (ind1Data.length > 0) {
        ind1Sheet.getRange(targetRow, 2, 1, ind1Data.length).setValues([ind1Data]);
      }
      
      // Write Indicator2 sync events (up to 21 pairs)
      const ind2Data = [];
      data.ind2SyncEvents.slice(0, 21).forEach(event => {
        ind2Data.push(event.reason, event.time);
      });
      if (ind2Data.length > 0) {
        ind1Sheet.getRange(targetRow, 12, 1, ind2Data.length).setValues([ind2Data]);
      }
      
      // Update symbol map
      newSymbolMap[symbol] = targetRow;
    });
    
    // Update cache with new symbol map
    const cache = CacheService.getScriptCache();
    const cacheKey = `symbolRowMap_${dateSuffix}`;
    cache.put(cacheKey, JSON.stringify(newSymbolMap), 86400);
    
    // Clear data cache to force refresh
    cache.remove(`sheetData_${ind1SheetName}`);
    
    const message = `Data refreshed and rearranged successfully!\n` +
                    `- Unique symbols: ${symbols.length}\n` +
                    `- Total Indicator1 signals: ${Object.values(symbolDataMap).reduce((sum, d) => sum + d.ind1Signals.length, 0)}\n` +
                    `- Total Indicator2 sync events: ${Object.values(symbolDataMap).reduce((sum, d) => sum + d.ind2SyncEvents.length, 0)}`;
    Logger.log(message);
    SpreadsheetApp.flush();
    return { status: 'success', message: message };
    
  } catch (err) {
    const errorMessage = `Error refreshing/rearranging data: ${err.message}`;
    Logger.log(`${errorMessage} Stack: ${err.stack}`);
    _logErrorToSheet(logSheet, 'refreshRearrangeCurrentData Error', err, '');
    return { status: 'error', message: errorMessage };
  }
}
