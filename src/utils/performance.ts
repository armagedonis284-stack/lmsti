// Performance monitoring utilities for authentication

export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(label);
    
    // Log performance metrics
    if (duration > 100) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(label);
    return fn().finally(() => {
      this.endTimer(label);
    });
  }
}

// Authentication performance constants
export const AUTH_PERFORMANCE = {
  MAX_LOADING_TIME: 2000, // 2 seconds
  WARNING_THRESHOLD: 1000, // 1 second
  OPTIMAL_THRESHOLD: 500,  // 500ms
} as const;