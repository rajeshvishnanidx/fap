import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Slide,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import axios from 'axios';

const ChatPreview = ({ agent, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add initial greeting when chat is opened
  useEffect(() => {
    if (isOpen && agent && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: agent.behavior?.greeting || 'Hello! How can I help you today?'
        }
      ]);
    }
  }, [isOpen, agent]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/${agent._id}`,
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
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `⚠️ Error: ${errorMessage}` 
      }]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMessages([]);
      onClose();
    }, 300); // Wait for animation to complete
  };

  // Get the primary color from agent's appearance settings or use default
  const primaryColor = agent?.appearance?.primaryColor || '#1976d2';

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1200 }}>
      {/* Chat Window */}
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Paper
          elevation={6}
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 0,
            width: 360,
            height: 560,
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box sx={{
            p: 2,
            bgcolor: primaryColor,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar 
              src={agent?.appearance?.icon} 
              alt={agent?.name}
              sx={{ width: 40, height: 40 }}
            >
              {agent?.name?.charAt(0)}
            </Avatar>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {agent?.name}
            </Typography>
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            bgcolor: 'grey.50',
          }}>
            {messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                {msg.role !== 'user' && msg.role !== 'system' && (
                  <Avatar 
                    src={agent?.appearance?.icon}
                    alt={agent?.name}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  >
                    {agent?.name?.charAt(0)}
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '70%',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? primaryColor : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    boxShadow: 1,
                    ...(msg.role === 'system' && {
                      bgcolor: 'grey.100',
                      fontSize: '0.875rem',
                      fontStyle: 'italic',
                    }),
                  }}
                >
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                size="small"
                sx={{ bgcolor: 'white' }}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!message.trim() || loading}
                sx={{ bgcolor: primaryColor }}
              >
                {loading ? '...' : 'Send'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Slide>

      {/* Chat Bubble Button */}
      <IconButton
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          width: 60,
          height: 60,
          bgcolor: primaryColor,
          color: 'white',
          boxShadow: 2,
          '&:hover': {
            bgcolor: primaryColor,
            filter: 'brightness(0.9)',
          },
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
        }}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </IconButton>
    </Box>
  );
};

export default ChatPreview; 