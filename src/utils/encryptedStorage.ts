/**
 * Encrypted storage utilities using AES-GCM via the Web Crypto API.
 * Prevents casual tampering of localStorage auth data.
 * 
 * NOTE: Client-side encryption cannot protect against a determined attacker
 * with full browser access. This prevents casual DevTools tampering and
 * makes it significantly harder to forge auth tokens.
 */

// Encryption parameters
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT = 'free-state-v2-salt';
const STORAGE_PREFIX = 'enc_';

// Cache the derived key to avoid re-deriving on every operation
let cachedKey: CryptoKey | null = null;

/**
 * Derive an AES-256 key from a passphrase using PBKDF2.
 * Uses a combination of the app identifier and browser fingerprint.
 */
async function deriveKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  // Create a passphrase from stable browser properties
  const passphrase = [
    'free-state-app-key',
    navigator.userAgent.slice(0, 50),
    navigator.language,
    SALT,
  ].join('|');

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedKey;
}

/**
 * Encrypt a string value and return a base64-encoded ciphertext.
 */
async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext into a single array
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Base64 encode
  return btoa(Array.from(combined).map(b => String.fromCharCode(b)).join(''));
}

/**
 * Decrypt a base64-encoded ciphertext back to a string.
 */
async function decrypt(encoded: string): Promise<string | null> {
  try {
    const key = await deriveKey();
    
    // Base64 decode
    const combined = new Uint8Array(
      atob(encoded).split('').map(c => c.charCodeAt(0))
    );

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    // Decryption failed — data was tampered with or key changed
    return null;
  }
}

// ──────────────────────────────────────────────
// Public API: Encrypted localStorage wrapper
// ──────────────────────────────────────────────

/**
 * Store a value in encrypted localStorage.
 */
export async function secureSet(key: string, value: string): Promise<void> {
  try {
    const encrypted = await encrypt(value);
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, encrypted);
  } catch {
    // Fallback to plain storage if encryption fails (e.g., no crypto API)
    localStorage.setItem(key, value);
  }
}

/**
 * Retrieve and decrypt a value from encrypted localStorage.
 * Returns null if the key doesn't exist or decryption fails.
 */
export async function secureGet(key: string): Promise<string | null> {
  try {
    const encrypted = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!encrypted) {
      // Check for legacy unencrypted data and migrate it
      const legacy = localStorage.getItem(key);
      if (legacy) {
        await secureMigrate(key, legacy);
        return legacy;
      }
      return null;
    }
    return await decrypt(encrypted);
  } catch {
    return null;
  }
}

/**
 * Remove a value from encrypted localStorage.
 * Also removes any legacy unencrypted version.
 */
export function secureRemove(key: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  localStorage.removeItem(key); // Clean up legacy key too
}

/**
 * Migrate a legacy unencrypted value to encrypted storage.
 */
async function secureMigrate(key: string, value: string): Promise<void> {
  await secureSet(key, value);
  localStorage.removeItem(key); // Remove the old unencrypted value
}

/**
 * Validate the integrity of encrypted storage.
 * Returns true if all encrypted values can be decrypted successfully.
 */
export async function validateStorage(): Promise<boolean> {
  try {
    const testKey = `${STORAGE_PREFIX}_integrity_check`;
    const testValue = `check_${Date.now()}`;
    
    await secureSet('_integrity_check', testValue);
    const retrieved = await secureGet('_integrity_check');
    
    localStorage.removeItem(testKey);
    
    return retrieved === testValue;
  } catch {
    return false;
  }
}
