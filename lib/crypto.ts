import crypto from 'crypto';

// Hash the encryption key to guarantee it is exactly 32 bytes
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || 'yaadi-default-super-secret-encryption-key-2026';
  return crypto.createHash('sha256').update(secret).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard IV length for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plain text string to an AES-256-GCM encrypted hex string.
 * Format: iv.encryptedContent.authTag
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}.${encrypted}.${authTag}`;
}

/**
 * Decrypts an encrypted hex string back to plain text.
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedContent = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedContent as any, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return 'Decryption Error';
  }
}
