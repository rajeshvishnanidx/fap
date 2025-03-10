import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  LinearProgress,
  Paper,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  SmartToy as AgentIcon,
  Chat as ChatIcon,
  Storage as StorageIcon,
  QueryStats as StatsIcon,
  ArrowForward as ArrowForwardIcon,
  Message as MessageIcon,
  Upload as UploadIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalChats: 0,
    totalKnowledgeBase: 0,
    apiUsage: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Fetching dashboard data...');
      const [statsResponse, activityResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/dashboard/stats`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          validateStatus: function (status) {
            return status < 500; // Resolve only if the status code is less than 500
          }
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/dashboard/activity`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          validateStatus: function (status) {
            return status < 500; // Resolve only if the status code is less than 500
          }
        }),
      ]);

      // Check if either request failed
      if (statsResponse.status !== 200 || activityResponse.status !== 200) {
        throw new Error('Failed to fetch dashboard data');
      }

      console.log('Stats response:', statsResponse.data);
      console.log('Activity response:', activityResponse.data);

      setStats(statsResponse.data);
      setRecentActivity(activityResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error.response || error);
      setError(
        error.response?.data?.message || 
        'Failed to load dashboard data. Please check if the server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create New Agent',
      description: 'Build a custom AI agent for your needs',
      icon: <AgentIcon />,
      action: () => navigate('/agent-builder'),
      color: '#2563eb',
    },
    {
      title: 'Start Chat',
      description: 'Chat with your existing AI agents',
      icon: <ChatIcon />,
      action: () => navigate('/chat'),
      color: '#7c3aed',
    },
    {
      title: 'Add Knowledge',
      description: 'Expand your agents\' knowledge base',
      icon: <UploadIcon />,
      action: () => navigate('/knowledge-base'),
      color: '#059669',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
          Loading dashboard data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchDashboardData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AgentIcon sx={{ fontSize: 40, mr: 1 }} />
                  <Typography variant="h4">{stats.totalAgents}</Typography>
                </Box>
                <Typography variant="subtitle1">Active Agents</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #7c3aed 30%, #8b5cf6 90%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ChatIcon sx={{ fontSize: 40, mr: 1 }} />
                  <Typography variant="h4">{stats.totalChats}</Typography>
                </Box>
                <Typography variant="subtitle1">Total Chats</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #059669 30%, #10b981 90%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon sx={{ fontSize: 40, mr: 1 }} />
                  <Typography variant="h4">{stats.totalKnowledgeBase}</Typography>
                </Box>
                <Typography variant="subtitle1">Knowledge Base Items</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #dc2626 30%, #ef4444 90%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StatsIcon sx={{ fontSize: 40, mr: 1 }} />
                  <Typography variant="h4">{stats.apiUsage}%</Typography>
                </Box>
                <Typography variant="subtitle1">API Usage</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions and Recent Activity */}
        <Grid item xs={12} container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={3}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 3,
                        },
                      }}
                      onClick={action.action}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 2,
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: action.color,
                              width: 48,
                              height: 48,
                            }}
                          >
                            {action.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              {action.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {action.description}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Recent Activity</Typography>
                <Button
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/usage-stats')}
                >
                  View All
                </Button>
              </Box>
              <List>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor:
                              activity.type === 'chat'
                                ? '#2563eb'
                                : activity.type === 'agent'
                                ? '#7c3aed'
                                : '#059669',
                          }}
                        >
                          {activity.type === 'chat' ? (
                            <MessageIcon />
                          ) : activity.type === 'agent' ? (
                            <AgentIcon />
                          ) : (
                            <StorageIcon />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.description}
                        secondary={format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard; 