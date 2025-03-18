const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Agent = require('../models/Agent');
const { OpenAI } = require('openai');
const User = require('../models/User');
const vectorStore = require('../utils/vectorStore');
const Job = require('../models/Job');

// Helper function to generate embedding for FAQ question
async function generateEmbedding(question, apiKey) {
  try {
    const openai = new OpenAI({
      apiKey: apiKey
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding for FAQ question:', error);
    throw error;
  }
}

// Get all FAQs for an agent
router.get('/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    console.log('--- GET FAQs FOR AGENT ---');
    console.log('Request received for agent ID:', req.params.agentId);
    console.log('Query parameters:', req.query);
    
    // Performance optimization: Set a timeout to avoid hanging requests
    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.log('Request timeout reached. Sending 504 Gateway Timeout.');
        return res.status(504).json({
          success: false,
          message: 'Request processing took too long. Please try with a smaller limit or use filters.'
        });
      }
    }, 25000); // 25 second timeout
    
    // Performance optimization: Use lean() to get plain objects instead of Mongoose documents
    const agent = await Agent.findOne({
      _id: req.params.agentId,
      user: req.user._id
    }).lean();
    
    if (!agent) {
      clearTimeout(requestTimeout);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    console.log('Agent found, FAQs array type:', Array.isArray(agent.faqs));
    
    if (!agent.faqs || !Array.isArray(agent.faqs) || agent.faqs.length === 0) {
      clearTimeout(requestTimeout);
      return res.json({
        success: true,
        faqs: [],
        pagination: {
          total: 0,
          page: 1,
          limit: parseInt(req.query.limit) || 10,
          pages: 0
        },
        categories: [],
        categoryStats: {}
      });
    }
    
    console.log(`Total FAQs in database: ${agent.faqs.length}`);
    
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || '';
    
    console.log('Pagination parameters:', { page, limit, category });
    
    // Performance optimization: Use Set for unique categories
    const categories = Array.from(new Set(agent.faqs.map(faq => faq.category || 'Uncategorized')));
    
    // Performance optimization: Calculate category stats more efficiently
    const categoryStats = {};
    categories.forEach(cat => {
      categoryStats[cat] = agent.faqs.filter(faq => (faq.category || 'Uncategorized') === cat).length;
    });
    
    console.log(`Found ${categories.length} categories`);
    
    // Filter by category if specified
    let filteredFaqs = agent.faqs;
    if (category) {
      filteredFaqs = agent.faqs.filter(faq => faq.category === category);
      console.log(`Filtered to ${filteredFaqs.length} FAQs in category "${category}"`);
    }
    
    // Sort FAQs by creation date (newest first)
    filteredFaqs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Calculate pagination values
    const totalFaqs = filteredFaqs.length;
    const totalPages = Math.ceil(totalFaqs / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalFaqs);
    
    console.log('Pagination details:', {
      totalFaqs,
      totalPages,
      startIndex,
      endIndex,
      itemsReturned: endIndex - startIndex
    });
    
    // Get faqs for current page
    const paginatedFaqs = filteredFaqs.slice(startIndex, endIndex);
    
    console.log(`Returning ${paginatedFaqs.length} FAQs for page ${page}`);
    
    clearTimeout(requestTimeout);
    
    res.json({
      success: true,
      faqs: paginatedFaqs,
      pagination: {
        total: totalFaqs,
        page,
        limit,
        pages: totalPages
      },
      categories,
      categoryStats
    });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching FAQs',
      error: error.message
    });
  }
});

