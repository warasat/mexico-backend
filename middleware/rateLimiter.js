// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map();

const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this key
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        requests: [],
        resetTime: now + windowMs
      });
    }

    const rateLimitData = rateLimitStore.get(key);

    // Clean up old requests outside the window
    rateLimitData.requests = rateLimitData.requests.filter(
      requestTime => requestTime > windowStart
    );

    // Check if limit exceeded
    if (rateLimitData.requests.length >= max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
      });
    }

    // Add current request
    rateLimitData.requests.push(now);

    // Set response headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - rateLimitData.requests.length),
      'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
    });

    // Store original send function
    const originalSend = res.send;

    // Override send to track successful/failed requests
    res.send = function(data) {
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const isFailure = statusCode >= 400;

      // Skip tracking based on options
      if ((skipSuccessfulRequests && isSuccess) || 
          (skipFailedRequests && isFailure)) {
        return originalSend.call(this, data);
      }

      // If this is a failed request, we might want to remove it from the count
      // (depending on the skipFailedRequests option)
      if (isFailure && skipFailedRequests) {
        const index = rateLimitData.requests.indexOf(now);
        if (index > -1) {
          rateLimitData.requests.splice(index, 1);
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = rateLimiter;
