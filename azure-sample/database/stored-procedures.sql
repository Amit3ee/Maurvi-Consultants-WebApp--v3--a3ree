-- Stored Procedures for Azure SQL Database
-- Used for data maintenance and cleanup

-- Procedure 1: Cleanup old data (run daily)
CREATE OR ALTER PROCEDURE CleanupOldData
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Delete signals older than 14 days
        DELETE FROM Signals 
        WHERE date < DATEADD(day, -14, CAST(GETDATE() AS DATE));
        
        DECLARE @deletedSignals INT = @@ROWCOUNT;
        
        -- Delete expired sessions
        DELETE FROM Sessions 
        WHERE expires_at < GETDATE();
        
        DECLARE @deletedSessions INT = @@ROWCOUNT;
        
        -- Delete expired OTPs
        DELETE FROM OTPs 
        WHERE expires_at < GETDATE();
        
        DECLARE @deletedOTPs INT = @@ROWCOUNT;
        
        -- Delete logs older than 30 days
        DELETE FROM DebugLogs 
        WHERE timestamp < DATEADD(day, -30, GETDATE());
        
        DECLARE @deletedLogs INT = @@ROWCOUNT;
        
        COMMIT TRANSACTION;
        
        -- Log cleanup results
        PRINT 'Cleanup completed successfully:';
        PRINT '  - Deleted ' + CAST(@deletedSignals AS VARCHAR) + ' old signals';
        PRINT '  - Deleted ' + CAST(@deletedSessions AS VARCHAR) + ' expired sessions';
        PRINT '  - Deleted ' + CAST(@deletedOTPs AS VARCHAR) + ' expired OTPs';
        PRINT '  - Deleted ' + CAST(@deletedLogs AS VARCHAR) + ' old debug logs';
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        -- Log error
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

-- Procedure 2: Get dashboard statistics
CREATE OR ALTER PROCEDURE GetDashboardStats
    @targetDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Default to today if no date provided
    IF @targetDate IS NULL
        SET @targetDate = CAST(GETDATE() AS DATE);
    
    -- Return statistics
    SELECT 
        COUNT(*) as total_signals,
        COUNT(DISTINCT symbol) as unique_symbols,
        COUNT(CASE WHEN indicator_type = 'Indicator1' THEN 1 END) as indicator1_count,
        COUNT(CASE WHEN indicator_type = 'Indicator2' THEN 1 END) as indicator2_count,
        MIN(created_at) as first_signal_time,
        MAX(created_at) as last_signal_time
    FROM Signals
    WHERE date = @targetDate;
END;
GO

-- Procedure 3: Get synced symbols (symbols with both indicators)
CREATE OR ALTER PROCEDURE GetSyncedSymbols
    @targetDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Default to today if no date provided
    IF @targetDate IS NULL
        SET @targetDate = CAST(GETDATE() AS DATE);
    
    -- Return symbols with both indicator types
    SELECT DISTINCT
        s1.symbol,
        COUNT(CASE WHEN s1.indicator_type = 'Indicator1' THEN 1 END) as ind1_count,
        COUNT(CASE WHEN s1.indicator_type = 'Indicator2' THEN 1 END) as ind2_count,
        MAX(CASE WHEN s1.indicator_type = 'Indicator1' THEN s1.created_at END) as last_ind1_time,
        MAX(CASE WHEN s1.indicator_type = 'Indicator2' THEN s1.created_at END) as last_ind2_time
    FROM Signals s1
    WHERE s1.date = @targetDate
    GROUP BY s1.symbol
    HAVING 
        COUNT(CASE WHEN s1.indicator_type = 'Indicator1' THEN 1 END) > 0
        AND COUNT(CASE WHEN s1.indicator_type = 'Indicator2' THEN 1 END) > 0
    ORDER BY last_ind2_time DESC;
END;
GO

-- Procedure 4: Cleanup expired authentication data (run more frequently)
CREATE OR ALTER PROCEDURE CleanupAuthData
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Delete expired sessions
        DELETE FROM Sessions 
        WHERE expires_at < GETDATE();
        
        -- Delete expired OTPs
        DELETE FROM OTPs 
        WHERE expires_at < GETDATE();
        
        PRINT 'Authentication cleanup completed';
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- Test the procedures (optional - comment out in production)
/*
-- Test cleanup
EXEC CleanupOldData;

-- Test stats
EXEC GetDashboardStats;

-- Test synced symbols
EXEC GetSyncedSymbols;

-- Test auth cleanup
EXEC CleanupAuthData;
*/
