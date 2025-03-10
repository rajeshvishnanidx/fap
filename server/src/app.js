const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const chatRoutes = require('./routes/chat');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const dashboardRoutes = require('./routes/dashboard');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve static files from public directory
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app; 