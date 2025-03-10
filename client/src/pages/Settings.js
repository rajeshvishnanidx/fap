import * as React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  IconButton,
} from '@mui/material';
import {
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

function Settings() {
  const [settings, setSettings] = React.useState({
    name: '',
    email: '',
    company: '',
    website: '',
    openaiApiKey: '',
    apiKey: '',
  });
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSettings({
        name: response.data.name,
        email: response.data.email,
        company: response.data.company || '',
        website: response.data.website || '',
        openaiApiKey: response.data.openaiApiKey || '',
        apiKey: response.data.apiKey,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Error fetching user data');
      toast.error('Failed to load user data');
    }
  };

  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveOpenAI = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/auth/openai-key`,
        { openaiApiKey: settings.openaiApiKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('OpenAI API key updated successfully');
    } catch (error) {
      toast.error('Error updating OpenAI API key');
    }
  };

  const handleRegenerateApiKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/regenerate-key`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSettings({
        ...settings,
        apiKey: response.data.apiKey,
      });
      
      toast.success('API key regenerated successfully');
    } catch (error) {
      toast.error('Error regenerating API key');
    }
  };

  const handleToggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Name"
                    name="name"
                    value={settings.name}
                    onChange={handleChange}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    value={settings.email}
                    onChange={handleChange}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company"
                    name="company"
                    value={settings.company}
                    onChange={handleChange}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Website"
                    name="website"
                    value={settings.website}
                    onChange={handleChange}
                    disabled
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Keys
              </Typography>
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" gutterBottom>
                  OpenAI API Key
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This key is required for your AI agents to function. Get your API key from the OpenAI dashboard.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="OpenAI API Key"
                      name="openaiApiKey"
                      value={settings.openaiApiKey}
                      onChange={handleChange}
                      type="password"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSaveOpenAI}
                      startIcon={<KeyIcon />}
                    >
                      Save Key
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Your API Key
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This key is required to integrate the chat widget into your website.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="API Key"
                      value={settings.apiKey}
                      type={showApiKey ? 'text' : 'password'}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <IconButton
                            onClick={handleToggleApiKeyVisibility}
                            edge="end"
                          >
                            {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleRegenerateApiKey}
                      startIcon={<KeyIcon />}
                    >
                      Regenerate
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Settings; 