const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  date: {
    type: Date,
    required: true
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
  model: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
apiUsageSchema.index({ user: 1, date: 1 });
apiUsageSchema.index({ user: 1, agent: 1, date: 1 });

// Method to calculate cost based on model and tokens
apiUsageSchema.methods.calculateCost = function() {
  const rates = {
    'gpt-4': 0.03, // $0.03 per 1K tokens
    'gpt-3.5-turbo': 0.002 // $0.002 per 1K tokens
  };
  
  const rate = rates[this.model] || rates['gpt-3.5-turbo'];
  this.cost = (this.tokenCount / 1000) * rate;
};

const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);

module.exports = ApiUsage; 