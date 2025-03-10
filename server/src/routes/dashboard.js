const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Agent = require('../models/Agent');
const ApiUsage = require('../models/ApiUsage');

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get counts for the current user
    const [agents, apiUsage] = await Promise.all([
      Agent.find({ user: req.user._id }),
      ApiUsage.find({ user: req.user._id })
    ]);

    const totalAgents = agents.length;
    const totalChats = agents.reduce((sum, agent) => sum + (agent.chats || 0), 0);
    const totalKnowledgeBase = agents.reduce((sum, agent) => sum + agent.knowledgeBase.length, 0);

    // Calculate API usage percentage (example: based on monthly limit)
    const monthlyLimit = 1000000; // 1M tokens per month
    const currentUsage = apiUsage.reduce((sum, usage) => sum + usage.totalTokens, 0);
    const apiUsagePercentage = Math.min(Math.round((currentUsage / monthlyLimit) * 100), 100);

    res.json({
      totalAgents,
      totalChats,
      totalKnowledgeBase,
      apiUsage: apiUsagePercentage
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Get recent activity
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    // Get recent agents and API usage
    const [recentAgents, recentApiUsage] = await Promise.all([
      Agent.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5),
      ApiUsage.find({ user: req.user._id })
        .sort({ timestamp: -1 })
        .limit(5)
    ]);

    // Combine and format activities
    const activities = [
      ...recentAgents.map(agent => ({
        type: 'agent',
        description: `Created agent: ${agent.name}`,
        timestamp: agent.createdAt
      })),
      ...recentApiUsage.map(usage => ({
        type: 'chat',
        description: `Chat session with ${usage.tokens} tokens used`,
        timestamp: usage.timestamp
      }))
    ];

    // Sort by timestamp and limit to 10 most recent activities
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivity = activities.slice(0, 10);

    res.json(recentActivity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
});

module.exports = router; 