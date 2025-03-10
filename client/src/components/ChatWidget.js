import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const widgetStyles = {
    container: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      fontFamily: 'Arial, sans-serif',
    },
    button: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
    },
    chatWindow: {
      position: 'absolute',
      bottom: '80px',
      right: '0',
      width: '350px',
      height: '500px',
      backgroundColor: 'white',
      borderRadius: '10px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      padding: '15px',
      backgroundColor: '#007bff',
      color: 'white',
      borderTopLeftRadius: '10px',
      borderTopRightRadius: '10px',
    },
    messageContainer: {
      flex: 1,
      overflow: 'auto',
      padding: '15px',
    },
    message: {
      margin: '8px 0',
      padding: '8px 12px',
      borderRadius: '15px',
      maxWidth: '80%',
    },
    userMessage: {
      backgroundColor: '#007bff',
      color: 'white',
      marginLeft: 'auto',
    },
    aiMessage: {
      backgroundColor: '#f1f1f1',
      marginRight: 'auto',
    },
    inputContainer: {
      padding: '15px',
      borderTop: '1px solid #eee',
      display: 'flex',
    },
    input: {
      flex: 1,
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '20px',
      marginRight: '8px',
    },
    sendButton: {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '20px',
      cursor: 'pointer',
    },
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${window.AI_AGENT_CONFIG.apiUrl}/chat/${window.AI_AGENT_CONFIG.agentId}`,
        {
          messages: [...messages, newMessage],
        },
        {
          headers: { 
            Authorization: `Bearer ${window.AI_AGENT_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setMessages(prev => [...prev, response.data.message]);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error sending message';
      setMessages(prev => [...prev, { role: 'system', content: `⚠️ Error: ${errorMessage}` }]);
    }

    setLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={widgetStyles.container}>
      {isOpen && (
        <div style={widgetStyles.chatWindow}>
          <div style={widgetStyles.header}>
            Chat with AI Assistant
          </div>
          <div style={widgetStyles.messageContainer}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...widgetStyles.message,
                  ...(msg.role === 'user' ? widgetStyles.userMessage : widgetStyles.aiMessage),
                }}
              >
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div style={widgetStyles.inputContainer}>
            <input
              type="text"
              style={widgetStyles.input}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              disabled={loading}
            />
            <button
              style={widgetStyles.sendButton}
              onClick={handleSendMessage}
              disabled={loading}
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
      <button
        style={widgetStyles.button}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  );
};

// Initialize widget when loaded as a standalone script
const initializeWidget = () => {
  // Check if the widget is already initialized
  if (document.getElementById('ai-chat-widget-root')) {
    console.warn('Chat widget is already initialized');
    return;
  }

  // Create container for widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'ai-chat-widget-root';
  document.body.appendChild(widgetContainer);

  try {
    // Initialize with React 18's createRoot
    const root = createRoot(widgetContainer);
    root.render(
      <React.StrictMode>
        <ChatWidget />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize chat widget:', error);
  }
};

// Export the component and initialization function
const exportedWidget = {
  component: ChatWidget,
  init: () => {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeWidget);
    } else {
      initializeWidget();
    }
  }
};

if (typeof window !== 'undefined') {
  window.ChatWidget = exportedWidget;
}

export default exportedWidget; 