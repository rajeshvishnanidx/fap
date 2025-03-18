const express = require('express');
const Agent = require('../models/Agent');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Create new agent
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      appearance,
      behavior,
      settings,
      widgetSettings,
    } = req.body;

    const agent = new Agent({
      user: req.user._id,
      name,
      description,
      appearance,
      behavior,
      settings,
      widgetSettings,
    });

    await agent.save();

    res.status(201).json({
      agent,
      widgetScript: agent.generateWidgetScript(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating agent', error: error.message });
  }
});

// Get all agents for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('GET /agents - Request received');
    
    // Fetch real agents directly - no dev mode check
    console.log('Fetching agents for user:', req.user._id);
    const fields = req.query.fields ? req.query.fields.split(',') : null;
    let query = { user: req.user._id }; // Fixed from userId to user to match schema
    
    if (req.query.active) {
      query.active = req.query.active === 'true';
    }
    
    let projection = {};
    if (fields) {
      fields.forEach(field => {
        projection[field] = 1;
      });
    }
    
    const agents = await Agent.find(query, projection).sort({ createdAt: -1 });
    console.log(`Found ${agents.length} agents for user`);
    
    // Return the agents (empty array if none found)
    return res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agents',
      error: error.message
    });
  }
});

// Get single agent
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('GET /agents/:id called with ID:', req.params.id);
    console.log('Authenticated user:', req.user._id);

    const agent = await Agent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    console.log('Found agent:', agent);

    if (!agent) {
      console.log('Agent not found');
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Log the response data
    const responseData = {
      _id: agent._id,
      name: agent.name,
      description: agent.description,
      appearance: agent.appearance,
      behavior: agent.behavior,
      settings: agent.settings
    };
    console.log('Sending response:', responseData);

    // Return just the agent data
    res.json(responseData);
  } catch (error) {
    console.error('Error in GET /agents/:id:', error);
    res.status(500).json({ message: 'Error fetching agent', error: error.message });
  }
});

// Update agent
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      appearance,
      behavior,
      settings,
      widgetSettings,
    } = req.body;

    const agent = await Agent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Update fields
    agent.name = name || agent.name;
    agent.description = description || agent.description;
    agent.appearance = appearance || agent.appearance;
    agent.behavior = behavior || agent.behavior;
    agent.settings = settings || agent.settings;
    agent.widgetSettings = widgetSettings || agent.widgetSettings;

    await agent.save();

    res.json({
      agent,
      widgetScript: agent.generateWidgetScript(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating agent', error: error.message });
  }
});

// Delete agent
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting agent', error: error.message });
  }
});

// Add knowledge base item
router.post('/:id/knowledge', authenticateToken, async (req, res) => {
  try {
    const { type, source } = req.body;

    const agent = await Agent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Add knowledge base item
    agent.knowledgeBase.push({
      type,
      source,
      addedAt: new Date(),
    });

    await agent.save();

    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'Error adding knowledge base item', error: error.message });
  }
});

// Remove knowledge base item
router.delete('/:id/knowledge/:itemId', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Remove knowledge base item
    agent.knowledgeBase = agent.knowledgeBase.filter(
      (item) => item._id.toString() !== req.params.itemId
    );

    await agent.save();

    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'Error removing knowledge base item', error: error.message });
  }
});

// Toggle agent active status
router.post('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.isActive = !agent.isActive;
    await agent.save();

    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling agent status', error: error.message });
  }
});

module.exports = router; 