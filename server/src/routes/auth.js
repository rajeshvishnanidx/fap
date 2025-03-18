const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company, website } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      company,
      website,
    });

    // Generate API key
    user.generateApiKey();

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// Update OpenAI API key
router.put('/openai-key', authenticateToken, async (req, res) => {
  try {
    console.log('Updating OpenAI API key for user:', req.user._id);
    console.log('Request body:', { hasKey: !!req.body.openaiApiKey });
    
    const { openaiApiKey } = req.body;
    
    if (!openaiApiKey || typeof openaiApiKey !== 'string' || openaiApiKey.trim().length === 0) {
      console.log('Invalid API key format received');
      return res.status(400).json({ message: 'Valid OpenAI API key is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('User not found:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the API key format (should start with 'sk-')
    if (!openaiApiKey.startsWith('sk-')) {
      console.log('Invalid API key format - does not start with sk-');
      return res.status(400).json({ message: 'Invalid OpenAI API key format' });
    }

    // Log encryption key status
    console.log('ENCRYPTION_KEY status:', {
      exists: !!process.env.ENCRYPTION_KEY,
      length: process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0
    });

    // Save the API key - use a transaction to ensure consistency
    try {
      // Assign the key directly - our getter/setter in the model will handle encryption
      user.openaiApiKey = openaiApiKey;
      await user.save();

      // Verify the key was saved by retrieving it again
      const updatedUser = await User.findById(req.user._id).select('+openaiApiKey');
      
      // Log save status (but don't log actual key values)
      console.log('API key saved status:', {
        hasKey: !!updatedUser.openaiApiKey,
        keyLength: updatedUser.openaiApiKey ? updatedUser.openaiApiKey.length : 0
      });

      // Test if key is retrievable and correctly stored
      const retrievedKey = updatedUser.openaiApiKey; // Should trigger getter for decryption
      
      if (!retrievedKey || !retrievedKey.startsWith('sk-')) {
        console.error('Key was saved but cannot be correctly retrieved. Check encryption setup.');
        return res.status(500).json({ 
          message: 'API key saved but retrieval issue detected. Try testing in chat.',
          status: 'partial_success'
        });
      }

      console.log('Successfully updated OpenAI API key');
      res.json({ message: 'OpenAI API key updated successfully' });
    } catch (saveError) {
      console.error('Error saving OpenAI API key:', saveError);
      res.status(500).json({ 
        message: 'Error while saving API key', 
        error: saveError.message,
        suggestion: 'Check server logs for more details'
      });
    }
  } catch (error) {
    console.error('Error in update OpenAI API key endpoint:', error);
    res.status(500).json({ message: 'Error updating API key', error: error.message });
  }
});

// Diagnostic endpoint for OpenAI API key
router.get('/check-openai-key', authenticateToken, async (req, res) => {
  try {
    // Check if ENCRYPTION_KEY is set
    if (!process.env.ENCRYPTION_KEY) {
      return res.status(500).json({ 
        message: 'Server configuration error: ENCRYPTION_KEY not set',
        envVars: {
          hasEncryptionKey: !!process.env.ENCRYPTION_KEY
        }
      });
    }
    
    // Try to retrieve the user with the API key
    const user = await User.findById(req.user._id).select('+openaiApiKey');
    
    // Check if the key exists and can be decrypted
    const apiKeyStatus = {
      keyExists: !!user.openaiApiKey,
      keyFormat: user.openaiApiKey ? (user.openaiApiKey.includes(':') ? 'encrypted' : 'invalid') : 'none',
      keyDecryptable: false
    };
    
    // Try to decrypt the key if it exists
    if (user.openaiApiKey) {
      try {
        // We don't want to expose the actual key, just check if it can be decrypted
        const decrypted = user.openaiApiKey; // This will trigger the getter
        apiKeyStatus.keyDecryptable = !!decrypted;
        apiKeyStatus.startsWithSk = decrypted && decrypted.startsWith('sk-');
      } catch (error) {
        console.error('Error decrypting API key:', error);
        apiKeyStatus.decryptError = error.message;
      }
    }
    
    res.json({
      message: 'OpenAI API key diagnostic results',
      apiKeyStatus,
      userId: user._id,
      email: user.email
    });
    
  } catch (error) {
    console.error('Error in OpenAI API key diagnostic:', error);
    res.status(500).json({ 
      message: 'Error running diagnostics', 
      error: error.message 
    });
  }
});

// Regenerate API key
router.post('/regenerate-key', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const newApiKey = user.generateApiKey();
    await user.save();

    res.json({ apiKey: newApiKey });
  } catch (error) {
    res.status(500).json({ message: 'Error regenerating API key', error: error.message });
  }
});

module.exports = router; 