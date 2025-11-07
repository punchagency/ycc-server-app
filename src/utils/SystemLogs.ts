// Save System Logs to the database
import SystemLogsModel from "../models/systemLogs.model";
import "dotenv/config";
import ErrorStackParser from 'error-stack-parser';
import { Schema } from "mongoose";
import * as StackTrace from 'stacktrace-js';

interface SystemLogInput {
    logLevel: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    source: string;
    stackTrace?: string;
    errorType?: string;
    errorDetails?: any;
    userId?: Schema.Types.ObjectId | string;
    ipAddress?: string;
    requestData?: any;
}

interface ParsedError {
    type: string;
    message: string;
    stack: string;
    sourceMap?: any;
    frames?: any[];
    cause?: ParsedError;
}

class SystemLogger {
    private static instance: SystemLogger;
    private logQueue: SystemLogInput[] = [];
    private readonly BATCH_SIZE = 30;
    private flushInterval: NodeJS.Timeout;
    private consoleOutput: boolean = process.env.NODE_ENV === 'development'; // Also output to console by default

    private constructor() {
        // Set up a timer to flush logs periodically even if batch size isn't reached
        this.flushInterval = setInterval(() => {
            if (this.logQueue.length > 0) {
                this.flush();
            }
        }, 60000); // Flush every minute if there are any logs
    }

    public static getInstance(): SystemLogger {
        if (!SystemLogger.instance) {
            SystemLogger.instance = new SystemLogger();
        }
        return SystemLogger.instance;
    }

    /**
     * Set whether logs should also be output to console
     */
    public setConsoleOutput(value: boolean): void {
        this.consoleOutput = value;
    }

    /**
     * Parse an Error object to extract detailed information
     */
    private async parseError(error: Error): Promise<ParsedError> {
        const parsedError: ParsedError = {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack || '',
        };

        try {
            // Extract frames from error stack
            const stackFrames = ErrorStackParser.parse(error);
            
            // Try to get source mapped stack trace for better debugging
            try {
                const enhancedFrames = await StackTrace.fromError(error);
                parsedError.sourceMap = enhancedFrames.map(frame => ({
                    fileName: frame.fileName,
                    lineNumber: frame.lineNumber,
                    columnNumber: frame.columnNumber,
                    functionName: frame.functionName,
                    source: frame.source
                }));
            } catch (e) {
                // If source mapping fails, use the basic frames
                parsedError.frames = stackFrames.map(frame => ({
                    fileName: frame.fileName,
                    lineNumber: frame.lineNumber,
                    columnNumber: frame.columnNumber,
                    functionName: frame.functionName
                }));
            }

            // Handle error cause (Node.js v16.9.0+)
            if ('cause' in error && error.cause instanceof Error) {
                parsedError.cause = await this.parseError(error.cause);
            }
        } catch (parseError) {
            // If error parsing fails, just use the basic error info
            console.error('Failed to parse error stack:', parseError);
        }

        return parsedError;
    }

    public async log(logData: SystemLogInput): Promise<void> {
        // Also log to console if enabled
        if (this.consoleOutput) {
            switch (logData.logLevel) {
                case 'info':
                    console.log(`[INFO] ${logData.source}: ${logData.message}`);
                    break;
                case 'warning':
                    console.warn(`[WARNING] ${logData.source}: ${logData.message}`);
                    break;
                case 'error':
                case 'critical':
                    console.error(`[${logData.logLevel.toUpperCase()}] ${logData.source}: ${logData.message}`);
                    if (logData.stackTrace) {
                        console.error(logData.stackTrace);
                    }
                    if (logData.errorDetails) {
                        console.error('Error details:', logData.errorDetails);
                    }
                    break;
            }
        }

        // Add to queue
        this.logQueue.push(logData);
        
        // Flush if queue is full
        if (this.logQueue.length >= this.BATCH_SIZE) {
            await this.flush();
        }

        // Immediately flush critical errors
        if (logData.logLevel === 'critical') {
            await this.flush();
        }
    }

    private async flush(): Promise<void> {
        if (this.logQueue.length === 0) return;
        
        const logsToInsert = [...this.logQueue];
        this.logQueue = []; // Clear the queue
        
        const data = logsToInsert.map((log) => ({
            logLevel: log.logLevel,
            message: log.message,
            source: log.source,
            stackTrace: log.stackTrace || null,
            errorType: log.errorType || null,
            errorDetails: log.errorDetails ? JSON.stringify(log.errorDetails) : null,
            userId: log.userId || null,
            ipAddress: log.ipAddress || null,
            requestData: log.requestData ? JSON.stringify(log.requestData) : null
        }));

        try {
            try {
                await SystemLogsModel.insertMany(data);
            } catch (error) {
                console.error('Failed to insert system logs:', error);
            }
        } catch (error) {
            console.error('Failed to process system logs:', error);
        }
    }

