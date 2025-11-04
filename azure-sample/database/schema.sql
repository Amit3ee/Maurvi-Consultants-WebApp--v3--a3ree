-- Azure SQL Database Schema
-- Creates all tables needed for the Maurvi Consultants Trading Signals application

-- Signals table: Stores all trading signals from both indicators
CREATE TABLE Signals (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    date DATE NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    indicator_type VARCHAR(20) NOT NULL,  -- 'Indicator1' or 'Indicator2'
    reason VARCHAR(500) NOT NULL,
    time TIME NOT NULL,
    capital_deployed_cr DECIMAL(10,2) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    -- Indexes for performance
    INDEX idx_date_symbol (date, symbol),
    INDEX idx_date_indicator (date, indicator_type),
    INDEX idx_created_at (created_at DESC)
);

-- Sessions table: Manages user authentication sessions
CREATE TABLE Sessions (
    session_token VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at)
);

-- OTPs table: Stores one-time passwords for login
CREATE TABLE OTPs (
    email VARCHAR(255) PRIMARY KEY,
    otp VARCHAR(6) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    INDEX idx_expires_at (expires_at)
);

-- DebugLogs table: Stores error logs for debugging
CREATE TABLE DebugLogs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    timestamp DATETIME2 DEFAULT GETDATE(),
    context VARCHAR(500) NULL,
    error_message TEXT NULL,
    details TEXT NULL,
    stack_trace TEXT NULL,
    
    INDEX idx_timestamp (timestamp DESC)
);

-- UserApprovals table: Manages user registration and approval
CREATE TABLE UserApprovals (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NULL,
    provider VARCHAR(50) NULL,  -- 'google', 'microsoft', 'apple', 'guest'
    approved BIT DEFAULT 0,
    approved_at DATETIME2 NULL,
    registered_at DATETIME2 DEFAULT GETDATE(),
    
    INDEX idx_approved (approved),
    INDEX idx_provider (provider)
);

-- Add comments to tables (SQL Server Extended Properties)
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Stores all trading signals from TradingView indicators',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'Signals';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Manages user authentication sessions with 24-hour expiry',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'Sessions';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Stores OTP codes for email-based authentication (3-minute validity)',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'OTPs';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Logs all errors and exceptions for debugging purposes',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'DebugLogs';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Manages user registration and admin approval workflow',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'UserApprovals';
