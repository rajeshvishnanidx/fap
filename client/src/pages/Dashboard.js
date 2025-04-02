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
  Snackbar,
  CircularProgress
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
  Assessment as AssessmentIcon,
  Api as ApiIcon,
  Event as EventIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format, isValid, formatDistance } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalChats: 0,
    totalKnowledgeBase: 0,
    apiUsage: 0,
  });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchTimings, setFetchTimings] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper function to safely format dates
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = new Date(timestamp);
    return isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : 'Invalid date';
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setSnackbarOpen(false);
      console.log('Fetching dashboard data...');
      
      const startTime = performance.now();
      
      // Fetch stats separately
      const fetchStats = async () => {
        try {
          setStatsLoading(true);
          setError(null);
          
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('No authentication token found');
            navigate('/login');
            return;
          }
          
          console.log('Fetching dashboard stats with token:', token ? 'Token exists' : 'No token');
          
          // Use explicit URL instead of environment variable
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/dashboard/stats`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
            validateStatus: function(status) {
              return status < 500; // Don't reject on 4xx responses
            }
          });
          
          console.log('Dashboard stats API response status:', response.status);
          console.log('Dashboard stats API response:', response.data);
          
          if (response.status === 200) {
            setStats(response.data);
            console.log('Updated dashboard stats:', response.data);
          } else {
            throw new Error('Failed to fetch dashboard stats');
          }
        } catch (error) {
          console.error('Error fetching dashboard stats:', error);
          setError('Failed to load dashboard data');
        } finally {
          setStatsLoading(false);
        }
      };
      
      // Fetch activity separately
      const fetchActivity = async () => {
        setActivityLoading(true);
        const activityStart = performance.now();
        try {
          const token = localStorage.getItem('token');
          
          if (!token) {
            navigate('/login');
            return;
          }

          const response = await axios.get(`${process.env.REACT_APP_API_URL}/dashboard/activity`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            validateStatus: function (status) {
              return status < 500; // Resolve only if the status code is less than 500
            }
          });

          // Check if the request failed
          if (response.status !== 200) {
            throw new Error('Failed to fetch activity');
          }

          console.log('Activity response:', response.data);
          setActivities(response.data);
          const activityEnd = performance.now();
          setFetchTimings(prev => ({
            ...prev,
            activity: Math.round(activityEnd - activityStart)
          }));
        } catch (err) {
          console.error('Error fetching activity:', err);
          throw err;
        } finally {
          setActivityLoading(false);
        }
      };
      
      // Run both fetches in parallel
      await Promise.all([
        fetchStats().catch(e => console.error('Stats fetch failed:', e)),
        fetchActivity().catch(e => console.error('Activity fetch failed:', e))
      ]);
      
      const endTime = performance.now();
      setFetchTimings(prev => ({
        ...prev,
        total: Math.round(endTime - startTime)
      }));
      
      // Show timing info in snackbar
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error.response || error);
      setError(
        error.response?.data?.message || 
        'Failed to load dashboard data. Please check if the server is running.'
      );
    } finally {
      setIsLoading(false);
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
      title: 'Add Knowledge',
      description: 'Expand your agents\' knowledge base',
      icon: <UploadIcon />,
      action: () => navigate('/knowledge-base'),
      color: '#059669',
    },
  ];

  // Prepare data for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  
  const pieData = [
    { name: 'Agents', value: stats.totalAgents || 0 },
    { name: 'Chats', value: stats.totalChats || 0 },
    { name: 'Knowledge Base', value: stats.totalKnowledgeBase || 0 },
  ];

  if (isLoading && !statsLoading && !activityLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <CircularProgress />
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Button 
          variant="contained" 
          onClick={fetchDashboardData} 
          startIcon={<RefreshIcon />}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>
      
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
                  <AssessmentIcon sx={{ fontSize: 40, mr: 1 }} />
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
                  <ApiIcon sx={{ fontSize: 40, mr: 1 }} />
                  <Typography variant="h4">{stats.apiUsage}%</Typography>
                </Box>
                <Typography variant="subtitle1">API Usage</Typography>
                <Box sx={{ mt: 1, width: '100%', position: 'relative' }}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.apiUsage}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'white',
                      }
                    }}
                  />
                </Box>
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
                {activities.map((activity, index) => (
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
                            <AssessmentIcon />
                          ) : (
                            <StorageIcon />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.description}
                        secondary={`${formatDistance(new Date(activity.timestamp), new Date(), { addSuffix: true })}`}
                      />
                    </ListItem>
                    {index < activities.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        message={`Dashboard loaded in ${fetchTimings.total || 0}ms`}
      />
    </Box>
  );
}

export default Dashboard; 