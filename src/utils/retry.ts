// Utility functions for retrying operations with exponential backoff

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx status codes
    if (error?.message?.includes('timeout')) return true;
    if (error?.message?.includes('network')) return true;
    if (error?.status >= 500) return true;
    return false;
  }
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt or error doesn't match retry condition
      if (attempt === opts.maxAttempts! || !opts.retryCondition!(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay! * Math.pow(opts.backoffFactor!, attempt - 1),
        opts.maxDelay!
      );

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, (error as Error)?.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Specialized retry function for Supabase queries
export async function retrySupabaseQuery<T>(
  queryFn: () => any
): Promise<{ data: T | null; error: any }> {
  return retryWithBackoff(queryFn, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    retryCondition: (error) => {
      // Retry on specific Supabase errors
      if (error?.message?.includes('timeout')) return true;
      if (error?.message?.includes('network')) return true;
      if (error?.message?.includes('connection')) return true;
      if (error?.code === 'PGRST301') return true; // Connection error
      return false;
    }
  });
}