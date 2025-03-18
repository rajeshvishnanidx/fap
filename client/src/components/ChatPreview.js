import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Paper,
  Avatar,
  Fab,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Minimize as MinimizeIcon,
  Fullscreen as FullscreenIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const ChatPreview = ({ agent, onClose, embedded = false, initiallyOpen = false, forceUpdate = null }) => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  
  // Log agent appearance data to debug color and icon issues
  useEffect(() => {
    if (agent) {
      console.log('ChatPreview received agent:', {
        id: agent._id,
        name: agent.name,
        appearance: agent.appearance,
        primaryColor: agent.appearance?.primaryColor,
        hasIcon: agent.appearance?.icon ? 'Yes' : 'No',
        iconPreview: agent.appearance?.icon?.substring(0, 30) + '...' || 'None'
      });
    }
  }, [agent]);
  
  // Set the primary color with a fallback
  const primaryColor = agent?.appearance?.primaryColor || '#2E7D32';
  const agentName = agent?.name || 'AI Assistant';
  
  // Force re-render when props change
  useEffect(() => {
    console.log("ChatPreview received forceUpdate:", forceUpdate);
    // Reset messages when agent or forceUpdate changes to apply new settings
    setMessages([]);
    
    // Initialize with open state if specified
    if (initiallyOpen !== undefined) {
      setIsOpen(initiallyOpen);
    }
  }, [forceUpdate, agent?._id, initiallyOpen]);
  
  useEffect(() => {
    if (agent && isOpen && messages.length === 0) {
      // Get the actual greeting from the agent data
      const greeting = agent.behavior?.greeting || `Hello! I'm ${agentName}. How can I help you today?`;
      console.log("Using greeting message:", greeting);
      
      // Add an initial greeting message from the agent
      setTimeout(() => {
        setMessages([
          {
            sender: 'agent',
            text: greeting,
            timestamp: new Date()
          }
        ]);
      }, 500);
    }
  }, [agent, isOpen, messages.length, agentName]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = () => {
    if (message.trim() === '') return;
    
    // Add user message
    const newMessages = [
      ...messages,
      {
        sender: 'user',
        text: message,
        timestamp: new Date()
      }
    ];
    setMessages(newMessages);
    setMessage('');
    
    // Simulate agent response
    setTimeout(() => {
      // Create a dynamic response that mentions the agent's settings
      let demoResponse = `I'm a preview of the ${agentName} agent.`;
      if (agent?.behavior?.tone || agent?.behavior?.style) {
        demoResponse += ` My tone is set to "${agent?.behavior?.tone || 'Professional'}" and my style is "${agent?.behavior?.style || 'Helpful and Informative'}".`;
      }
      
      demoResponse += " Your actual agent responses will be generated based on your system prompt and guidelines.";
      
      setMessages([
        ...newMessages,
        {
          sender: 'agent',
          text: demoResponse,
          timestamp: new Date()
        }
      ]);
    }, 1000);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };
  
  const getTimeString = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format for embedded (inside parent container) or floating mode
  if (embedded) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: embedded ? 0 : 2,
          overflow: 'hidden',
          backgroundColor: theme.palette.background.paper,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            backgroundColor: primaryColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              src={agent?.appearance?.icon || null}
              sx={{
                width: 36,
                height: 36,
                mr: 1.5,
                bgcolor: theme.palette.common.white,
                color: primaryColor,
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {!agent?.appearance?.icon && agentName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>
                {agentName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', lineHeight: 1 }}>
                {agent?.description || 'AI Assistant'}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Tooltip title="Options">
              <IconButton size="small" sx={{ color: 'white' }}>
                <MoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Box
          sx={{
            p: 2,
            flex: 1,
            overflowY: 'auto',
            backgroundColor: theme.palette.grey[50],
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23f3f3f3\' fill-opacity=\'1\'%3E%3Cpolygon points=\'0,0 2,0 2,2 0,2\'/%3E%3C/g%3E%3C/svg%3E")',
          }}
        >
          {messages.map((msg, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {msg.sender === 'agent' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 0.5 }}>
                    <Avatar
                      src={agent?.appearance?.icon || null}
                      sx={{
                        width: 20,
                        height: 20,
                        mr: 0.5,
                        bgcolor: primaryColor,
                        fontSize: '0.75rem',
                      }}
                    >
                      {!agent?.appearance?.icon && agentName.charAt(0)}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      {agentName}
                    </Typography>
                  </Box>
                )}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: msg.sender === 'user' 
                      ? theme.palette.primary.main
                      : msg.sender === 'system' 
                        ? theme.palette.grey[200] 
                        : primaryColor,
                    color: msg.sender === 'system' 
                      ? theme.palette.text.secondary 
                      : '#fff',
                    position: 'relative',
                    ...(msg.sender === 'user' && {
                      borderTopRightRadius: 0,
                    }),
                    ...(msg.sender === 'agent' && {
                      borderTopLeftRadius: 0,
                    }),
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.text}
                  </Typography>
                </Paper>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    mt: 0.5,
                    mx: 0.5,
                    fontSize: '0.7rem'
                  }}
                >
                  {getTimeString(msg.timestamp)}
                </Typography>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: theme.palette.background.paper,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={4}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                backgroundColor: theme.palette.background.default,
                '& fieldset': {
                  borderColor: 'divider',
                },
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            sx={{ 
              ml: 1, 
              bgcolor: primaryColor, 
              color: '#fff', 
              '&:hover': { 
                bgcolor: primaryColor, 
                opacity: 0.8 
              },
              width: 40,
              height: 40
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    );
  }
  
  // Floating chat bubble mode
  return (
    <>
      {isOpen ? (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 350,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden',
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <Box
            sx={{
              p: 1.5,
              backgroundColor: primaryColor,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar
                src={agent?.appearance?.icon || null}
                sx={{
                  width: 36,
                  height: 36,
                  mr: 1.5,
                  bgcolor: theme.palette.common.white,
                  color: primaryColor,
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {!agent?.appearance?.icon && agentName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>
                  {agentName}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', lineHeight: 1 }}>
                  {agent?.description || 'AI Assistant'}
                </Typography>
              </Box>
            </Box>
            <Box>
              <IconButton
                size="small"
                color="inherit"
                onClick={toggleChat}
                sx={{ mr: 0.5 }}
              >
                <MinimizeIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="inherit"
                onClick={onClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          <Box
            sx={{
              p: 2,
              flex: 1,
              overflowY: 'auto',
              backgroundColor: theme.palette.grey[50],
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23f3f3f3\' fill-opacity=\'1\'%3E%3Cpolygon points=\'0,0 2,0 2,2 0,2\'/%3E%3C/g%3E%3C/svg%3E")',
            }}
          >
            {messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {msg.sender === 'agent' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 0.5 }}>
                      <Avatar
                        src={agent?.appearance?.icon || null}
                        sx={{
                          width: 20,
                          height: 20,
                          mr: 0.5,
                          bgcolor: primaryColor,
                          fontSize: '0.75rem',
                        }}
                      >
                        {!agent?.appearance?.icon && agentName.charAt(0)}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {agentName}
                      </Typography>
                    </Box>
                  )}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: msg.sender === 'user' 
                        ? theme.palette.primary.main
                        : msg.sender === 'system' 
                          ? theme.palette.grey[200] 
                          : primaryColor,
                      color: msg.sender === 'system' 
                        ? theme.palette.text.secondary 
                        : '#fff',
                      position: 'relative',
                      ...(msg.sender === 'user' && {
                        borderTopRightRadius: 0,
                      }),
                      ...(msg.sender === 'agent' && {
                        borderTopLeftRadius: 0,
                      }),
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.text}
                    </Typography>
                  </Paper>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      mt: 0.5,
                      mx: 0.5,
                      fontSize: '0.7rem'
                    }}
                  >
                    {getTimeString(msg.timestamp)}
                  </Typography>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
          
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              backgroundColor: theme.palette.background.paper,
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  backgroundColor: theme.palette.background.default,
                  '& fieldset': {
                    borderColor: 'divider',
                  },
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!message.trim()}
              sx={{ 
                ml: 1, 
                bgcolor: primaryColor, 
                color: '#fff', 
                '&:hover': { 
                  bgcolor: primaryColor, 
                  opacity: 0.8 
                },
                width: 40,
                height: 40
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      ) : (
        <Fab
          aria-label="chat"
          onClick={toggleChat}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            bgcolor: primaryColor,
            color: '#fff',
            '&:hover': {
              bgcolor: primaryColor,
              opacity: 0.9,
            },
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            width: 60,
            height: 60,
          }}
        >
          <Avatar
            src={agent?.appearance?.icon || null}
            sx={{
              width: 60,
              height: 60,
              bgcolor: primaryColor,
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1.5rem'
            }}
          >
            {!agent?.appearance?.icon && agentName.charAt(0)}
          </Avatar>
        </Fab>
      )}
    </>
  );
};

export default ChatPreview; 