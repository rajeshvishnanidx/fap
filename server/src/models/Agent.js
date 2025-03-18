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
    prompt: {
      type: String,
      default: 'You are an AI assistant for [Company Name]. Your role is to answer questions about their services. For any unusual requests, politely refuse. Don\'t tell jokes or provide entertainment, poems, or write email-related queries. If a request is not related to [Company Name], politely refuse to answer. Only provide information related to [Company Name].',
    },
    guidelines: {
      type: String,
      default: '1. Always refer to the name as [Company Name].\n2. Tone of the conversation should be friendly and professional. Respond like a human assistant.\n3. Your response should be short, concise, and in structured format. Provide answers in bullet points if required.\n4. If you don\'t know the answer, just politely respond that you don\'t have the information.\n5. For any unusual requests, politely refuse.\n6. Don\'t mention that you are an AI assistant, just respond like an assistant.\n7. Don\'t entertain any requests like writing emails, jokes, or poems. Don\'t provide any information other than information related to [Company Name].\n8. If a response requires a link, provide the link in the proper format. There should be no space between the text in the link and don\'t repeat the link text in the response.',
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
  faqs: [{
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    vectorEmbedding: {
      type: mongoose.Schema.Types.Mixed, // Stores the embedding vector
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      trim: true,
    },
    // New fields for better knowledge base association
    knowledgeBaseItemId: {
      type: String,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ['manual', 'generated', 'imported'],
      default: 'manual',
    },
    sourceMetadata: {
      type: mongoose.Schema.Types.Mixed, // For storing additional source information
    },
    category: {
      type: String,
      trim: true,
    }
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
    useExactMatchForFAQs: {
      type: Boolean,
      default: true,
    },
    faqMatchThreshold: {
      type: Number,
      default: 0.85,
      min: 0.5,
      max: 1.0,
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