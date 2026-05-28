const crypto = require('crypto');

const secret = 'yaadi-default-super-secret-encryption-key-2026';
const key = crypto.createHash('sha256').update(secret).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}.${encrypted}.${authTag}`;
}

console.log("Encrypted password for 'admin123':", encrypt('admin123'));
