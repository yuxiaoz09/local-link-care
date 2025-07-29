/**
 * Enhanced form validation utilities with security-first approach
 */

import { sanitizeText, isValidEmail, isValidPhone } from './security';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export function validateField(
  value: string,
  fieldName: string,
  rules: FormValidationRules = {}
): ValidationResult {
  const errors: string[] = [];
  const sanitizedValue = sanitizeText(value);

  // Required field validation
  if (rules.required && (!sanitizedValue || sanitizedValue.trim().length === 0)) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  // Skip other validations if field is empty and not required
  if (!sanitizedValue && !rules.required) {
    return { isValid: true, errors: [] };
  }

  // Length validations
  if (rules.minLength && sanitizedValue.length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
  }

  if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
    errors.push(`${fieldName} must be no more than ${rules.maxLength} characters long`);
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
    errors.push(`${fieldName} format is invalid`);
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(sanitizedValue);
    if (customError) {
      errors.push(customError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateEmail(email: string): ValidationResult {
  const sanitizedEmail = sanitizeText(email);
  
  if (!sanitizedEmail) {
    return { isValid: false, errors: ['Email is required'] };
  }

  if (!isValidEmail(sanitizedEmail)) {
    return { isValid: false, errors: ['Please enter a valid email address'] };
  }

  return { isValid: true, errors: [] };
}

export function validatePhone(phone: string, required: boolean = false): ValidationResult {
  const sanitizedPhone = sanitizeText(phone);
  
  if (!sanitizedPhone && required) {
    return { isValid: false, errors: ['Phone number is required'] };
  }

  if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
    return { isValid: false, errors: ['Please enter a valid phone number'] };
  }

  return { isValid: true, errors: [] };
}

export function validateBusinessName(name: string): ValidationResult {
  return validateField(name, 'Business name', {
    required: true,
    minLength: 2,
    maxLength: 200,
    custom: (value) => {
      // Check for potentially malicious patterns
      if (/<script|javascript:|data:/i.test(value)) {
        return 'Business name contains invalid characters';
      }
      return null;
    }
  });
}

export function validateCustomerName(name: string): ValidationResult {
  return validateField(name, 'Customer name', {
    required: true,
    minLength: 1,
    maxLength: 100,
    custom: (value) => {
      // Check for potentially malicious patterns
      if (/<script|javascript:|data:/i.test(value)) {
        return 'Name contains invalid characters';
      }
      return null;
    }
  });
}

export function validateNotes(notes: string): ValidationResult {
  return validateField(notes, 'Notes', {
    required: false,
    maxLength: 2000,
    custom: (value) => {
      // More restrictive validation for notes due to potential for longer content
      if (/<script|<iframe|javascript:|data:/i.test(value)) {
        return 'Notes contain invalid content';
      }
      return null;
    }
  });
}

export function validateAddress(address: string): ValidationResult {
  return validateField(address, 'Address', {
    required: false,
    maxLength: 500,
    custom: (value) => {
      if (/<script|javascript:|data:/i.test(value)) {
        return 'Address contains invalid characters';
      }
      return null;
    }
  });
}

// CSRF token validation (for future implementation)
export function generateCSRFToken(): string {
  return crypto.getRandomValues(new Uint8Array(32))
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
}

export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) return false;
  return token === expectedToken;
}