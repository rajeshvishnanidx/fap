const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper function to get a 32-byte key from whatever ENCRYPTION_KEY is in the env
const getDerivedKey = (secretKey) => {
  if (!secretKey) return null;
  // Use SHA-256 to derive a 32-byte key from any length input
  return crypto.createHash('sha256').update(String(secretKey)).digest();
};

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  apiKey: {
    type: String,
    unique: true,
  },
  openaiApiKey: {
    type: String,
    select: false,
    set: function(key) {
      if (!key) return null;
      try {
        const algorithm = 'aes-256-ctr';
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) {
          console.error('ENCRYPTION_KEY not set in environment variables');
          return key; // Don't encrypt if no key available - better than returning null
        }
        
        // Get a proper length key
        const derivedKey = getDerivedKey(secretKey);
        if (!derivedKey) {
          console.error('Failed to derive encryption key');
          return key;
        }
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
        const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
        const result = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
        console.log(`OpenAI API key encrypted successfully: ${key.substring(0, 5)}... => ${result.substring(0, 10)}...`);
        return result;
      } catch (error) {
        console.error('Error encrypting OpenAI API key:', error);
        return key; // Return original key instead of null
      }
    },
    get: function(key) {
      if (!key) return null;
      
      // If key doesn't contain ':' it might not be encrypted
      if (!key.includes(':')) {
        // Check if it's already in the correct format (starts with sk-)
        if (key.startsWith('sk-')) {
          console.log('OpenAI API key is not encrypted but valid format, returning as is');
          return key;
        }
        console.log('OpenAI API key not in encrypted format and not starting with sk-');
        return null;
      }
      
      try {
        const algorithm = 'aes-256-ctr';
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) {
          console.error('ENCRYPTION_KEY not set in environment variables for decryption');
          return null;
        }
        
        // Get a proper length key
        const derivedKey = getDerivedKey(secretKey);
        if (!derivedKey) {
          console.error('Failed to derive decryption key');
          return null;
        }
        
        const [ivHex, encryptedHex] = key.split(':');
        if (!ivHex || !encryptedHex) {
          console.error('Invalid encrypted key format');
          return null;
        }
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const result = decrypted.toString();
        console.log(`OpenAI API key decrypted successfully: ${key.substring(0, 10)}... => ${result.substring(0, 5)}...`);
        return result;
      } catch (error) {
        console.error('Error decrypting OpenAI API key:', error);
        return null;
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate API key
userSchema.methods.generateApiKey = function() {
  const uuid = require('uuid');
  this.apiKey = uuid.v4().replace(/-/g, '');
  return this.apiKey;
};

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 