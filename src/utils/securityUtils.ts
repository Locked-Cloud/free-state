/**
 * Security utilities for enhancing application security
 * Includes rate limiting, input validation, and security helpers
 */

// Rate limiting configuration
interface RateLimitConfig {
  maxAttempts: number;  // Maximum number of attempts allowed
  timeWindow: number;   // Time window in milliseconds
  blockDuration: number; // Duration to block in milliseconds after max attempts
}

// Default configurations for different security features
const DEFAULT_CONFIGS = {
  login: {
    maxAttempts: 5,
    timeWindow: 5 * 60 * 1000, // 5 minutes
    blockDuration: 15 * 60 * 1000, // 15 minutes
  },
  otp: {
    maxAttempts: 3,
    timeWindow: 5 * 60 * 1000, // 5 minutes
    blockDuration: 10 * 60 * 1000, // 10 minutes
  },
  otp_resend: {
    maxAttempts: 3,
    timeWindow: 10 * 60 * 1000, // 10 minutes
    blockDuration: 15 * 60 * 1000, // 15 minutes
  },
};

// Storage keys for rate limiting
const RATE_LIMIT_KEYS = {
  LOGIN_ATTEMPTS: 'login_attempts',
  OTP_ATTEMPTS: 'otp_attempts',
  OTP_RESEND_ATTEMPTS: 'otp_resend_attempts',
  LOGIN_BLOCKED_UNTIL: 'login_blocked_until',
  OTP_BLOCKED_UNTIL: 'otp_blocked_until',
  OTP_RESEND_BLOCKED_UNTIL: 'otp_resend_blocked_until',
};

/**
 * Check if an action is rate limited
 * @param actionType The type of action (login, otp, otp_resend)
 * @param identifier Unique identifier (e.g., username, IP)
 * @returns Object containing isLimited and remainingAttempts
 */
export const checkRateLimit = (
  actionType: 'login' | 'otp' | 'otp_resend',
  identifier: string
): { isLimited: boolean; remainingAttempts: number; blockedUntil: number | null } => {
  const config = DEFAULT_CONFIGS[actionType];
  let attemptsKey, blockedKey;
  
  switch (actionType) {
    case 'login':
      attemptsKey = RATE_LIMIT_KEYS.LOGIN_ATTEMPTS;
      blockedKey = RATE_LIMIT_KEYS.LOGIN_BLOCKED_UNTIL;
      break;
    case 'otp':
      attemptsKey = RATE_LIMIT_KEYS.OTP_ATTEMPTS;
      blockedKey = RATE_LIMIT_KEYS.OTP_BLOCKED_UNTIL;
      break;
    case 'otp_resend':
      attemptsKey = RATE_LIMIT_KEYS.OTP_RESEND_ATTEMPTS;
      blockedKey = RATE_LIMIT_KEYS.OTP_RESEND_BLOCKED_UNTIL;
      break;
  }
  
  // Check if currently blocked
  const blockedUntilStr = sessionStorage.getItem(`${blockedKey}_${identifier}`);
  if (blockedUntilStr) {
    const blockedUntil = parseInt(blockedUntilStr, 10);
    if (Date.now() < blockedUntil) {
      return { 
        isLimited: true, 
        remainingAttempts: 0,
        blockedUntil
      };
    } else {
      // Block period expired, clear it
      sessionStorage.removeItem(`${blockedKey}_${identifier}`);
    }
  }

  // Get current attempts
  const attemptsStr = sessionStorage.getItem(`${attemptsKey}_${identifier}`);
  let attempts = attemptsStr ? JSON.parse(attemptsStr) : [];
  
  // Filter attempts within the time window
  const now = Date.now();
  attempts = attempts.filter((timestamp: number) => now - timestamp < config.timeWindow);
  
  // Check if max attempts reached
  if (attempts.length >= config.maxAttempts) {
    // Set blocked until timestamp
    const blockedUntil = now + config.blockDuration;
    sessionStorage.setItem(`${blockedKey}_${identifier}`, blockedUntil.toString());
    
    return { 
      isLimited: true, 
      remainingAttempts: 0,
      blockedUntil
    };
  }
  
  return { 
    isLimited: false, 
    remainingAttempts: config.maxAttempts - attempts.length,
    blockedUntil: null
  };
};

/**
 * Record an attempt for rate limiting
 * @param actionType The type of action (login, otp, otp_resend)
 * @param identifier Unique identifier (e.g., username, IP)
 */
export const recordAttempt = (
  actionType: 'login' | 'otp' | 'otp_resend',
  identifier: string
): void => {
  let attemptsKey;
  
  switch (actionType) {
    case 'login':
      attemptsKey = RATE_LIMIT_KEYS.LOGIN_ATTEMPTS;
      break;
    case 'otp':
      attemptsKey = RATE_LIMIT_KEYS.OTP_ATTEMPTS;
      break;
    case 'otp_resend':
      attemptsKey = RATE_LIMIT_KEYS.OTP_RESEND_ATTEMPTS;
      break;
  }
  
  // Get current attempts
  const attemptsStr = sessionStorage.getItem(`${attemptsKey}_${identifier}`);
  let attempts = attemptsStr ? JSON.parse(attemptsStr) : [];
  
  // Add new attempt
  attempts.push(Date.now());
  
  // Save updated attempts
  sessionStorage.setItem(`${attemptsKey}_${identifier}`, JSON.stringify(attempts));
};

/**
 * Reset rate limiting for an identifier
 * @param actionType The type of action (login, otp, otp_resend)
 * @param identifier Unique identifier (e.g., username, IP)
 */
export const resetRateLimit = (
  actionType: 'login' | 'otp' | 'otp_resend',
  identifier: string
): void => {
  let attemptsKey, blockedKey;
  
  switch (actionType) {
    case 'login':
      attemptsKey = RATE_LIMIT_KEYS.LOGIN_ATTEMPTS;
      blockedKey = RATE_LIMIT_KEYS.LOGIN_BLOCKED_UNTIL;
      break;
    case 'otp':
      attemptsKey = RATE_LIMIT_KEYS.OTP_ATTEMPTS;
      blockedKey = RATE_LIMIT_KEYS.OTP_BLOCKED_UNTIL;
      break;
    case 'otp_resend':
      attemptsKey = RATE_LIMIT_KEYS.OTP_RESEND_ATTEMPTS;
      blockedKey = RATE_LIMIT_KEYS.OTP_RESEND_BLOCKED_UNTIL;
      break;
  }
  
  sessionStorage.removeItem(`${attemptsKey}_${identifier}`);
  sessionStorage.removeItem(`${blockedKey}_${identifier}`);
};

/**
 * Format remaining time for blocked accounts
 * @param blockedUntil Timestamp when block expires
 * @returns Formatted time string
 */
export const formatBlockedTime = (blockedUntil: number): string => {
  const remainingMs = blockedUntil - Date.now();
  if (remainingMs <= 0) return '0 seconds';
  
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
};

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object with isValid flag and message
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;
  
  if (strength < 3) {
    return { 
      isValid: false, 
      message: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, and special characters' 
    };
  }
  
  return { isValid: true, message: 'Password is strong' };
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param input User input string
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate a random OTP code
 * @param length Length of the OTP code
 * @returns Random OTP code
 */
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};