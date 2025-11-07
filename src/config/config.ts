import "dotenv/config";

const CONFIG = {
	settings: {
		SAVE_LOG_INTERVAL: 5, // minutes
		MAX_LOG_STACK: 10,
		PAGINATION_LIMIT: 30,
		REMEMBER_ME_DAYS: 360,//No of days to remain logged in on a device after last visit
		RECONFIRM_DEVICE_MINUTES: 5,
		FALLBACK_ACCESS_SECRET: '50e2e1bd3f1a52a-db9f-40ed-8c6d-f343a91f09fd2ab09',
		FALLBACK_REFRESH_SECRET: '773ef705fa027-37ef-4f3f-b82b-782a26d6634b204fcc0e6d',
		ENABLE_EMAIL: true,
		MIN_WITHDRAWAL_LIMIT: 1000,
		VERIFICATION_CODE_EXPIRATION_DURATION: 10,
	},
	redis: {
		enabled: process.env.REDIS_ENABLED !== 'false', // Default to true, set REDIS_ENABLED=false to disable
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379'),
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || '0'),
		maxRetriesPerRequest: 3,
		lazyConnect: true,
		keyPrefix: process.env.REDIS_KEY_PREFIX || 'allrounda:',
		// Default TTL in seconds (1 hour)
		defaultTTL: 3600,
		// Cache TTL configurations for different types of data
		cacheTTL: {
			user: 1800,        // 30 minutes
			session: 3600,     // 1 hour
			query: 300,        // 5 minutes
			static: 86400,     // 24 hours
			temp: 60,          // 1 minute
			shortQuery: 60,    // 1 minute
			analytics: 3600,   // 1 hour
		}
	},
	links: {
		frontend: process.env.FRONTEND_URL,
	}
};

export default CONFIG;
