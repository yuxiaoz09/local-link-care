/**
 * Password validation utilities for enhanced security
 */

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

// Common weak passwords to check against
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', '123123', 'password1', 'qwerty123'
];

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    feedback.push('Password is too common, please choose a more unique password');
    score = Math.max(0, score - 2);
  }

  // Additional length bonus
  if (password.length >= 12) {
    score = Math.min(5, score + 1);
  }

  const isValid = score >= 4 && feedback.length === 0;

  return {
    score: Math.min(4, score),
    feedback,
    isValid
  };
}

export function getPasswordStrengthText(score: number): { text: string; color: string } {
  switch (score) {
    case 0:
    case 1:
      return { text: 'Very Weak', color: 'text-destructive' };
    case 2:
      return { text: 'Weak', color: 'text-orange-500' };
    case 3:
      return { text: 'Good', color: 'text-yellow-500' };
    case 4:
    case 5:
      return { text: 'Strong', color: 'text-green-500' };
    default:
      return { text: 'Unknown', color: 'text-muted-foreground' };
  }
}