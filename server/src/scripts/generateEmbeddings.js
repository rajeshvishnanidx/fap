/**
 * Script to generate embeddings for all knowledge base content and FAQs
 * 
 * Usage: 
 * 1. Make sure MongoDB is running and environment variables are set
 * 2. Run: node generateEmbeddings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { OpenAI } = require('openai');
const Agent = require('../models/Agent');
const User = require('../models/User');
const vectorStore = require('../utils/vectorStore');
const DocumentProcessor = require('../utils/documentProcessor');

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  processAgents();
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

/**
 * Process all agents in the database
 */
async function processAgents() {
  try {
    const agents = await Agent.find({});
    console.log(`Found ${agents.length} agents to process`);
    
    for (const agent of agents) {
      console.log(`\nProcessing agent: ${agent.name} (${agent._id})`);
      await processKnowledgeBase(agent);
      await processFaqs(agent);
    }
    
    console.log('\nAll processing complete! Exiting...');
    process.exit(0);
    
  } catch (error) {
    console.error('Error processing agents:', error);
    process.exit(1);
  }
}

/**
 * Process knowledge base for an agent
 * @param {Object} agent The agent object
 */
async function processKnowledgeBase(agent) {
  try {
    // Count items without vector embeddings in knowledge base
    const knowledgeBaseItems = agent.knowledgeBase || [];
    console.log(`Agent has ${knowledgeBaseItems.length} knowledge base items`);
    
    // Here we could re-process specific knowledge base items if needed
    // For example, files or websites that haven't been properly processed

    console.log('Knowledge base processing complete');
    
  } catch (error) {
    console.error(`Error processing knowledge base for agent ${agent._id}:`, error);
  }
}

/**
 * Process FAQs for an agent
 * @param {Object} agent The agent object
 */
async function processFaqs(agent) {
  try {
    const faqs = agent.faqs || [];
    console.log(`Agent has ${faqs.length} FAQs`);
    
    if (faqs.length === 0) {
      console.log('No FAQs to process');
      return;
    }
    
    // Filter FAQs without embeddings
    const faqsWithoutEmbeddings = faqs.filter(faq => !faq.vectorEmbedding);
    console.log(`Found ${faqsWithoutEmbeddings.length} FAQs without embeddings`);
    
    if (faqsWithoutEmbeddings.length === 0) {
      console.log('All FAQs already have embeddings');
      return;
    }
    
    // Process FAQs in batches
    const BATCH_SIZE = 20;
    let processed = 0;
    
    for (let i = 0; i < faqsWithoutEmbeddings.length; i += BATCH_SIZE) {
      const batch = faqsWithoutEmbeddings.slice(i, i + BATCH_SIZE);
      const questions = batch.map(faq => faq.question);
      
      console.log(`Processing batch of ${batch.length} FAQs...`);
      
      try {
        // Generate embeddings for the batch
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: questions
        });
        
        // Update embeddings in agent
        for (let j = 0; j < batch.length; j++) {
          const faqToUpdate = faqs.find(f => f._id.toString() === batch[j]._id.toString());
          if (faqToUpdate) {
            faqToUpdate.vectorEmbedding = response.data[j].embedding;
            processed++;
          }
        }
        
        console.log(`Processed ${batch.length} FAQs`);
        
      } catch (error) {
        console.error(`Error processing batch:`, error);
      }
    }
    
    // Save the updated agent
    if (processed > 0) {
      await agent.save();
      console.log(`Saved ${processed} FAQ embeddings`);
    }
    
  } catch (error) {
    console.error(`Error processing FAQs for agent ${agent._id}:`, error);
  }
}

/**
 * Re-process a specific knowledge base item
 * @param {Object} agent The agent object
 * @param {Object} item Knowledge base item to process
 */
async function reprocessKnowledgeBaseItem(agent, item) {
  try {
    console.log(`Reprocessing ${item.type} from ${item.source}...`);
    
    // Implementation depends on how knowledge base items are stored
    // and processed in your application
    
    // Example for a website item:
    if (item.type === 'website') {
      // Fetch content, split, generate embeddings, etc.
      console.log(`Reprocessing website ${item.source} not implemented`);
    }
    // Example for a file item:
    else if (item.type === 'file') {
      console.log(`Reprocessing file ${item.source} not implemented`);
    }
    
  } catch (error) {
    console.error(`Error reprocessing item:`, error);
  }
} 