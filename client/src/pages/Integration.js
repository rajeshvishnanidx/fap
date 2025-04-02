import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

function Integration() {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/agents?fields=name,_id`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 10000,
        validateStatus: function (status) {
          return (status >= 200 && status < 300) || status === 404;
        }
      });

      if (response.status === 200) {
        const agentsList = response.data;
        console.log(`Fetched ${agentsList.length} real agents for integration page`);
        
        if (agentsList.length > 0) {
          setAgents(agentsList);
          
          if (!selectedAgent && agentsList.length > 0) {
            setSelectedAgent(agentsList[0]._id);
          }
        } else {
          setError('No agents found. Please create an agent first.');
        }
      } else if (response.status === 404) {
        setError('No agents found. Please create an agent first.');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agents:', err);
      
      // Instead of using mock agents, show helpful error message
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setError('Authentication failed. Please log in again.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Server may be unavailable.');
      } else {
        setError(`Failed to fetch agents: ${err.message}`);
      }
      
      setLoading(false);
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
            <FormControl fullWidth>
              <InputLabel id="agent-select-label">Select Agent</InputLabel>
              <Select
                labelId="agent-select-label"
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                label="Select Agent"
                disabled={loading}
              >
                {Array.isArray(agents) && agents.map((agent) => (
                  <MenuItem key={agent._id} value={agent._id}>
                    {agent.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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