    public async forceFlush(): Promise<void> {
        await this.flush();
    }

    public clearInterval(): void {
        clearInterval(this.flushInterval);
    }
}

// Export a singleton instance
const systemLogger = SystemLogger.getInstance();

/**
 * Log informational message
 * @param message The log message
 * @param source Source of the log (file, module, function)
 * @param additionalData Optional additional data
 */
export const logInfo = async ({message, source, additionalData}:{
    message: string,
    source: string,
    additionalData?: { userId?: Schema.Types.ObjectId | string; ipAddress?: string; requestData?: any, [key: string]: any }
}): Promise<void> => {
    await systemLogger.log({
        logLevel: 'info',
        message,
        source,
        ...additionalData
    });
};

/**
 * Log warning message
 * @param message The warning message
 * @param source Source of the warning (file, module, function)
 * @param additionalData Optional additional data
 */
export const logWarning = async ({message, source, additionalData}:{
    message: string,
    source: string,
    error?: Error | unknown,
    additionalData?: { userId?: Schema.Types.ObjectId; ipAddress?: string; requestData?: any, [key: string]: any }
}): Promise<void> => {
    await systemLogger.log({
        logLevel: 'warning',
        message,
        source,
        ...additionalData
    });
};

/**
 * Log error message with enhanced error analysis
 * @param message The error message
 * @param source Source of the error (file, module, function)
 * @param error Error object to analyze
 * @param additionalData Optional additional data
 */
export const logError = async ({message, source, error, additionalData}:{
    message: string,
    source: string,
    error?: Error | unknown,
    additionalData?: { userId?: Schema.Types.ObjectId | string; ipAddress?: string; requestData?: any, [key: string]: any }
}): Promise<void> => {
    let errorDetails: any = undefined;
    let errorType: string | undefined = undefined;
    let stackTrace: string | undefined = undefined;
    
    if (error) {
        if (error instanceof Error) {
            // Parse the error for detailed information
            const parsedError = await systemLogger['parseError'](error);
            errorType = parsedError.type;
            stackTrace = error.stack;
            errorDetails = parsedError;
        } else {
            // Handle non-Error objects
            try {
                errorType = typeof error;
                errorDetails = { rawError: error };
                if (typeof error === 'object' && error !== null) {
                    errorDetails = { ...errorDetails, ...error };
                }
            } catch (e) {
                errorDetails = { stringified: String(error) };
            }
        }
    }

    await systemLogger.log({
        logLevel: 'error',
        message,
        source,
        stackTrace,
        errorType,
        errorDetails,
        ...additionalData
    });
};

/**
 * Log critical error message with enhanced error analysis (will be immediately flushed to database)
 * @param message The critical error message
 * @param source Source of the error (file, module, function)
 * @param error Error object to analyze
 * @param additionalData Optional additional data
 */
export const logCritical = async ({message, source, error, additionalData}:{
    message: string,
    source: string,
    error?: Error | unknown,
    additionalData?: { userId?: Schema.Types.ObjectId; ipAddress?: string; requestData?: any, [key: string]: any }
}): Promise<void> => {
    let errorDetails: any = undefined;
    let errorType: string | undefined = undefined;
    let stackTrace: string | undefined = undefined;
    
    if (error) {
        if (error instanceof Error) {
            // Parse the error for detailed information
            const parsedError = await systemLogger['parseError'](error);
            errorType = parsedError.type;
            stackTrace = error.stack;
            errorDetails = parsedError;
        } else {
            // Handle non-Error objects
            try {
                errorType = typeof error;
                errorDetails = { rawError: error };
                if (typeof error === 'object' && error !== null) {
                    errorDetails = { ...errorDetails, ...error };
                }
            } catch (e) {
                errorDetails = { stringified: String(error) };
            }
        }
    }

    await systemLogger.log({
        logLevel: 'critical',
        message,
        source,
        stackTrace,
        errorType,
        errorDetails,
        ...additionalData
    });
};

/**
 * Disable console output (logs will only go to database)
 */
export const disableConsoleOutput = (): void => {
    systemLogger.setConsoleOutput(false);
};

/**
 * Enable console output alongside database logging
 */
export const enableConsoleOutput = (): void => {
    systemLogger.setConsoleOutput(true);
};

/**
 * Make sure to call this when the application is shutting down
 */
export const flushRemainingLogs = async (): Promise<void> => {
    await systemLogger.forceFlush();
    systemLogger.clearInterval();
};