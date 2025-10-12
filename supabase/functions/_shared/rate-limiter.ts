/**
 * Simple in-memory rate limiter for Supabase Edge Functions
 * For production, consider using Redis or Supabase database for persistence
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 3600000, maxRequests: number = 10) {
    this.windowMs = windowMs; // Default: 1 hour
    this.maxRequests = maxRequests; // Default: 10 requests

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Check if request is allowed
   * @param key - Unique identifier (e.g., user ID or IP)
   * @returns Object with allowed status and remaining requests
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No existing entry or expired window - allow and create new
    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs
      };
    }

    // Within window - check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt
      };
    }

    // Increment count and allow
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt
    };
  }

  /**
   * Get current status without incrementing
   */
  getStatus(key: string): { count: number; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetAt) {
      return {
        count: 0,
        remaining: this.maxRequests,
        resetAt: now + this.windowMs
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.resetAt
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Get all current limits (for debugging)
   */
  getAll(): Map<string, RateLimitEntry> {
    return new Map(this.limits);
  }
}

// Create singleton instances for different scopes
export const perUserLimiter = new RateLimiter(3600000, 10); // 10 per hour per user
export const globalLimiter = new RateLimiter(3600000, 100); // 100 per hour globally

/**
 * Middleware helper for rate limiting in Edge Functions
 */
export function rateLimitMiddleware(
  userId: string | null,
  ipAddress: string | null
): {
  allowed: boolean;
  reason?: string;
  headers: Record<string, string>;
} {
  // Check global limit first
  const globalCheck = globalLimiter.check('global');
  if (!globalCheck.allowed) {
    const retryAfter = Math.ceil((globalCheck.resetAt - Date.now()) / 1000);
    return {
      allowed: false,
      reason: 'Global rate limit exceeded. Please try again later.',
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': globalCheck.resetAt.toString(),
        'Retry-After': retryAfter.toString()
      }
    };
  }

  // Check user-specific limit
  const key = userId || ipAddress || 'anonymous';
  const userCheck = perUserLimiter.check(key);

  if (!userCheck.allowed) {
    const retryAfter = Math.ceil((userCheck.resetAt - Date.now()) / 1000);
    return {
      allowed: false,
      reason: 'Rate limit exceeded. You can make 10 requests per hour.',
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': userCheck.resetAt.toString(),
        'Retry-After': retryAfter.toString()
      }
    };
  }

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': userCheck.remaining.toString(),
      'X-RateLimit-Reset': userCheck.resetAt.toString()
    }
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    null
  );
}

/**
 * Get user ID from Supabase auth header
 */
export function getUserId(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    // Extract JWT payload (simplified - in production use proper JWT validation)
    const token = authHeader.substring(7);
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
