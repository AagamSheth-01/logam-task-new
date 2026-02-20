/**
 * Crypto Utilities
 * Encryption and decryption functions
 */

import crypto from 'crypto';

/**
 * Encrypt a password
 * @param {string} plaintext - Plain text password
 * @returns {string} Encrypted password
 */
export const encryptPassword = (plaintext) => {
  try {
    if (!plaintext) return null;

    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.JWT_SECRET || 'default-key-32-characters-long!!', 'utf-8').slice(0, 32);
    const iv = Buffer.alloc(16, 0); // Fixed IV for simplicity (NOT SECURE for production)

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

/**
 * Decrypt a password
 * @param {string} encrypted - Encrypted password
 * @returns {string|null} Decrypted password or null
 */
export const decryptPassword = (encrypted) => {
  try {
    if (!encrypted) return null;

    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.JWT_SECRET || 'default-key-32-characters-long!!', 'utf-8').slice(0, 32);
    const iv = Buffer.alloc(16, 0); // Fixed IV for simplicity (NOT SECURE for production)

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

/**
 * Hash a password using SHA-256
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
export const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * Generate a random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Random token as hex string
 */
export const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Compare a plain password with a hashed password
 * @param {string} plain - Plain text password
 * @param {string} hashed - Hashed password
 * @returns {boolean} True if passwords match
 */
export const comparePasswords = (plain, hashed) => {
  return hashPassword(plain) === hashed;
};

export default {
  encryptPassword,
  decryptPassword,
  hashPassword,
  generateToken,
  comparePasswords
};
