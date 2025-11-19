import Bull from 'bull';
import { RedisObject } from './Redis';
import SendMail from '../utils/SendMail';
import createNotification from '../utils/createNotification';
import { logError } from '../utils/SystemLogs';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPES } from '../models/notification.model';
import { Schema } from 'mongoose';
import 'dotenv/config';

let emailQueue: Bull.Queue | null = null;
let notificationQueue: Bull.Queue | null = null;
let isRedisAvailable = false;

try {
    if (RedisObject.isAvailable()) {
        const redisConfig = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: Number(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD
            }
        };

        emailQueue = new Bull('email-queue', redisConfig);
        notificationQueue = new Bull('notification-queue', redisConfig);
        isRedisAvailable = true;

        emailQueue.process(async (job) => {
            try {
                await SendMail(job.data);
            } catch (error) {
                logError({ message: 'Error processing email job', source: 'QueueManager.emailQueue', error, additionalData: job.data });
                throw error;
            }
        });

        notificationQueue.process(async (job) => {
            try {
                await createNotification(job.data);
            } catch (error) {
                logError({ message: 'Error processing notification job', source: 'QueueManager.notificationQueue', error, additionalData: job.data });
                throw error;
            }
        });

        emailQueue.on('failed', (job, err) => {
            logError({ message: `Email job ${job.id} failed`, source: 'QueueManager.emailQueue', error: err });
        });

        notificationQueue.on('failed', (job, err) => {
            logError({ message: `Notification job ${job.id} failed`, source: 'QueueManager.notificationQueue', error: err });
        });

        console.log('✅ Bull queues initialized with Redis');
    } else {
        console.warn('⚠️  Redis unavailable - using direct execution for emails/notifications');
    }
} catch (error) {
    console.error('❌ Failed to initialize Bull queues:', error);
    isRedisAvailable = false;
}

export const addEmailJob = async (data: { email: string | string[], subject: string, html: string }, options?: Bull.JobOptions) => {
    if (isRedisAvailable && emailQueue) {
        await emailQueue.add(data, options);
    } else {
        setImmediate(async () => {
            try {
                await SendMail(data);
            } catch (error) {
                logError({ message: 'Error sending email (direct execution)', source: 'QueueManager.addEmailJob', error, additionalData: data });
            }
        });
    }
};

export const addNotificationJob = async (data: {
    recipientId: Schema.Types.ObjectId | string,
    type: typeof NOTIFICATION_TYPES[number],
    priority?: typeof NOTIFICATION_PRIORITY[number],
    title: string,
    message: string,
    data?: Record<string, any>,
    complaintId?: Schema.Types.ObjectId | string
}, options?: Bull.JobOptions) => {
    if (isRedisAvailable && notificationQueue) {
        await notificationQueue.add(data, options);
    } else {
        setImmediate(async () => {
            try {
                await createNotification(data);
            } catch (error) {
                logError({ message: 'Error creating notification (direct execution)', source: 'QueueManager.addNotificationJob', error, additionalData: data });
            }
        });
    }
};

export { emailQueue, notificationQueue };
