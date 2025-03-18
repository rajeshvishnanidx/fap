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
  const [savingOpenAI, setSavingOpenAI] = React.useState(false);
  const [openAIKeyStatus, setOpenAIKeyStatus] = React.useState(null);

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
      setSavingOpenAI(true);
      setOpenAIKeyStatus(null);
      setError('');
      
      // Validate the key format
      if (!settings.openaiApiKey.startsWith('sk-')) {
        setError('Invalid OpenAI API key format. Key should start with "sk-"');
        return;
      }
      
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/auth/openai-key`,
        { openaiApiKey: settings.openaiApiKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOpenAIKeyStatus({ success: true, message: 'OpenAI API key updated successfully' });
      toast.success('OpenAI API key updated successfully');
      
      // Check if the key is working
      try {
        await axios.get(
          `${process.env.REACT_APP_API_URL}/auth/check-openai-key`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (checkError) {
        console.error('Error checking OpenAI API key:', checkError);
        setOpenAIKeyStatus({ 
          success: true, 
          warning: true, 
          message: 'Key saved but there may be issues - please test it in chat' 
        });
      }
    } catch (error) {
      console.error('Error updating OpenAI API key:', error);
      setOpenAIKeyStatus({ 
        success: false, 
        message: error.response?.data?.message || 'Error updating OpenAI API key' 
      });
      toast.error('Error updating OpenAI API key');
    } finally {
      setSavingOpenAI(false);
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
                      error={!!error}
                      helperText={error}
                      placeholder="sk-..."
                      disabled={savingOpenAI}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSaveOpenAI}
                      startIcon={<KeyIcon />}
                      disabled={!settings.openaiApiKey || savingOpenAI}
                    >
                      {savingOpenAI ? 'Saving...' : 'Save Key'}
                    </Button>
                  </Grid>
                  {openAIKeyStatus && (
                    <Grid item xs={12}>
                      <Alert 
                        severity={openAIKeyStatus.success ? (openAIKeyStatus.warning ? 'warning' : 'success') : 'error'}
                        sx={{ mt: 1 }}
                      >
                        {openAIKeyStatus.message}
                      </Alert>
                    </Grid>
                  )}
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