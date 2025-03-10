import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

function Chat() {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(response.data);
      if (response.data.length > 0) {
        setSelectedAgent(response.data[0]._id);
      }
    } catch (error) {
      setError('Error fetching agents');
      toast.error('Error fetching agents');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgent) return;

    const newMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/${selectedAgent}`,
        {
          messages: [...messages, newMessage],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages(prev => [...prev, response.data.message]);

      // Show sources if available
      if (response.data.context && response.data.context.length > 0) {
        const sourcesMessage = {
          role: 'system',
          content: 'Sources used:\n' + response.data.context
            .map(ctx => `- ${ctx.source} (relevance: ${Math.round(ctx.score * 100)}%)`)
            .join('\n'),
        };
        setMessages(prev => [...prev, sourcesMessage]);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error sending message';
      
      // Add error message to chat
      const errorSystemMessage = {
        role: 'system',
        content: `⚠️ Error: ${errorMessage}`,
      };
      setMessages(prev => [...prev, errorSystemMessage]);
      
      setError(errorMessage);
      toast.error(errorMessage);
    }

    setLoading(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Chat with AI Agent
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Agent
              </Typography>
              <TextField
                select
                fullWidth
                label="AI Agent"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name}
                  </option>
                ))}
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
              <List>
                {messages.map((msg, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'AI'}
                        secondary={msg.content}
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontWeight: 'bold',
                            color: msg.role === 'user' ? 'primary.main' : 
                                   msg.role === 'system' ? 'text.secondary' : 'success.main',
                          },
                          '& .MuiListItemText-secondary': {
                            whiteSpace: 'pre-wrap',
                          },
                        }}
                      />
                    </ListItem>
                    {index < messages.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                <div ref={messagesEndRef} />
              </List>
            </CardContent>
            <Divider />
            <CardContent sx={{ p: 2, backgroundColor: 'background.default' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={!selectedAgent || loading}
                />
                <Button
                  variant="contained"
                  onClick={handleSendMessage}
                  disabled={!selectedAgent || !message.trim() || loading}
                  sx={{ minWidth: '100px' }}
                >
                  {loading ? <CircularProgress size={24} /> : <SendIcon />}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Chat; 