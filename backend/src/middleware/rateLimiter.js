const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for token-generation endpoint.
 * Prevents burst abuse — max 10 requests per minute per IP.
 */
const tokenRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many token requests from this IP. Please wait a moment.',
  },
  skipSuccessfulRequests: false,
});

/**
 * General auth limiter — max 20 requests per 15 minutes per IP (relaxed in development).
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

module.exports = { tokenRateLimiter, authRateLimiter };
