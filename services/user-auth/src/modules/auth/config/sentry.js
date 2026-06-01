const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry for error tracking
 */
const initSentry = (app) => {
    // Only initialize if DSN is provided
    if (!process.env.SENTRY_DSN) {
        console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
        return;
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',

        // Set sample rate based on environment
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        integrations: [
            // Enable HTTP calls tracing
            new Sentry.Integrations.Http({ tracing: true }),
            // Enable Express.js middleware tracing
            new Sentry.Integrations.Express({ app }),
            // Enable profiling
            new ProfilingIntegration(),
        ],

        // Ignore certain errors
        ignoreErrors: [
            // Browser errors
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            // Network errors
            'NetworkError',
            'Network request failed',
        ],

        // Before sending error, add custom context
        beforeSend(event, hint) {
            // Don't send errors in development unless explicitly enabled
            if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
                return null;
            }

            // Add custom tags
            if (event.request) {
                event.tags = {
                    ...event.tags,
                    endpoint: event.request.url,
                    method: event.request.method,
                };
            }

            return event;
        },
    });

    console.log('✅ Sentry initialized for error tracking');
};

/**
 * Capture exception with context
 */
const captureException = (error, context = {}) => {
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            extra: context,
        });
    }
};

/**
 * Capture message with context
 */
const captureMessage = (message, level = 'info', context = {}) => {
    if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(message, {
            level,
            extra: context,
        });
    }
};

/**
 * Set user context for error tracking
 */
const setUser = (user) => {
    if (process.env.SENTRY_DSN && user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            role: user.role,
        });
    }
};

/**
 * Clear user context
 */
const clearUser = () => {
    if (process.env.SENTRY_DSN) {
        Sentry.setUser(null);
    }
};

module.exports = {
    Sentry,
    initSentry,
    captureException,
    captureMessage,
    setUser,
    clearUser,
};
