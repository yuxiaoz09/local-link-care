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

// Rate limiting helper for client-side
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Security event logging
export function logSecurityEvent(event: string, details?: any) {
  console.warn(`[SECURITY] ${event}`, details);
  // In production, this could send to a logging service
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