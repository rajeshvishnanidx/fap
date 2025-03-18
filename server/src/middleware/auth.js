const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    console.log('--- AUTH MIDDLEWARE START ---');
    console.log('Request path:', req.path);
    const authHeader = req.headers['authorization'];
    console.log('Auth header exists:', !!authHeader);
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return res.status(401).json({ message: 'Access token is required' });
    }
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token extracted:', token ? `${token.substring(0, 10)}...` : 'None');

    if (!token) {
      console.log('No token found in Authorization header');
      return res.status(401).json({ message: 'Access token is required' });
    }

    try {
      console.log('Attempting to verify token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verification successful. Decoded user ID:', decoded.userId);
      
      console.log('Looking up user...');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        console.log('User not found for ID:', decoded.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      // Log user authentication details
      console.log('User authenticated:', {
        userId: user._id,
        email: user.email,
        hasOpenAIKey: !!user.openaiApiKey
      });

      req.user = user;
      console.log('--- AUTH MIDDLEWARE SUCCESS ---');
      next();
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError.message);
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired', 
          error: tokenError.message,
          expiredAt: tokenError.expiredAt
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          message: 'Invalid token format or signature', 
          error: tokenError.message 
        });
      } else {
        return res.status(403).json({ 
          message: 'Token verification failed', 
          error: tokenError.message 
        });
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    console.log('--- AUTH MIDDLEWARE ERROR ---');
    return res.status(500).json({ 
      message: 'Authentication process failed', 
      error: error.message 
    });
  }
};

module.exports = {
  authenticateToken,
}; 