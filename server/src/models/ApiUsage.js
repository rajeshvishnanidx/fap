const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  model: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  tokenCount: {
    type: Number,
    default: 0
  },
  requestCount: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound index for most common query patterns
apiUsageSchema.index({ user: 1, date: 1 });
apiUsageSchema.index({ user: 1, agent: 1, date: 1 });

// Calculate cost based on model and tokens
apiUsageSchema.methods.calculateCost = function() {
  // GPT-4 rate: $0.03 per 1K tokens (0.00003 per token)
  // GPT-3.5-turbo rate: $0.002 per 1K tokens (0.000002 per token)
  let rate;
  
  if (this.model === 'gpt-4') {
    rate = 0.00003;
  } else if (this.model === 'gpt-3.5-turbo') {
    rate = 0.000002;
  } else {
    // Default rate for other models
    rate = 0.000002;
  }
  
  this.cost = this.tokenCount * rate;
  return this.cost;
};

// Add index for aggregation queries
apiUsageSchema.index({ user: 1, agent: 1, model: 1, date: 1 });

// Add a TTL index to automatically delete records older than 6 months
apiUsageSchema.index({ date: 1 }, {
  expireAfterSeconds: 15552000 // 180 days (6 months)
});

const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);

module.exports = ApiUsage; 