// Add a new FAQ
router.post('/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }

    const agent = await Agent.findOne({
      _id: req.params.agentId,
      user: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Get user with API key for embedding generation
    const user = await User.findById(req.user._id).select('+openaiApiKey');
    if (!user || !user.openaiApiKey) {
      return res.status(400).json({ 
        message: 'OpenAI API key not configured. Please add your API key in the settings.',
        error: 'OPENAI_KEY_MISSING'
      });
    }

    // Generate embedding for the question
    let embedding;
    try {
      embedding = await generateEmbedding(question, user.openaiApiKey);
    } catch (error) {
      return res.status(500).json({ 
        message: 'Error generating embedding for question',
        error: error.message
      });
    }

    // Add new FAQ with embedding
    const newFaq = {
      question,
      answer,
      vectorEmbedding: embedding,
      createdAt: new Date(),
      enabled: true
    };

    agent.faqs.push(newFaq);
    await agent.save();

    // Return the new FAQ without the embedding
    const savedFaq = agent.faqs[agent.faqs.length - 1];
    const faqResponse = {
      _id: savedFaq._id,
      question: savedFaq.question,
      answer: savedFaq.answer,
      createdAt: savedFaq.createdAt,
      enabled: savedFaq.enabled
    };

    res.status(201).json(faqResponse);
  } catch (error) {
    console.error('Error adding FAQ:', error);
    res.status(500).json({ message: 'Error adding FAQ', error: error.message });
  }
});

// Update an existing FAQ
router.put('/:faqId/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const { question, answer, enabled } = req.body;
    const { faqId, agentId } = req.params;

    if ((!question && !answer && enabled === undefined)) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Find the FAQ to update
    const faqIndex = agent.faqs.findIndex(faq => faq._id.toString() === faqId);
    if (faqIndex === -1) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    // Update fields if provided
    if (question !== undefined) {
      agent.faqs[faqIndex].question = question;
      
      // If question changed, update the embedding
      if (question !== agent.faqs[faqIndex].question) {
        // Get user with API key for embedding generation
        const user = await User.findById(req.user._id).select('+openaiApiKey');
        if (!user || !user.openaiApiKey) {
          return res.status(400).json({ 
            message: 'OpenAI API key not configured. Please add your API key in the settings.',
            error: 'OPENAI_KEY_MISSING'
          });
        }

        try {
          const embedding = await generateEmbedding(question, user.openaiApiKey);
          agent.faqs[faqIndex].vectorEmbedding = embedding;
        } catch (error) {
          return res.status(500).json({ 
            message: 'Error generating embedding for updated question',
            error: error.message
          });
        }
      }
    }
    
    if (answer !== undefined) {
      agent.faqs[faqIndex].answer = answer;
    }
    
    if (enabled !== undefined) {
      agent.faqs[faqIndex].enabled = enabled;
    }

    await agent.save();

    // Return the updated FAQ without the embedding
    const updatedFaq = {
      _id: agent.faqs[faqIndex]._id,
      question: agent.faqs[faqIndex].question,
      answer: agent.faqs[faqIndex].answer,
      createdAt: agent.faqs[faqIndex].createdAt,
      enabled: agent.faqs[faqIndex].enabled
    };

    res.json(updatedFaq);
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ message: 'Error updating FAQ', error: error.message });
  }
});

// Delete an FAQ
router.delete('/:faqId/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const { faqId, agentId } = req.params;

    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Find and remove the FAQ
    const faqIndex = agent.faqs.findIndex(faq => faq._id.toString() === faqId);
    if (faqIndex === -1) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    agent.faqs.splice(faqIndex, 1);
    await agent.save();

    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ message: 'Error deleting FAQ', error: error.message });
  }
});

// Generate embeddings for all FAQs (useful for migrating existing FAQs)
router.post('/generate-embeddings/:agentId', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.agentId,
      user: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Get user with API key for embedding generation
    const user = await User.findById(req.user._id).select('+openaiApiKey');
    if (!user || !user.openaiApiKey) {
      return res.status(400).json({ 
        message: 'OpenAI API key not configured. Please add your API key in the settings.',
        error: 'OPENAI_KEY_MISSING'
      });
    }

    const openai = new OpenAI({
      apiKey: user.openaiApiKey
    });

    // Process FAQs in batches
    const BATCH_SIZE = 20;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < agent.faqs.length; i += BATCH_SIZE) {
      const batch = agent.faqs.slice(i, i + BATCH_SIZE);
      const questionsToEmbed = [];
      const indicesWithoutEmbedding = [];
      
      // Prepare questions for embedding
      for (let j = 0; j < batch.length; j++) {
        if (!batch[j].vectorEmbedding) {
          questionsToEmbed.push(batch[j].question);
          indicesWithoutEmbedding.push(i + j);
        } else {
          skippedCount++;
        }
      }
      
      if (questionsToEmbed.length > 0) {
        // Generate embeddings for the batch
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: questionsToEmbed
        });
        
        // Update embeddings in agent object
        for (let k = 0; k < indicesWithoutEmbedding.length; k++) {
          const agentIndex = indicesWithoutEmbedding[k];
          agent.faqs[agentIndex].vectorEmbedding = response.data[k].embedding;
          updatedCount++;
        }
      }
    }

    await agent.save();

    res.json({ 
      message: 'FAQ embeddings generated successfully',
      stats: {
        total: agent.faqs.length,
        updated: updatedCount,
        skipped: skippedCount
      }
    });
  } catch (error) {
    console.error('Error generating FAQ embeddings:', error);
    res.status(500).json({ message: 'Error generating FAQ embeddings', error: error.message });
  }
});

