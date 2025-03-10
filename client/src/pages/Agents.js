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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

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
      toast.error('Error fetching agents: ' + (error.response?.data?.message || error.message));
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
    if (!agentToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/agents/${agentToDelete._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Agent "${agentToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
      fetchAgents(); // Refresh the list
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Error deleting agent: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePreviewChat = (agent) => {
    setSelectedAgent(agent);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">AI Agents</Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/agent-builder')}
        >
          Create New Agent
        </Button>
      </Box>

      <Grid container spacing={3}>
        {agents.map((agent) => (
          <Grid item xs={12} md={6} lg={4} key={agent._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {agent.name}
                  </Typography>
                  <Box>
                    <Tooltip title="Preview Chat">
                      <IconButton 
                        onClick={() => handlePreviewChat(agent)}
                        color="primary"
                      >
                        <ChatIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        onClick={() => handleEditAgent(agent._id)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        onClick={() => handleDeleteClick(agent)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Typography color="textSecondary" gutterBottom>
                  {agent.description}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={`Tone: ${agent.behavior.tone}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`Style: ${agent.behavior.style}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`Model: ${agent.settings.model || 'gpt-3.5-turbo'}`}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Agent</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the agent "{agentToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {selectedAgent && (
        <ChatPreview
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </Box>
  );
}

export default Agents; 