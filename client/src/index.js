import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ChatWidget from './components/ChatWidget';
import './styles/global.css';
import { ThemeProvider } from '@mui/material/styles';
import theme from './utils/theme';

// Check if we're building the widget
if (process.env.REACT_APP_BUILD_TARGET === 'widget') {
  // Export the widget for external use
  window.ChatWidget = ChatWidget;
} else {
  // Normal app initialization
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
} 