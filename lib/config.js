require('dotenv').config();

/**
 * Safely get an environment variable and throw an error if it's not defined
 * @param {string} key - The environment variable key
 * @returns {string} The environment variable value
 */
function requireEnv(key) {
    const value = process.env[key];
    if (value == null) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
}

/**
 * Configuration object with all environment variables
 */
const config = {
    supabase: {
        url: requireEnv('SUPABASE_URL'),
        serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },
    worker: {
        pollIntervalSeconds: parseInt(requireEnv('WORKER_POLL_INTERVAL_SECONDS'), 10),
        maxRetryAttempts: parseInt(requireEnv('MAX_RETRY_ATTEMPTS'), 10),
    },
    api: {
        privateKey: requireEnv('PRIVATE_API_KEY'),
    },
};

// Validate numeric values
if (isNaN(config.worker.pollIntervalSeconds) || config.worker.pollIntervalSeconds <= 0) {
    throw new Error('WORKER_POLL_INTERVAL_SECONDS must be a positive number');
}

if (isNaN(config.worker.maxRetryAttempts) || config.worker.maxRetryAttempts <= 0) {
    throw new Error('MAX_RETRY_ATTEMPTS must be a positive number');
}

module.exports = config; 