const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
  },
  type: {
    type: String,
    enum: ['faq_generation', 'knowledge_base_processing', 'agent_training'],
    required: true,
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'error', 'cancelled'],
    default: 'queued',
  },
  progress: {
    processed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    generated: { type: Number, default: 0 },
    currentBatch: { type: String },
  },
  error: {
    type: String,
  },
  stats: {
    type: mongoose.Schema.Types.Mixed,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
}, { timestamps: true });

// Define a TTL index to automatically delete completed jobs after 7 days
jobSchema.index({ 
  updatedAt: 1 
}, { 
  expireAfterSeconds: 7 * 24 * 60 * 60,
  partialFilterExpression: { 
    status: { $in: ['completed', 'error', 'cancelled'] } 
  } 
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job; 