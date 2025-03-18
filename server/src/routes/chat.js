const express = require('express');
const OpenAI = require('openai');
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

// Helper function to track API usage with improved performance
async function trackApiUsage(userId, agentId, model, tokens) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Use findOneAndUpdate with upsert for atomic operation
    // This combines the find and update into a single database operation
    const result = await ApiUsage.findOneAndUpdate(
      {
        user: userId,
        agent: agentId,
        date: today,
        model: model
      },
      {
        $inc: {
          tokenCount: tokens,
          requestCount: 1
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: false // Skip validation for better performance
      }
    );
    
    // Calculate cost if needed
    if (result) {
      result.calculateCost();
      await result.save({ validateBeforeSave: false }); // Skip validation for better performance
    }
    
    return result;
  } catch (error) {
    console.error('Error tracking API usage:', error);
    // Don't throw the error to prevent disrupting the main flow
    return null;
  }
}

// Helper function to create chat completion with context
async function createChatCompletion(openai, messages, context, agent, userId) {
  try {
    // Check if agent has custom prompt and guidelines
    const hasCustomPrompt = agent.behavior && agent.behavior.prompt && agent.behavior.prompt.trim().length > 0;
    const hasCustomGuidelines = agent.behavior && agent.behavior.guidelines && agent.behavior.guidelines.trim().length > 0;
    
    // Extract HTML content from rich text if needed
    const extractTextContent = (htmlString) => {
      if (!htmlString) return '';
      // Basic HTML tag removal - for rich text content
      return htmlString
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .trim();
    };
    
    // Process custom prompt or use default system message
    let systemContent = '';
    if (hasCustomPrompt) {
      systemContent = extractTextContent(agent.behavior.prompt);
      
      // Replace any placeholders with actual values
      systemContent = systemContent
        .replace(/\[Gym Name\]/g, agent.name)
        .replace(/\[Agent Name\]/g, agent.name);
    } else {
      // Default system message if no custom prompt specified
      systemContent = `You are an AI assistant named ${agent.name} with a ${agent.behavior.tone.toLowerCase()} tone.`;
    }
    
    // Add guidelines if provided
    if (hasCustomGuidelines) {
      const guidelinesText = extractTextContent(agent.behavior.guidelines);
      systemContent += `\n\n${guidelinesText}`;
    }
    
    // Add context information
    systemContent += `\n\nUse the following context to help answer user questions:
    ${context}
    
    If the context doesn't contain relevant information, use your general knowledge but acknowledge that.`;
    
    // Prepare system message
    const systemMessage = {
      role: 'system',
      content: systemContent
    };

    // Log system message for debugging
    console.log('Using system message:', systemMessage.content.substring(0, 100) + '...');

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

// Helper function to find FAQ match by vector similarity
async function findFAQMatch(questionEmbedding, agent, threshold = 0.85) {
  try {
    // Filter enabled FAQs that have embeddings
    const enabledFaqs = agent.faqs.filter(faq => 
      faq.enabled && faq.vectorEmbedding && Array.isArray(faq.vectorEmbedding));
    
    if (enabledFaqs.length === 0) {
      return null;
    }

    // Calculate similarity for each FAQ
    const similarities = enabledFaqs.map(faq => {
      // Compute cosine similarity
      const dotProduct = questionEmbedding.reduce((sum, val, i) => 
        sum + val * faq.vectorEmbedding[i], 0);
      
      const magnitude1 = Math.sqrt(questionEmbedding.reduce((sum, val) => 
        sum + val * val, 0));
      
      const magnitude2 = Math.sqrt(faq.vectorEmbedding.reduce((sum, val) => 
        sum + val * val, 0));
      
      const similarity = dotProduct / (magnitude1 * magnitude2);
      
      return {
        faq,
        similarity
      };
    });

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Check if the best match is above threshold
    if (similarities.length > 0 && similarities[0].similarity >= threshold) {
      console.log(`FAQ match found with similarity: ${similarities[0].similarity.toFixed(4)}`);
      return similarities[0].faq;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding FAQ match:', error);
    return null;
  }
}

// Helper function for exact string-based match (for keywords or exact phrases)
function findExactFAQMatch(question, agent) {
  try {
    // Normalize question for comparison
    const normalizedQuestion = question.toLowerCase().trim();
    
    // Filter enabled FAQs
    const enabledFaqs = agent.faqs.filter(faq => faq.enabled);
    
    // Check for exact matches
    for (const faq of enabledFaqs) {
      const normalizedFaqQuestion = faq.question.toLowerCase().trim();
      
      // Check for exact match or if the FAQ question is contained within the user question
      if (normalizedQuestion === normalizedFaqQuestion || 
          normalizedQuestion.includes(normalizedFaqQuestion)) {
        console.log(`Exact FAQ match found: "${faq.question}"`);
        return faq;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding exact FAQ match:', error);
    return null;
  }
}

// Start chat or continue conversation
router.post('/:agentId', [authenticateToken, limiter], async (req, res) => {
  try {
    console.log('Processing chat request for agent:', req.params.agentId);

    // Get user with API key - explicitly select the openaiApiKey field
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

    // Get the actual key value (this triggers the getter which decrypts)
    const apiKey = user.openaiApiKey;
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format:', apiKey ? apiKey.substring(0, 3) + '...' : 'null');
      return res.status(400).json({
        message: 'OpenAI API key is invalid. Please update your API key in the settings.',
        error: 'OPENAI_KEY_INVALID_FORMAT'
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

    // Initialize OpenAI with user's API key - using v4 SDK syntax
    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Verify API key is valid by making a test request
    try {
      await openai.chat.completions.create({
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

    // Get the latest user message
    const latestMessage = req.body.messages[req.body.messages.length - 1];
    
    // Check for exact FAQ match if enabled in agent settings
    let faqMatch = null;
    if (agent.settings.useExactMatchForFAQs) {
      faqMatch = findExactFAQMatch(latestMessage.content, agent);
    }
    
    // If no exact match found and we have FAQs with embeddings, try vector similarity
    if (!faqMatch && agent.faqs && agent.faqs.some(faq => faq.enabled && faq.vectorEmbedding)) {
      // Generate embedding for the user's question
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: latestMessage.content
      });
      const questionEmbedding = embeddingResponse.data[0].embedding;
      
      // Find FAQ match by vector similarity
      faqMatch = await findFAQMatch(
        questionEmbedding, 
        agent, 
        agent.settings.faqMatchThreshold || 0.85
      );
      
      // If no FAQ match, search knowledge base using the embedding
      if (!faqMatch) {
        // Query vector store for relevant context
        const searchResults = await vectorStore.queryVectors(
          questionEmbedding,
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

        return res.json({
          message: response,
          context: searchResults.map(result => ({
            source: result.metadata.source,
            score: result.score
          })),
          type: 'knowledge_base'
        });
      }
    }
    
    // If we found an FAQ match, use it
    if (faqMatch) {
      // Track usage for FAQ responses
      await trackApiUsage(
        user._id, 
        agent._id, 
        'faq-match', 
        // Estimate token count as 1 per 4 characters (rough approximation)
        Math.ceil((latestMessage.content.length + faqMatch.answer.length) / 4)
      );
      
      return res.json({
        message: {
          role: 'assistant',
          content: faqMatch.answer
        },
        matchedFaq: {
          question: faqMatch.question
        },
        type: 'faq_match'
      });
    }
    
    // If we got here and have no FAQ match, generate embedding and search knowledge base
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: latestMessage.content
    });
    const questionEmbedding = embeddingResponse.data[0].embedding;
    
    // Query vector store for relevant context
    const searchResults = await vectorStore.queryVectors(
      questionEmbedding,
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
      })),
      type: 'knowledge_base'
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

    // Use lean() to get plain objects and improve performance
    // Only get the needed fields to reduce payload size
    const usage = await ApiUsage.find({
      user: req.user._id,
      date: { $gte: thirtyDaysAgo }
    })
    .select('agent tokenCount requestCount cost date model')
    .populate('agent', 'name')
    .lean()
    .limit(1000); // Limit results to prevent large queries

    // Group usage by agent more efficiently
    const agentStats = {};
    
    for (const record of usage) {
      // Handle potential null agent references
      if (!record.agent || !record.agent._id) {
        continue;
      }
      
      const agentId = record.agent._id.toString();
      
      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          name: record.agent.name || 'Unknown Agent',
          totalTokens: 0,
          totalRequests: 0,
          totalCost: 0,
          dailyUsage: []
        };
      }
      
      // Use nullish coalescing to handle potential undefined values
      const tokens = record.tokenCount ?? 0;
      const requests = record.requestCount ?? 0;
      const cost = record.cost ?? 0;
      
      agentStats[agentId].totalTokens += tokens;
      agentStats[agentId].totalRequests += requests;
      agentStats[agentId].totalCost += cost;
      
      // Only add daily usage if it has meaningful data
      if (tokens > 0 || requests > 0) {
        agentStats[agentId].dailyUsage.push({
          date: record.date,
          tokens: tokens,
          requests: requests,
          cost: cost,
          model: record.model || 'unknown'
        });
      }
    }

    res.json(agentStats);
  } catch (error) {
    console.error('Error fetching agent usage stats:', error);
    res.status(500).json({ 
      message: 'Error fetching agent usage statistics',
      error: error.message 
    });
  }
});

module.exports = router; 