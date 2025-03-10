import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  SmartToy as AgentIcon,
  Book as KnowledgeIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Person as ProfileIcon,
  Assessment as StatsIcon,
  Code as IntegrationIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'AI Agents', icon: <AgentIcon />, path: '/agents' },
  { text: 'Knowledge Base', icon: <KnowledgeIcon />, path: '/knowledge-base' },
  { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
  { text: 'Usage Stats', icon: <StatsIcon />, path: '/usage-stats' },
  { text: 'Integration', icon: <IntegrationIcon />, path: '/integration' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
          AI Agent Dashboard
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              },
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              borderRadius: 1,
              m: 1,
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              sx={{ 
                color: location.pathname === item.path ? 'primary.main' : 'inherit',
                '& .MuiTypography-root': {
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                },
              }}
            />
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem
          button
          sx={{
            borderRadius: 1,
            m: 1,
          }}
        >
          <ListItemIcon>
            <ProfileIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItem>
      </List>
    </Drawer>
  );
}

export default Sidebar; 