// Bulk import FAQs
router.post('/bulk-import/:agentId', authenticateToken, async (req, res) => {
  try {
    const { faqs } = req.body;
    
    if (!Array.isArray(faqs) || faqs.length === 0) {
      return res.status(400).json({ message: 'Valid FAQ array is required' });
    }

    const agent = await Agent.findOne({
      _id: req.params.agentId,
      user: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Get user with API key for embedding generation
    const user = await User.findById(req.user._id).select('+openaiApiKey');
    if (!user || !user.openaiApiKey) {
      return res.status(400).json({ 
        message: 'OpenAI API key not configured. Please add your API key in the settings.',
        error: 'OPENAI_KEY_MISSING'
      });
    }

    const openai = new OpenAI({
      apiKey: user.openaiApiKey
    });

    // Process FAQs in batches
    const BATCH_SIZE = 20;
    const newFaqs = [];
    const errors = [];

    for (let i = 0; i < faqs.length; i += BATCH_SIZE) {
      const batch = faqs.slice(i, i + BATCH_SIZE);
      const questions = batch.map(faq => faq.question);
      
      try {
        // Generate embeddings for the batch
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: questions
        });
        
        // Create FAQs with embeddings
        for (let j = 0; j < batch.length; j++) {
          const { question, answer } = batch[j];
          
          if (!question || !answer) {
            errors.push({
              index: i + j,
              message: 'Question and answer are required',
              item: batch[j]
            });
            continue;
          }
          
          newFaqs.push({
            question,
            answer,
            vectorEmbedding: response.data[j].embedding,
            createdAt: new Date(),
            enabled: true
          });
        }
      } catch (error) {
        console.error(`Error processing batch ${i}:`, error);
        
        // If batch fails, add each item to errors
        for (let j = 0; j < batch.length; j++) {
          errors.push({
            index: i + j,
            message: 'Failed to generate embedding',
            error: error.message,
            item: batch[j]
          });
        }
      }
    }

    // Add new FAQs to the agent
    if (newFaqs.length > 0) {
      agent.faqs = agent.faqs.concat(newFaqs);
      await agent.save();
    }

    res.json({ 
      message: 'FAQs imported successfully',
      stats: {
        total: faqs.length,
        imported: newFaqs.length,
        failed: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing FAQs:', error);
    res.status(500).json({ message: 'Error importing FAQs', error: error.message });
  }
});

// Generate FAQs from knowledge base
router.post('/generate-from-kb/:agentId', authenticateToken, async (req, res) => {
  try {
    const agentId = req.params.agentId;
    
    // Store user from request
    const user = req.user;
    
    // Check if an existing job is already running
    const existingJob = await Job.findOne({
      agent: agentId,
      user: user._id,
      type: 'faq_generation',
      status: { $in: ['queued', 'processing'] }
    });
    
    if (existingJob) {
      return res.status(400).json({
        message: 'A generation job is already in progress for this agent',
        jobId: existingJob._id,
        status: existingJob.status
      });
    }
    
    // Try to find the agent
    const agent = await Agent.findOne({ _id: agentId, user: user._id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Get user with API key - explicitly select the openaiApiKey field
    const userWithKey = await User.findById(user._id).select('+openaiApiKey');
    console.log(`API key check: User ${user._id}, has key: ${!!userWithKey?.openaiApiKey}`);
    
    if (!userWithKey || !userWithKey.openaiApiKey) {
      return res.status(400).json({ message: 'OpenAI API key not configured. Please add your API key in Settings.' });
    }
    
    // Create a new job
    const job = await Job.create({
      user: user._id,
      agent: agentId,
      type: 'faq_generation',
      status: 'queued',
      progress: {
        processed: 0,
        total: 0,
        generated: 0,
        skipped: 0
      },
      startTime: new Date()
    });
    
    // Get knowledge base vectors from vectorStore instead of Vector model
    try {
      // Get vectors for this agent from the vector store
      const vectors = await vectorStore.getVectors({
        agentId: agentId.toString(),
        userId: user._id.toString()
      });

      console.log(`Found ${vectors.length} vectors in the vector store for agent ${agent.name}`);
      
      if (vectors.length === 0) {
        await updateJobStatus(job._id, 'error', 'No content found in knowledge base');
        return res.status(400).json({ message: 'No content found in knowledge base' });
      }
      
      // Return immediate response with job info
      res.json({
        message: 'FAQ generation started',
        jobId: job._id,
        status: 'queued',
        totalItems: vectors.length
      });

      // Update job with total item count
      await Job.findByIdAndUpdate(job._id, {
        $set: {
          'progress.total': vectors.length
        }
      });
      
      // Process vectors in the background 
      processVectorsInBackground(job, agentId, userWithKey._id, vectors, true, userWithKey.openaiApiKey);
    } catch (vectorError) {
      console.error('Error accessing vector store:', vectorError);
      await updateJobStatus(job._id, 'error', 'Error accessing knowledge base: ' + vectorError.message);
      return res.status(500).json({ 
        message: 'Error accessing knowledge base content', 
        error: vectorError.message 
      });
    }
    
  } catch (error) {
    console.error('Error starting FAQ generation:', error);
    res.status(500).json({ message: 'Error starting FAQ generation', error: error.message });
  }
});

// Update endpoint to check job status using Job model
router.get('/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      user: req.user._id
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json({
      jobId: job._id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      startTime: job.startTime,
      endTime: job.endTime,
      error: job.error,
      stats: job.stats,
      completed: ['completed', 'error'].includes(job.status)
    });
    
  } catch (error) {
    console.error('Error checking job status:', error);
    res.status(500).json({ message: 'Error checking job status', error: error.message });
  }
});

// List all jobs for the current user
router.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await Job.find({
      user: req.user._id
    }).sort({ startTime: -1 }).limit(20);
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Error fetching jobs', error: error.message });
  }
});

