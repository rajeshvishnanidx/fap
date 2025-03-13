const mongoose = require('mongoose');

const scrapingProgressSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: {
    type: String,
    default: null
  },
  lastmod: Date,
  priority: Number,
  changefreq: String,
  startedAt: Date,
  completedAt: Date,
  chunks: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound index to ensure unique URLs per agent
scrapingProgressSchema.index({ agentId: 1, url: 1 }, { unique: true });

const ScrapingProgress = mongoose.model('ScrapingProgress', scrapingProgressSchema);

module.exports = ScrapingProgress; 