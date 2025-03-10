const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { Configuration, OpenAIApi } = require('openai');

// Update user settings
router.post('/settings', authenticateToken, async (req, res) => {
  try {
    const { openaiApiKey } = req.body;

    // Validate the API key before saving
    if (openaiApiKey) {
      try {
        const configuration = new Configuration({
          apiKey: openaiApiKey
        });
        const openai = new OpenAIApi(configuration);
        
        // Make a test API call
        await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        });
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid OpenAI API key',
          error: error.response?.data?.error?.message || error.message
        });
      }
    }

    // Update user settings
    const user = await User.findById(req.user._id);
    if (openaiApiKey) {
      user.openaiApiKey = openaiApiKey;
    }
    await user.save();

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

module.exports = router; 