// Cancel a job
router.post('/job/:jobId/cancel', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      user: req.user._id
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Only cancel jobs that are in progress
    if (job.status !== 'queued' && job.status !== 'processing') {
      return res.status(400).json({ 
        message: 'Only active jobs can be cancelled',
        currentStatus: job.status
      });
    }
    
    // Update job status to cancelled
    job.status = 'cancelled';
    job.endTime = new Date();
    job.error = 'Job cancelled by user';
    await job.save();
    
    console.log(`Job ${job._id} cancelled by user ${req.user._id}`);
    
    res.json({
      message: 'Job cancelled successfully',
      job: {
        id: job._id,
        status: job.status,
        type: job.type,
        endTime: job.endTime
      }
    });
    
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ message: 'Error cancelling job', error: error.message });
  }
});

// Process vectors in the background with improved performance
async function processVectorsInBackground(job, agentId, userId, vectors, enableAutoGrouping, apiKey) {
  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      await updateJobStatus(job._id, 'error', 'Agent not found');
      return;
    }

    // Only get user if API key wasn't provided
    let openaiApiKey = apiKey;
    if (!openaiApiKey) {
      // Get user for OpenAI API key
      const user = await User.findById(userId).select('+openaiApiKey');
      if (!user) {
        console.error(`User not found: ${userId}`);
        await updateJobStatus(job._id, 'error', 'User not found');
        return;
      }
      
      if (!user.openaiApiKey) {
        console.error(`OpenAI API key not found for user: ${userId}`);
        await updateJobStatus(job._id, 'error', 'OpenAI API key not configured. Please add your API key in Settings.');
        return;
      }
      
      openaiApiKey = user.openaiApiKey;
    }
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });

    const batchSize = 10; // Larger batch size for better performance
    const totalItems = vectors.length;
    
    // Track processed documents to avoid parallel saves
    const processedDocIds = new Set();

    // Initialize counters
    let processedCount = 0;
    let generatedCount = 0;
    let skippedCount = 0;
    let startTime = Date.now();
    
    // Only log progress every 5%
    const progressLogThreshold = Math.max(1, Math.floor(totalItems * 0.05));
    let lastProgressLog = 0;

    // Process in batches
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      
      // Improve batch info display to avoid "Unknown (undefined)"
      const batchItems = `Items ${i+1}-${Math.min(i+batchSize, vectors.length)} of ${vectors.length}`;
      
      // Only log if significant progress made
      if (processedCount - lastProgressLog >= progressLogThreshold) {
        console.log(`Processing batch ${i+1} to ${Math.min(i+batchSize, vectors.length)} of ${vectors.length}`);
        lastProgressLog = processedCount;
      }
      
      // Update job progress
      await Job.findByIdAndUpdate(job._id, {
        $set: {
          status: 'processing',
          'progress.processed': processedCount,
          'progress.total': totalItems,
          'progress.generated': generatedCount,
          'progress.skipped': skippedCount,
          'progress.currentBatch': batchItems
        }
      });

      // Process vectors in parallel with safe batching
      const batchPromises = batch.map(async (vector) => {
        // Skip if already processed in this run to avoid parallel saves
        const vectorId = vector._id ? vector._id.toString() : 
                      vector.id ? vector.id.toString() : 
                      `unnamed-${Math.random().toString(36).substring(2, 10)}`;
        
        if (processedDocIds.has(vectorId)) {
          return null; // Skip this vector
        }
        
        processedDocIds.add(vectorId);
        
        try {
          const text = vector.text || vector.content || vector.pageContent || '';
          const title = vector.title || vector.metadata?.title || vector.metadata?.source || 'Unknown Source';
          
          if (!text || text.length < 100) {
            return { skipped: true, vectorId }; // Skip insufficient content
          }
          
          // Generate FAQ using OpenAI
          const prompt = `Based on the following content, create 1-3 frequently asked questions and their answers. 
          Focus on the most important information that a user might want to know.
          Content: "${text.slice(0, 7000)}"
          
          Format each FAQ as:
          Q: [question]
          A: [detailed answer]`;
          
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-16k',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
          });
          
          const responseText = completion.choices[0].message.content;
          const faqMatches = responseText.match(/Q: (.+?)[\n\r]+A: (.+?)(?=[\n\r]+Q:|$)/gs);
          
          if (!faqMatches || faqMatches.length === 0) {
            return { skipped: true, vectorId }; // No FAQs generated
          }
          
          // Extract FAQs and prepare for batch insert
          const extractedFaqs = [];
          
          for (const faqMatch of faqMatches) {
            const questionMatch = faqMatch.match(/Q: (.+?)[\n\r]+/);
            const answerMatch = faqMatch.match(/A: (.+?)$/s);
            
            if (questionMatch && answerMatch) {
              const question = questionMatch[1].trim();
              const answer = answerMatch[1].trim();
              
              if (question && answer) {
                // Generate embedding for the question
                let vectorEmbedding;
                try {
                  vectorEmbedding = await generateEmbedding(question, openaiApiKey);
                } catch (embeddingError) {
                  console.error('Error generating embedding:', embeddingError);
                  continue; // Skip this FAQ if embedding fails
                }
                
                // Create source metadata
                const source = vector.metadata?.source || vector.source || title;
                const sourceMetadata = {
                  vectorId: vectorId,
                  source: source,
                  title: vector.metadata?.title || vector.title || source,
                  url: vector.metadata?.url || '',
                };
                
                // Simple category assignment without extra API call
                const category = 'General';
                
                // Create FAQ object
                extractedFaqs.push({
                  question,
                  answer,
                  enabled: true,
                  source: title,
                  sourceType: 'generated',
                  knowledgeBaseItemId: vectorId,
                  category,
                  sourceMetadata,
                  vectorEmbedding
                });
              }
            }
          }
          
          return { 
            faqs: extractedFaqs, 
            count: extractedFaqs.length,
            vectorId 
          };
        } catch (error) {
          console.error(`Error processing vector ${vectorId}:`, error);
          return { error: true, vectorId }; // Mark as error
        }
      });
      
      // Wait for all batch promises to complete
      const results = await Promise.all(batchPromises);
      
      // Process results and collect FAQs for batch insertion
      const allNewFaqs = [];
      
      for (const result of results) {
        if (!result) continue; // Skip null results
        
        if (result.skipped) {
          skippedCount++;
        } else if (result.error) {
          skippedCount++;
        } else if (result.faqs) {
          allNewFaqs.push(...result.faqs);
          generatedCount += result.count;
        }
        
        processedCount++;
      }
      
      // Batch insert FAQs if we have any
      if (allNewFaqs.length > 0) {
        try {
          // Use $push with $each for efficient batch insertion
          await Agent.findByIdAndUpdate(
            agentId,
            { $push: { faqs: { $each: allNewFaqs } } },
            { new: false } // Don't need the updated document
          );
        } catch (updateError) {
          console.error('Error saving batch of FAQs:', updateError);
        }
      }
      
      // Update job with progress after each batch
      if (results.length > 0) {
        await Job.findByIdAndUpdate(job._id, {
          $set: {
            'progress.processed': processedCount,
            'progress.generated': generatedCount,
            'progress.skipped': skippedCount
          }
        });
      }
    }
    
    // Update job with final stats
    const endTime = Date.now();
    await Job.findByIdAndUpdate(job._id, {
      $set: {
        status: 'completed',
        endTime: new Date(),
        'progress.processed': processedCount,
        'progress.total': totalItems,
        'progress.generated': generatedCount,
        'progress.skipped': skippedCount,
        'progress.currentBatch': null,
        stats: {
          elapsedTimeMs: endTime - startTime,
          generatedCount,
          skippedCount
        }
      }
    });
    
    console.log(`FAQ generation completed: ${generatedCount} FAQs generated from ${totalItems} vectors`);
  } catch (error) {
    console.error('Error in background processing:', error);
    await updateJobStatus(job._id, 'error', error.message);
  }
}

