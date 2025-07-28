/**
 * Security utilities for input sanitization and validation
 */

// DOMPurify-like text sanitization without external dependency
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  // Remove potentially dangerous characters and patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data URLs
    .trim();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone format (basic)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

// Centralized rate limiting configuration
export const RATE_LIMITS = {
  CHAT_QUERY: { maxAttempts: 10, windowMs: 60000 }, // 10 per minute
  TASK_CREATION: { maxAttempts: 10, windowMs: 60000 }, // 10 per minute
  CUSTOMER_CREATION: { maxAttempts: 10, windowMs: 60000 }, // 10 per minute
  AUTH_ATTEMPTS: { maxAttempts: 5, windowMs: 300000 }, // 5 per 5 minutes
} as const;

// Rate limiting helper for client-side
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      logSecurityEvent('Rate limit exceeded', { key, attempts: validAttempts.length });
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  // Helper method using centralized config
  checkLimit(action: keyof typeof RATE_LIMITS, userId: string): boolean {
    const config = RATE_LIMITS[action];
    const key = `${action}_${userId}`;
    return this.isAllowed(key, config.maxAttempts, config.windowMs);
  }
}

export const rateLimiter = new RateLimiter();

// Enhanced security event logging with sanitization
export function logSecurityEvent(event: string, details?: any) {
  const sanitizedDetails = details ? sanitizeLogData(details) : undefined;
  console.warn(`[SECURITY] ${event}`, sanitizedDetails);
  // In production, this could send to a logging service
}

// Sanitize data before logging to prevent information disclosure
function sanitizeLogData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeText(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Exclude sensitive fields from logs
      if (['password', 'token', 'secret', 'key', 'auth'].some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

// Sanitize error messages for user display
export function sanitizeErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  
  const message = error.message || error.toString();
  
  // Generic messages for security-sensitive errors
  const securityPatterns = [
    /access denied/i,
    /invalid business access/i,
    /permission denied/i,
    /unauthorized/i,
    /authentication/i,
    /function.*does not exist/i,
    /relation.*does not exist/i,
    /column.*does not exist/i,
  ];
  
  for (const pattern of securityPatterns) {
    if (pattern.test(message)) {
      logSecurityEvent('Security error sanitized', { originalError: message });
      return 'Access denied. Please check your permissions.';
    }
  }
  
  // Sanitize database-specific errors
  if (message.includes('duplicate key value') || message.includes('violates')) {
    return 'The operation could not be completed due to a data constraint.';
  }
  
  if (message.includes('connection') || message.includes('timeout')) {
    return 'Service temporarily unavailable. Please try again.';
  }
  
  // Default sanitization for other errors
  return sanitizeText(message).substring(0, 200); // Limit length
}

// Session timeout management
export class SessionManager {
  private static readonly TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private timeoutId: NodeJS.Timeout | null = null;
  private onTimeoutCallback?: () => void;

  startTimer(onTimeout: () => void) {
    this.onTimeoutCallback = onTimeout;
    this.resetTimer();
  }

  resetTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      logSecurityEvent('Session timeout');
      this.onTimeoutCallback?.();
    }, SessionManager.TIMEOUT_MS);
  }

  clearTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export const sessionManager = new SessionManager();

// Alias for backwards compatibility
export const sanitizeInput = sanitizeText;