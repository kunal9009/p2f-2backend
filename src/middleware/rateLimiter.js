const rateLimit = require('express-rate-limit');

// Strict limiter for auth endpoints (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again in 15 minutes' },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down' },
});

module.exports = { authLimiter, apiLimiter };
