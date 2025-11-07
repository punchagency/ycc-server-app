import { IAuditLog } from '../models/auditTrail.model.js';
import AuditTrailModel from '../models/auditTrail.model.js';
import { logError } from './SystemLogs.js';

class AuditLogger {
    private static instance: AuditLogger;
    private logQueue: IAuditLog[] = [];
    private readonly BATCH_SIZE = 30;
    private flushInterval: NodeJS.Timeout;

    private constructor() {
        // Set up a timer to flush logs periodically even if batch size isn't reached
        this.flushInterval = setInterval(() => {
            if (this.logQueue.length > 0) {
                this.flush();
            }
        }, 60000); // Flush every minute if there are any logs
    }

    public static getInstance(): AuditLogger {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }

    public async log(logData: IAuditLog): Promise<void> {
        this.logQueue.push(logData);

        if (this.logQueue.length >= this.BATCH_SIZE) {
            await this.flush();
        }
    }

    private async flush(): Promise<void> {
        if (this.logQueue.length === 0) return;

        const logsToInsert = [...this.logQueue];
        this.logQueue = []; // Clear the queue
        const data = logsToInsert.map((log) => ({
            userId: log.userId || null,
            email: log.email || null,
            name: log.name || null,
            action: log.action,
            actionType: log.actionType,
            entityType: log.entityType,
            entityId: log.entityId || null,
            oldValues: log.oldValues ? JSON.stringify(log.oldValues) : null,
            newValues: log.newValues ? JSON.stringify(log.newValues) : null,
            ipAddress: log.ipAddress || null,
            userAgent: log.userAgent || null,
            sessionId: log.sessionId || null,
            additionalContext: log.additionalContext ? JSON.stringify(log.additionalContext) : null
        }));
        try {
            try {
                await AuditTrailModel.insertMany(data);
            } catch (error) {
                await logError({
                    message: 'Failed to insert audit logs',
                    source: 'AuditLogger.flush',
                    error
                });
            }
        } catch (error) {
            await logError({
                message: 'Failed to start transaction for audit logs',
                source: 'AuditLogger.flush',
                error
            });
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
const auditLogger = AuditLogger.getInstance();

/**
 * Save an audit log for user actions
 * @param logData The audit log data to save
 */
export const saveAuditLog = async (logData: IAuditLog): Promise<void> => {
    await auditLogger.log(logData);
};

/**
 * Save a critical audit log that should be written to the database immediately
 * @param logData The audit log data to save
 */
export const saveCriticalAuditLog = async (logData: IAuditLog): Promise<void> => {
    await auditLogger.log(logData);
    await auditLogger.forceFlush(); // Force immediate write to database for critical logs
};

/**
 * Make sure to call this when the application is shutting down
 */
export const flushRemainingLogs = async (): Promise<void> => {
    await auditLogger.forceFlush();
    auditLogger.clearInterval();
};