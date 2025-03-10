const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  appearance: {
    primaryColor: {
      type: String,
      default: '#2E7D32',
    },
    icon: {
      type: String, // Base64 or URL
    },
  },
  behavior: {
    tone: {
      type: String,
      enum: ['Professional', 'Friendly', 'Casual', 'Formal', 'Enthusiastic', 'Technical'],
      default: 'Professional',
    },
    style: {
      type: String,
      enum: ['Helpful and Informative', 'Concise and Direct', 'Empathetic and Understanding', 'Proactive and Suggestive'],
      default: 'Helpful and Informative',
    },
    greeting: {
      type: String,
      default: 'Hello! How can I help you today?',
    },
  },
  knowledgeBase: [{
    type: {
      type: String,
      enum: ['website', 'file'],
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    vectorStore: {
      type: String, // Reference to vector store
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  settings: {
    model: {
      type: String,
      default: 'gpt-3.5-turbo',
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
    },
    maxTokens: {
      type: Number,
      default: 150,
    },
  },
  widgetSettings: {
    position: {
      type: String,
      enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
      default: 'bottom-right',
    },
    initialMessage: {
      type: String,
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
agentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate widget script
agentSchema.methods.generateWidgetScript = function() {
  return `
    <script>
      (function(w,d,s,o,f,js,fjs){
        w['AI-Agent-Widget']=o;w[o]=w[o]||function(){
        (w[o].q=w[o].q||[]).push(arguments)};js=d.createElement(s),
        fjs=d.getElementsByTagName(s)[0];js.id=o;js.src=f;js.async=1;
        fjs.parentNode.insertBefore(js,fjs);
      }(window,document,'script','aiagent','https://your-domain.com/widget.js'));
      aiagent('init', '${this._id}');
    </script>
  `;
};

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent; 