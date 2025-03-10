import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from 'axios';
import { toast } from 'react-toastify';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function UsageStats() {
  const [usageStats, setUsageStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [currentTab, setCurrentTab] = useState(0);
  const [agentStats, setAgentStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchUsageStats(),
        fetchAgents(),
        fetchAgentStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/chat/usage`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsageStats(response.data);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      toast.error('Failed to fetch usage statistics');
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/agents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to fetch agents');
    }
  };

  const fetchAgentStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/chat/usage/agents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAgentStats(response.data);
    } catch (error) {
      console.error('Error fetching agent stats:', error);
      toast.error('Failed to fetch agent statistics');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleAgentChange = (event) => {
    setSelectedAgent(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const getFilteredData = () => {
    if (!agentStats || selectedAgent === 'all') return usageStats?.dailyUsage;
    return agentStats[selectedAgent]?.dailyUsage || [];
  };

  const getCurrentStats = () => {
    if (selectedAgent === 'all') return usageStats;
    return agentStats?.[selectedAgent];
  };

  const getAgentDistributionData = () => {
    if (!agentStats) return [];
    return Object.entries(agentStats).map(([agentId, stats]) => ({
      name: agents.find(a => a._id === agentId)?.name || 'Unknown Agent',
      value: stats.totalRequests
    }));
  };

  const currentStats = getCurrentStats();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Usage Statistics
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          select
          label="Select Agent"
          value={selectedAgent}
          onChange={handleAgentChange}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All Agents</MenuItem>
          {agents.map((agent) => (
            <MenuItem key={agent._id} value={agent._id}>
              {agent.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Total Tokens</Typography>
                    <Typography variant="h4">{currentStats?.totalTokens?.toLocaleString() || 0}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Total Requests</Typography>
                    <Typography variant="h4">{currentStats?.totalRequests?.toLocaleString() || 0}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Total Cost</Typography>
                    <Typography variant="h4">${currentStats?.totalCost?.toFixed(2) || '0.00'}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={currentTab} onChange={handleTabChange}>
                  <Tab label="Usage Over Time" />
                  <Tab label="Agent Distribution" />
                </Tabs>
              </Box>

              {currentTab === 0 ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    Daily Usage
                  </Typography>
                  
                  <Box sx={{ height: 300, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getFilteredData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                        />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          labelFormatter={formatDate}
                          formatter={(value) => [value.toLocaleString(), '']}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="tokens"
                          stroke="#8884d8"
                          name="Tokens"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="requests"
                          stroke="#82ca9d"
                          name="Requests"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Usage Distribution by Agent
                  </Typography>
                  
                  <Box sx={{ height: 300, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getAgentDistributionData()}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => entry.name}
                        >
                          {getAgentDistributionData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value.toLocaleString(), 'Requests']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default UsageStats; 