/**
 * Rate Limiter Service using Deno KV
 * Prevents abuse by limiting requests per IP address
 */

const kv = await Deno.openKv();

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}

/**
 * Extracts the client IP address from the request
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 */
export function getClientIP(req: Request): string {
    // Check for forwarded IP (common in production behind proxies)
    const forwardedFor = req.headers.get("X-Forwarded-For");
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first one
        return forwardedFor.split(",")[0].trim();
    }

    const realIP = req.headers.get("X-Real-IP");
    if (realIP) {
        return realIP.trim();
    }

    // Fallback to "unknown" if no IP can be determined
    // In production, this should be rare
    return "unknown";
}

/**
 * Checks if a request should be rate limited
 * Uses a sliding window algorithm with Deno KV
 *
 * @param identifier - Unique identifier (usually IP address)
 * @returns RateLimitResult indicating if request is allowed
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const key = ["rate_limit", identifier];

    // Get current request log
    const entry = await kv.get<number[]>(key);
    let requestTimes: number[] = entry.value || [];

    // Filter out requests outside the current window
    requestTimes = requestTimes.filter((time) => time > windowStart);

    // Check if limit exceeded
    if (requestTimes.length >= MAX_REQUESTS_PER_WINDOW) {
        const oldestRequest = Math.min(...requestTimes);
        const resetTime = oldestRequest + RATE_LIMIT_WINDOW_MS;

        return {
            allowed: false,
            remaining: 0,
            resetTime,
        };
    }

    // Add current request
    requestTimes.push(now);

    // Store updated request log with TTL slightly longer than window
    await kv.set(key, requestTimes, {
        expireIn: RATE_LIMIT_WINDOW_MS + 10000, // Extra 10 seconds to be safe
    });

    return {
        allowed: true,
        remaining: MAX_REQUESTS_PER_WINDOW - requestTimes.length,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
}

/**
 * Middleware-style function to apply rate limiting to a request
 * Returns a 429 response if rate limit is exceeded
 *
 * @param req - The incoming request
 * @returns Response if rate limited, null if allowed
 */
export async function applyRateLimit(req: Request): Promise<Response | null> {
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
        const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);

        console.warn(`Rate limit exceeded for IP: ${clientIP}`);

        return new Response(
            JSON.stringify({
                success: false,
                error: "Rate limit exceeded. Please try again later.",
                retryAfter,
            }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": retryAfter.toString(),
                    "X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }

    // Add rate limit headers to successful requests
    // These will need to be added to the actual response later
    return null;
}

/**
 * Get rate limit headers for a successful request
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        "X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetTime.toString(),
    };
}
