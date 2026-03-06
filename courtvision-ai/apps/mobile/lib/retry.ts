/**
 * CourtVision AI — Network Resilience Utility
 * 
 * Provides standard exponential backoff retries for unstable mobile networks.
 * Wraps any promise-based function to automatically retry on failure.
 */

interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
    onRetry?: (error: any, attempt: number) => void;
}

export const withRetry = async <T,>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> => {
    const {
        maxRetries = 3,
        initialDelayMs = 1000,
        maxDelayMs = 10000,
        backoffFactor = 2,
        onRetry,
    } = options;

    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt <= maxRetries) {
        try {
            return await fn();
        } catch (error: any) {
            attempt++;

            if (attempt > maxRetries) {
                throw error; // Max retries exhausted
            }

            if (onRetry) {
                onRetry(error, attempt);
            }

            // Await exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));

            // Calculate next delay, bounded by maxDelayMs
            delay = Math.min(delay * backoffFactor, maxDelayMs);
        }
    }

    throw new Error('Unreachable: should throw from inside the loop');
};
