import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ChatPreview from '../components/ChatPreview';

function Agents() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (!loading) {
      checkDashboardStats();
    }
  }, [loading]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.time('fetch-agents');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      console.log('Fetching agents with token:', token ? 'Token exists' : 'No token');
      
      // Try without query parameters to see full response
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/agents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          validateStatus: function(status) {
            return status < 500; // Don't reject on 4xx responses
          }
        }
      );
      
      console.log('Agents API response status:', response.status);
      console.log('Agents API full response:', response);
      console.log('Agents API response data:', response.data);
      console.log('Agents API response type:', typeof response.data, Array.isArray(response.data));
      
      if (response.status !== 200) {
        throw new Error('Failed to fetch agents');
      }
      
      // More detailed handling of different response formats
      let agentsList = [];
      if (Array.isArray(response.data)) {
        agentsList = response.data;
        console.log('Response was an array');
      } else if (response.data && typeof response.data === 'object') {
        if (response.data.agents && Array.isArray(response.data.agents)) {
          agentsList = response.data.agents;
          console.log('Response had agents array property');
        } else if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
          agentsList = response.data.data;
          console.log('Response had data array property');
        } else {
          // Try to find any array in the response
          const keys = Object.keys(response.data);
          console.log('Response object keys:', keys);
          
          for (const key of keys) {
            if (Array.isArray(response.data[key])) {
              console.log(`Found array in response.data.${key}`);
              agentsList = response.data[key];
              break;
            }
          }
        }
      }
      
      console.log(`Fetched ${agentsList.length} agents:`, agentsList);
      
      // Add debug info to help troubleshoot
      if (agentsList.length === 0) {
        // Check if there's any data that might be in a different format
        console.log('No agents found. Full response data:', JSON.stringify(response.data));
      }
      
      setAgents(agentsList);
      console.timeEnd('fetch-agents');
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load agents');
      toast.error('Error fetching agents: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const checkDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/dashboard/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('Dashboard stats for comparison:', response.data);
      
      if (response.data.totalAgents > 0 && agents.length === 0) {
        setError(`Data inconsistency detected: Dashboard shows ${response.data.totalAgents} agent(s) but agent list is empty`);
      }
    } catch (error) {
      console.error('Error checking dashboard stats:', error);
    }
  };

  const handleEditAgent = (agentId) => {
    console.log('Navigating to edit agent:', agentId);
    navigate(`/agent-builder/${agentId}`);
  };

  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) {
      console.error('No agent selected for deletion');
      return;
    }

    try {
      console.log('Deleting agent:', agentToDelete._id);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token missing. Please login again.');
        navigate('/login');
        return;
      }
      
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/agents/${agentToDelete._id}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: function (status) {
            return status < 500; // Don't reject responses with 4xx status
          }
        }
      );
      
      console.log('Delete response:', response);
      
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Failed to delete agent');
      }
      
      toast.success(`Agent "${agentToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
      
      // Update local state instead of refetching
      setAgents(agents.filter(agent => agent._id !== agentToDelete._id));
    } catch (error) {
      console.error('Error deleting agent:', error);
      console.error('Error details:', error.response || error.message);
      toast.error('Error deleting agent: ' + (error.response?.data?.message || error.message));
      
      // Close dialog even on error
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const handlePreviewChat = (agent) => {
    // Make sure the full agent object with all appearance properties is passed to the chat preview
    // Create a deep copy with all the required properties to ensure chat preview works correctly
    const previewAgent = {
      ...agent,
      _id: agent._id,
      name: agent.name,
      description: agent.description,
      appearance: {
        ...(agent.appearance || {}),
        primaryColor: agent.appearance?.primaryColor || '#2E7D32',
        icon: agent.appearance?.icon
      },
      behavior: {
        ...(agent.behavior || {}),
        tone: agent.behavior?.tone || 'Professional',
        style: agent.behavior?.style || 'Helpful and Informative',
        greeting: agent.behavior?.greeting || `Hello! I'm ${agent.name}. How can I help you today?`
      }
    };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Agents
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/agent-builder')}
          startIcon={<AddIcon />}
        >
          Create New Agent
        </Button>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchAgents}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : agents.length === 0 ? (
        <Box textAlign="center" my={4}>
          <Typography variant="h6" gutterBottom>
            No agents found
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            You haven't created any AI agents yet.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/agent-builder')}
            startIcon={<AddIcon />}
          >
            Create Your First Agent
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent._id}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="h2">
                    {agent.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {agent.description}
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleEditAgent(agent._id)}
                      startIcon={<EditIcon />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleDeleteClick(agent)}
                      startIcon={<DeleteIcon />}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Agent</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the agent "{agentToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Agents;