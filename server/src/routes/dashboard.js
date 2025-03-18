const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Agent = require('../models/Agent');
const ApiUsage = require('../models/ApiUsage');

// Helper function to validate date objects or timestamps
function ensureValidDate(dateValue) {
  if (!dateValue) return new Date();
  
  try {
    const date = new Date(dateValue);
    // Check if the date is valid
    return isNaN(date.getTime()) ? new Date() : date;
  } catch (error) {
    console.error('Invalid date value:', dateValue, error);
    return new Date();
  }
}

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.time('dashboard-stats'); // Add performance timing
    console.log(`Fetching dashboard stats for user: ${req.user._id}`);
    
    // Get counts for the current user - optimize agent query to only get counts
    const agentPromise = Agent.find(
      { user: req.user._id }, 
      { name: 1, chats: 1, 'knowledgeBase.length': 1 }
    ).lean(); // Use lean() for better performance
    
    // Calculate API usage for current month only
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const apiUsagePromise = ApiUsage.aggregate([
      { $match: { 
        user: req.user._id,
        date: { $gte: startOfMonth }
      }},
      { $group: {
        _id: null, 
        totalTokens: { $sum: '$tokenCount' } 
      }}
    ]).exec();
    
    // Execute both queries in parallel
    const [agents, apiUsageResults] = await Promise.all([agentPromise, apiUsagePromise]);

    const totalAgents = agents.length;
    const totalChats = agents.reduce((sum, agent) => sum + (agent.chats || 0), 0);
    const totalKnowledgeBase = agents.reduce((sum, agent) => {
      return sum + (agent.knowledgeBase ? agent.knowledgeBase.length : 0);
    }, 0);

    // Calculate API usage percentage (example: based on monthly limit)
    const monthlyLimit = 1000000; // 1M tokens per month
    const currentUsage = apiUsageResults.length > 0 ? apiUsageResults[0].totalTokens : 0;
    const apiUsagePercentage = Math.min(Math.round((currentUsage / monthlyLimit) * 100), 100);

    console.timeEnd('dashboard-stats'); // Log performance timing
    
    res.json({
      totalAgents,
      totalChats,
      totalKnowledgeBase,
      apiUsage: apiUsagePercentage,
      rawTokenCount: currentUsage // Include raw count for debugging
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Get recent activity
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    console.time('dashboard-activity'); // Add performance timing
    
    // Get recent agents and API usage - limit fields to only what's needed
    const recentAgents = Agent.find(
      { user: req.user._id },
      { name: 1, createdAt: 1 }
    )
    .sort({ createdAt: -1 })
    .limit(5)
    .lean(); // Use lean() for better performance
    
    // Get API usage from the last 7 days only
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentApiUsage = ApiUsage.find(
      { 
        user: req.user._id,
        date: { $gte: sevenDaysAgo }
      },
      { tokenCount: 1, date: 1, agent: 1 }
    )
    .sort({ date: -1 })
    .limit(5)
    .lean(); // Use lean() for better performance
    
    // Execute queries in parallel
    const [agents, usage] = await Promise.all([recentAgents, recentApiUsage]);

    // Combine and format activities with validation for timestamps
    const activities = [
      ...agents.map(agent => ({
        type: 'agent',
        description: `Created agent: ${agent.name}`,
        timestamp: ensureValidDate(agent.createdAt).toISOString()
      })),
      ...usage.map(usage => ({
        type: 'chat',
        description: `Chat session with ${usage.tokenCount || 0} tokens used`,
        timestamp: ensureValidDate(usage.date).toISOString()
      }))
    ];

    // Sort by timestamp and limit to 10 most recent activities
    activities.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    });
    
    const recentActivity = activities.slice(0, 10);
    
    console.timeEnd('dashboard-activity'); // Log performance timing

    res.json(recentActivity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
});

module.exports = router; 