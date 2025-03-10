const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const { authenticateToken } = require('../middleware/auth');
const Agent = require('../models/Agent');
const vectorStore = require('../utils/vectorStore');
const User = require('../models/User');
const ApiUsage = require('../models/ApiUsage');
const router = express.Router();

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Helper function to track API usage
async function trackApiUsage(userId, agentId, model, tokens) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    let usage = await ApiUsage.findOne({
      user: userId,
      agent: agentId,
      date: today
    });

    if (!usage) {
      usage = new ApiUsage({
        user: userId,
        agent: agentId,
        date: today,
        model: model
      });
    }

    usage.tokenCount += tokens;
    usage.requestCount += 1;
    usage.calculateCost();
    await usage.save();

    return usage;
  } catch (error) {
    console.error('Error tracking API usage:', error);
    // Don't throw error to prevent blocking the main chat functionality
  }
}

// Helper function to create chat completion with context
async function createChatCompletion(openai, messages, context, agent, userId) {
  try {
    // Prepare system message with agent's behavior settings
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant with the following characteristics:
      - Name: ${agent.name}
      - Tone: ${agent.behavior.tone}
      - Style: ${agent.behavior.style}
      - Greeting: "${agent.behavior.greeting}"
      
      Use the following context to help answer user questions:
      ${context}
      
      If the context doesn't contain relevant information, use your general knowledge but acknowledge that.
      Always maintain the specified tone and style in your responses.`
    };

    // Add system message at the start
    messages.unshift(systemMessage);

    const completion = await openai.chat.completions.create({
      model: agent.settings.model || 'gpt-3.5-turbo',
      messages: messages,
      temperature: agent.settings.temperature || 0.7,
      max_tokens: agent.settings.maxTokens || 150,
    });

    // Track token usage
    const totalTokens = completion.usage.total_tokens;
    await trackApiUsage(userId, agent._id, completion.model, totalTokens);

    return completion.choices[0].message;
  } catch (error) {
    console.error('Error in createChatCompletion:', error);
    throw error;
  }
}

// Start chat or continue conversation
router.post('/:agentId', [authenticateToken, limiter], async (req, res) => {
  try {
    console.log('Processing chat request for agent:', req.params.agentId);

    // Get user with API key
    const user = await User.findById(req.user._id).select('+openaiApiKey');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for OpenAI API key
    if (!user.openaiApiKey) {
      console.error('OpenAI API key not configured for user:', user._id);
      return res.status(400).json({ 
        message: 'OpenAI API key not configured. Please add your API key in the settings.',
        error: 'OPENAI_KEY_MISSING'
      });
    }

    // Get the agent
    const agent = await Agent.findById(req.params.agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Check if agent belongs to user
    if (agent.user.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to use this agent' });
    }

    // Initialize OpenAI with user's API key
    const configuration = new Configuration({
      apiKey: user.openaiApiKey
    });
    const openai = new OpenAIApi(configuration);

    // Verify API key is valid by making a test request
    try {
      await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: 'Test' }],
        max_tokens: 5
      });
    } catch (error) {
      console.error('OpenAI API key validation failed:', error.message);
      return res.status(400).json({
        message: 'Invalid OpenAI API key. Please check your API key in the settings.',
        error: 'OPENAI_KEY_INVALID'
      });
    }

    // Generate embedding for the user's question
    const latestMessage = req.body.messages[req.body.messages.length - 1];
    const embedding = await openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: latestMessage.content
    });

    // Query vector store for relevant context
    const searchResults = await vectorStore.queryVectors(
      embedding.data[0].embedding,
      {
        agentId: agent._id.toString(),
        userId: user._id.toString(),
      },
      3 // Get top 3 most relevant chunks
    );

    // Prepare context from search results
    const context = searchResults.length > 0
      ? 'Relevant information from knowledge base:\n' + 
        searchResults.map(result => result.text).join('\n\n')
      : 'No specific information found in knowledge base.';

    // Generate response using context
    const response = await createChatCompletion(
      openai, 
      req.body.messages, 
      context, 
      agent,
      user._id
    );

    res.json({
      message: response,
      context: searchResults.map(result => ({
        source: result.metadata.source,
        score: result.score
      }))
    });

  } catch (error) {
    console.error('Chat error:', error);

    // Handle different types of errors
    if (error.response?.data?.error?.type === 'insufficient_quota') {
      return res.status(429).json({ 
        message: 'OpenAI API quota exceeded. Please check your billing details.',
        error: 'QUOTA_EXCEEDED'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({ 
        message: 'Too many requests. Please try again later.',
        error: 'RATE_LIMIT'
      });
    }

    res.status(500).json({ 
      message: 'Error processing chat request',
      error: error.response?.data?.error || error.message 
    });
  }
});

// Get overall usage statistics
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usage = await ApiUsage.find({
      user: req.user._id,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    const summary = {
      totalTokens: usage.reduce((sum, record) => sum + record.tokenCount, 0),
      totalRequests: usage.reduce((sum, record) => sum + record.requestCount, 0),
      totalCost: usage.reduce((sum, record) => sum + record.cost, 0),
      dailyUsage: usage.map(record => ({
        date: record.date,
        tokens: record.tokenCount,
        requests: record.requestCount,
        cost: record.cost,
        model: record.model
      }))
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ message: 'Error fetching usage statistics' });
  }
});

// Get agent-specific usage statistics
router.get('/usage/agents', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all usage records for the last 30 days
    const usage = await ApiUsage.find({
      user: req.user._id,
      date: { $gte: thirtyDaysAgo }
    })
    .populate('agent', 'name')
    .sort({ date: 1 });

    // Group usage by agent
    const agentStats = {};
    
    usage.forEach(record => {
      const agentId = record.agent._id.toString();
      
      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          name: record.agent.name,
          totalTokens: 0,
          totalRequests: 0,
          totalCost: 0,
          dailyUsage: []
        };
      }
      
      agentStats[agentId].totalTokens += record.tokenCount;
      agentStats[agentId].totalRequests += record.requestCount;
      agentStats[agentId].totalCost += record.cost;
      agentStats[agentId].dailyUsage.push({
        date: record.date,
        tokens: record.tokenCount,
        requests: record.requestCount,
        cost: record.cost,
        model: record.model
      });
    });

    res.json(agentStats);
  } catch (error) {
    console.error('Error fetching agent usage stats:', error);
    res.status(500).json({ message: 'Error fetching agent usage statistics' });
  }
});

module.exports = router; 