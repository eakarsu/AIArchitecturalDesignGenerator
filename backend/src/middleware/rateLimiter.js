const rateLimit = require('express-rate-limit');

// General limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id ? `user:${req.user.id}` : req.ip,
  message: { error: 'Too many requests. Limit is 100 per 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI rate limiter: 20 requests per hour per user
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user:${req.user.id}` : req.ip,
  message: { error: 'Too many AI requests. Limit is 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login limiter: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = { generalLimiter, aiRateLimiter, loginLimiter };
