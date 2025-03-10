const express = require('express');
const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const Agent = require('../models/Agent');
const DocumentProcessor = require('../utils/documentProcessor');
const vectorStore = require('../utils/vectorStore');
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only TXT, PDF, DOC, and DOCX files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Ensure uploads directory exists
const createUploadsDir = async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};
createUploadsDir();

// Scrape website content
router.post('/scrape', authenticateToken, async (req, res) => {
  try {
    const { url, agentId } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    // Find agent
    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Create custom HTTPS agent
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Be careful with this in production
      keepAlive: true,
      timeout: 60000,
    });

    // Fetch website content with enhanced configuration
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
      },
      httpsAgent,
      timeout: 60000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Accept all status codes less than 500
      },
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script, style, meta, link').remove();

    // Extract text content with better selection
    const content = [];
    $('body').find('*').each((_, element) => {
      if (element.type === 'text' || $(element).is('p, h1, h2, h3, h4, h5, h6, li, td, th, div')) {
        const text = $(element).text().trim();
        if (text && text.length > 20) { // Only keep meaningful content
          content.push(text);
        }
      }
    });

    // Remove duplicate content
    const uniqueContent = [...new Set(content)];

    // Join content and split into chunks
    const text = uniqueContent.join('\n\n');
    
    if (!text) {
      return res.status(400).json({ message: 'No meaningful content found on the page' });
    }

    const chunks = await DocumentProcessor.splitIntoChunks(text);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Use environment variable instead of user key
    });

    // Generate embeddings for each chunk
    const embeddings = [];
    for (const chunk of chunks) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunk,
      });
      embeddings.push(response.data[0].embedding);
    }

    // Store in vector database
    const timestamp = new Date().toISOString();
    await vectorStore.upsertVectors(embeddings, {
      agentId: agent._id.toString(),
      userId: req.user._id.toString(),
      type: 'website',
      source: url,
      timestamp,
      texts: chunks,
    });

    // Add to agent's knowledge base
    agent.knowledgeBase.push({
      type: 'website',
      source: url,
      addedAt: timestamp,
    });

    await agent.save();

    res.json({
      message: 'Website content scraped and processed successfully',
      contentLength: chunks.length,
    });
  } catch (error) {
    console.error('Scraping error:', error);
    
    let errorMessage = 'Error scraping website';
    if (error.code === 'ECONNRESET') {
      errorMessage = 'The website actively blocked our request. This can happen if the website has strong security measures or anti-scraping protection.';
    } else if (error.response) {
      // Handle axios error responses
      if (error.response.status === 403) {
        errorMessage = 'Access to the website is forbidden. The website might be blocking scraping attempts.';
      } else if (error.response.status === 404) {
        errorMessage = 'The webpage could not be found. Please check the URL.';
      } else if (error.response.status === 429) {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.response.status >= 500) {
        errorMessage = 'The website server encountered an error. Please try again later.';
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'The request timed out. The website might be too slow or blocking our request.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Could not connect to the website. Please check the URL and your internet connection.';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: error.message,
      suggestion: 'If this persists, try using a different URL or uploading a file instead.'
    });
  }
});

// Process uploaded file
router.post('/process-file', authenticateToken, upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    filePath = req.file.path;
    console.log('Starting file processing:', {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: filePath
    });
    
    const { agentId } = req.body;
    if (!agentId) {
      throw new Error('Agent ID is required');
    }
    
    // Find agent
    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user._id,
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Process file based on type
    let fileContent = '';
    try {
      console.log('Processing file content...');
      fileContent = await DocumentProcessor.processFile(filePath, req.file.mimetype);
      
      // Verify we got meaningful content
      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error('No meaningful text content could be extracted from the file');
      }
      
      console.log('Successfully extracted content, length:', fileContent.length);
    } catch (error) {
      console.error('Error in document processing:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }

    // Split content into chunks
    let chunks = [];
    try {
      console.log('Splitting content into chunks...');
      chunks = await DocumentProcessor.splitIntoChunks(fileContent);
      console.log('Split content into', chunks.length, 'chunks');
    } catch (error) {
      console.error('Error in content chunking:', error);
      throw new Error(`Content chunking failed: ${error.message}`);
    }

    // Generate embeddings
    let embeddings = [];
    try {
      console.log('Generating embeddings...');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      for (let i = 0; i < chunks.length; i++) {
        console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`);
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunks[i],
        });
        embeddings.push(response.data[0].embedding);
      }
      console.log('Generated embeddings for all chunks');
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }

    // Store in vector database
    try {
      console.log('Storing vectors in Pinecone...');
      const timestamp = new Date().toISOString();
      const metadata = {
        agentId: agent._id.toString(),
        userId: req.user._id.toString(),
        type: 'file',
        source: req.file.originalname,
        timestamp,
        texts: chunks,
      };

      console.log('Upserting vectors with metadata:', {
        agentId: metadata.agentId,
        type: metadata.type,
        source: metadata.source,
        chunksCount: chunks.length,
        vectorDimension: embeddings[0].length
      });

      await vectorStore.upsertVectors(embeddings, metadata);
      console.log('Successfully stored vectors in Pinecone');

      // Add to agent's knowledge base
      agent.knowledgeBase.push({
        type: 'file',
        source: req.file.originalname,
        addedAt: timestamp,
      });

      await agent.save();
      console.log('Updated agent knowledge base');
    } catch (error) {
      console.error('Error storing vectors:', error);
      throw new Error(`Vector storage failed: ${error.message}`);
    }

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
      console.log('Cleaned up uploaded file');
    } catch (error) {
      console.error('Error cleaning up file:', error);
      // Don't throw here, as the main operation succeeded
    }

    res.json({
      message: 'File processed successfully',
      fileName: req.file.originalname,
      contentLength: fileContent.length,
      chunks: chunks.length,
      vectorDimension: embeddings[0].length
    });
  } catch (error) {
    console.error('File processing failed:', error);
    
    // Clean up uploaded file if there's an error
    if (filePath) {
      try {
        await fs.unlink(filePath);
        console.log('Cleaned up file after error');
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    // Send detailed error response
    res.status(500).json({ 
      message: 'Error processing file',
      error: error.message,
      details: error.stack
    });
  }
});

// Get knowledge base items for an agent
router.get('/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.agentId,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(agent.knowledgeBase);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching knowledge base', error: error.message });
  }
});

// Delete knowledge base item
router.delete('/:itemId/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.agentId,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Get the item to be deleted
    const item = agent.knowledgeBase.find(
      (item) => item._id.toString() === req.params.itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Knowledge base item not found' });
    }

    // Delete vectors from vector store
    await vectorStore.deleteVectors({
      agentId: agent._id.toString(),
      userId: req.user._id.toString(),
      type: item.type,
      source: item.source,
    });

    // Remove item from agent's knowledge base
    agent.knowledgeBase = agent.knowledgeBase.filter(
      (item) => item._id.toString() !== req.params.itemId
    );

    await agent.save();

    res.json({ message: 'Knowledge base item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting knowledge base item', error: error.message });
  }
});

module.exports = router; 