// Helper function to update job status
async function updateJobStatus(jobId, status, errorMessage = null) {
  try {
    const update = {
      status: status,
      endTime: new Date()
    };
    
    if (errorMessage) {
      update.error = errorMessage;
    }
    
    await Job.findByIdAndUpdate(jobId, { $set: update });
  } catch (err) {
    console.error('Error updating job status:', err);
  }
}

// Delete all FAQs for an agent
router.delete('/all/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log(`Delete all FAQs endpoint hit for agent: ${agentId}, user: ${req.user._id}`);

    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user._id
    });

    if (!agent) {
      console.log(`Agent not found: ${agentId} for user: ${req.user._id}`);
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Clear all FAQs
    const previousCount = agent.faqs.length;
    console.log(`Deleting ${previousCount} FAQs for agent: ${agent.name} (${agent._id})`);
    agent.faqs = [];
    await agent.save();
    console.log(`Successfully deleted ${previousCount} FAQs`);

    res.json({ 
      message: 'All FAQs deleted successfully',
      deletedCount: previousCount
    });
  } catch (error) {
    console.error('Error deleting all FAQs:', error);
    res.status(500).json({ message: 'Error deleting all FAQs', error: error.message });
  }
});

// Delete all FAQs for an agent (alternative endpoint)
router.delete('/deleteAll/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log(`Delete all FAQs endpoint hit (alternative route) for agent: ${agentId}, user: ${req.user._id}`);

    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user._id
    });

    if (!agent) {
      console.log(`Agent not found: ${agentId} for user: ${req.user._id}`);
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Clear all FAQs
    const previousCount = agent.faqs.length;
    console.log(`Deleting ${previousCount} FAQs for agent: ${agent.name} (${agent._id})`);
    agent.faqs = [];
    await agent.save();
    console.log(`Successfully deleted ${previousCount} FAQs`);

    res.json({ 
      message: 'All FAQs deleted successfully',
      deletedCount: previousCount
    });
  } catch (error) {
    console.error('Error deleting all FAQs:', error);
    res.status(500).json({ message: 'Error deleting all FAQs', error: error.message });
  }
});

module.exports = router; 