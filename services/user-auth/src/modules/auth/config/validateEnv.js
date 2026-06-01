/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'JWT_REFRESH_SECRET',
    'JWT_REFRESH_EXPIRES_IN',
    'CORS_ORIGIN',
];

const optionalVars = [
    'LOG_LEVEL',
    'SENTRY_DSN',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
];

/**
 * Validate that a variable is set and not empty
 */
const validateRequired = (varName) => {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
        throw new Error(`Required environment variable ${varName} is not set or empty`);
    }

    return value;
};

/**
 * Validate secret strength for production
 */
const validateSecret = (varName, minLength = 32) => {
    const value = validateRequired(varName);

    // Only enforce in production
    if (process.env.NODE_ENV === 'production') {
        if (value.length < minLength) {
            throw new Error(
                `${varName} is too short for production (${value.length} chars, minimum ${minLength})`
            );
        }

        // Check for placeholder values
        const placeholders = ['REPLACE', 'change', 'example', 'test', 'dev'];
        const lowerValue = value.toLowerCase();

        for (const placeholder of placeholders) {
            if (lowerValue.includes(placeholder.toLowerCase())) {
                throw new Error(
                    `${varName} appears to contain a placeholder value: "${placeholder}"`
                );
            }
        }
    }

    return value;
};

/**
 * Validate environment value
 */
const validateEnvironment = () => {
    const env = process.env.NODE_ENV;
    const validEnvs = ['development', 'production', 'staging', 'test'];

    if (!validEnvs.includes(env)) {
        throw new Error(
            `NODE_ENV must be one of: ${validEnvs.join(', ')} (got: ${env})`
        );
    }

    return env;
};

/**
 * Validate CORS origin for production
 */
const validateCORS = () => {
    const origin = process.env.CORS_ORIGIN;

    if (process.env.NODE_ENV === 'production' && origin === '*') {
        console.warn(
            '⚠️  WARNING: CORS_ORIGIN is set to "*" in production. This is a security risk!'
        );
    }

    return origin;
};

/**
 * Main validation function
 */
const validateEnv = () => {
    console.log('🔍 Validating environment variables...');

    try {
        // Validate environment
        const env = validateEnvironment();
        console.log(`✓ Environment: ${env}`);

        // Validate required variables
        for (const varName of requiredVars) {
            if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
                validateSecret(varName);
                console.log(`✓ ${varName} is set and valid`);
            } else {
                validateRequired(varName);
                console.log(`✓ ${varName} is set`);
            }
        }

        // Check optional variables
        for (const varName of optionalVars) {
            if (process.env[varName]) {
                console.log(`✓ ${varName} is set (optional)`);
            } else {
                console.log(`⚠ ${varName} is not set (optional)`);
            }
        }

        // Validate CORS
        validateCORS();

        console.log('✅ Environment validation passed!\n');
        return true;
    } catch (error) {
        console.error('❌ Environment validation failed:');
        console.error(`   ${error.message}\n`);

        if (process.env.NODE_ENV === 'production') {
            console.error('Cannot start application with invalid environment in production.');
            process.exit(1);
        } else {
            console.warn('⚠️  Continuing in development mode despite validation errors.\n');
            return false;
        }
    }
};

module.exports = { validateEnv };
