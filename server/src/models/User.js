const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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
          return null;
        }
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
        const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
      } catch (error) {
        console.error('Error encrypting OpenAI API key:', error);
        return null;
      }
    },
    get: function(key) {
      if (!key) return null;
      try {
        const algorithm = 'aes-256-ctr';
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) {
          console.error('ENCRYPTION_KEY not set in environment variables');
          return null;
        }
        const [ivHex, encryptedHex] = key.split(':');
        if (!ivHex || !encryptedHex) return null;
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString();
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