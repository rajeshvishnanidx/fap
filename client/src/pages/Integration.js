import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

function Integration() {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initializeData = async () => {
      await fetchUserData();
      await fetchAgents();
    };
    
    initializeData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
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
      toast.error('Failed to load agents');
    }
  };

  const generateWidgetCode = (agentId) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const widgetUrl = `${window.location.origin}/widget.js`;
    
    return `
<!-- AI Chat Widget -->
<script>
  window.AI_AGENT_CONFIG = {
    apiUrl: "${apiUrl}",
    agentId: "${agentId}",
    apiKey: "${user?.apiKey}"
  };
</script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/axios@1.4.0/dist/axios.min.js"></script>
<script src="${widgetUrl}"></script>
<script>
  // Initialize the widget after it's loaded
  window.ChatWidget.init();
</script>
`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Website Integration
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="body1" gutterBottom>
            Follow these steps to integrate the chat widget into your website:
          </Typography>

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              1. Select an Agent
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose the AI agent you want to embed in your website.
            </Typography>
            <TextField
              select
              fullWidth
              label="Select Agent to Embed"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Select an agent</MenuItem>
              {agents.map((agent) => (
                <MenuItem key={agent._id} value={agent._id}>
                  {agent.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {selectedAgent && (
            <>
              <Box sx={{ my: 3 }}>
                <Typography variant="h6" gutterBottom>
                  2. Copy the Integration Code
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Copy this code and paste it before the closing &lt;/body&gt; tag of your website.
                </Typography>
                <TextField
                  multiline
                  fullWidth
                  rows={10}
                  value={generateWidgetCode(selectedAgent)}
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
                  }}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    navigator.clipboard.writeText(generateWidgetCode(selectedAgent));
                    toast.success('Code copied to clipboard!');
                  }}
                >
                  Copy Code
                </Button>
              </Box>

              <Box sx={{ my: 3 }}>
                <Typography variant="h6" gutterBottom>
                  3. Test the Integration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  After adding the code to your website, refresh the page and look for the chat widget in the bottom-right corner.
                  Click the chat icon to open the widget and test the conversation with your AI agent.
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Integration; 