import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { ChromePicker } from 'react-color';
import { PhotoCamera, Preview as PreviewIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ChatPreview from '../components/ChatPreview';

const steps = ['Basic Info', 'Appearance', 'Behavior', 'Preview'];

const toneOptions = [
  'Professional',
  'Friendly',
  'Casual',
  'Formal',
  'Enthusiastic',
  'Technical',
];

const behaviorOptions = [
  'Helpful and Informative',
  'Concise and Direct',
  'Empathetic and Understanding',
  'Proactive and Suggestive',
];

function AgentBuilder() {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [agentData, setAgentData] = useState({
    name: '',
    description: '',
    primaryColor: '#2E7D32',
    icon: null,
    tone: 'Professional',
    behavior: 'Helpful and Informative',
    greeting: '',
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const loadAgent = async () => {
      console.log('AgentBuilder mounted, agentId:', agentId);
      if (agentId) {
        await fetchAgentData();
      }
    };
    loadAgent();
  }, [agentId]);

  const fetchAgentData = async () => {
    try {
      console.log('Fetching agent data for ID:', agentId);
      const token = localStorage.getItem('token');
      console.log('Using auth token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/agents/${agentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Full server response:', response);
      console.log('Agent data from server:', response.data);
      
      const agent = response.data;
      if (!agent) {
        throw new Error('Agent data not found in response');
      }

      console.log('Mapping server data to form:', {
        name: agent.name,
        description: agent.description,
        primaryColor: agent.appearance?.primaryColor,
        icon: agent.appearance?.icon,
        tone: agent.behavior?.tone,
        style: agent.behavior?.style,
        greeting: agent.behavior?.greeting
      });

      const updatedData = {
        name: agent.name || '',
        description: agent.description || '',
        primaryColor: agent.appearance?.primaryColor || '#2E7D32',
        icon: agent.appearance?.icon || null,
        tone: agent.behavior?.tone || 'Professional',
        behavior: agent.behavior?.style || 'Helpful and Informative',
        greeting: agent.behavior?.greeting || '',
      };

      console.log('Setting form data to:', updatedData);
      setAgentData(updatedData);
    } catch (error) {
      console.error('Error fetching agent:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      toast.error('Error fetching agent: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (field) => (event) => {
    setAgentData({ ...agentData, [field]: event.target.value });
  };

  const handleColorChange = (color) => {
    setAgentData({ ...agentData, primaryColor: color.hex });
  };

  const handleIconUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAgentData({ ...agentData, icon: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const agentPayload = {
        name: agentData.name,
        description: agentData.description,
        appearance: {
          primaryColor: agentData.primaryColor,
          icon: agentData.icon,
        },
        behavior: {
          tone: agentData.tone,
          style: agentData.behavior,
          greeting: agentData.greeting,
        },
      };

      const url = agentId 
        ? `${process.env.REACT_APP_API_URL}/agents/${agentId}`
        : `${process.env.REACT_APP_API_URL}/agents`;

      const method = agentId ? 'put' : 'post';

      await axios[method](
        url,
        agentPayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(agentId ? 'Agent updated successfully!' : 'Agent created successfully!');
      navigate('/agents');
    } catch (error) {
      toast.error(error.response?.data?.message || `Error ${agentId ? 'updating' : 'creating'} agent`);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Agent Name"
                value={agentData.name}
                onChange={handleInputChange('name')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={agentData.description}
                onChange={handleInputChange('description')}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  sx={{ backgroundColor: agentData.primaryColor, color: '#fff', width: '100%' }}
                >
                  Select Primary Color
                </Button>
                {showColorPicker && (
                  <Box sx={{ position: 'absolute', zIndex: 2 }}>
                    <ChromePicker
                      color={agentData.primaryColor}
                      onChange={handleColorChange}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCamera />}
                fullWidth
              >
                Upload Icon
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleIconUpload}
                />
              </Button>
            </Grid>
            {agentData.icon && (
              <Grid item xs={12}>
                <Box
                  component="img"
                  src={agentData.icon}
                  alt="Agent Icon"
                  sx={{ width: 100, height: 100, objectFit: 'cover' }}
                />
              </Grid>
            )}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tone of Voice</InputLabel>
                <Select
                  value={agentData.tone}
                  onChange={handleInputChange('tone')}
                  label="Tone of Voice"
                >
                  {toneOptions.map((tone) => (
                    <MenuItem key={tone} value={tone}>
                      {tone}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Behavior Style</InputLabel>
                <Select
                  value={agentData.behavior}
                  onChange={handleInputChange('behavior')}
                  label="Behavior Style"
                >
                  {behaviorOptions.map((behavior) => (
                    <MenuItem key={behavior} value={behavior}>
                      {behavior}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Greeting Message"
                value={agentData.greeting}
                onChange={handleInputChange('greeting')}
              />
            </Grid>
          </Grid>
        );

      case 3:
        const previewAgent = {
          _id: agentId || 'preview',
          name: agentData.name || 'New Agent',
          description: agentData.description,
          appearance: {
            primaryColor: agentData.primaryColor,
            icon: agentData.icon,
          },
          behavior: {
            tone: agentData.tone,
            style: agentData.behavior,
            greeting: agentData.greeting,
          },
          settings: {
            model: 'gpt-3.5-turbo'
          }
        };
        
        return (
          <Box>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preview Your Agent
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This is how your agent will appear to users. Try interacting with it to test the experience.
                </Typography>
              </CardContent>
            </Card>
            <ChatPreview
              agent={previewAgent}
              onClose={() => {}}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        {agentId ? 'Edit AI Agent' : 'Create AI Agent'}
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Card>
        <CardContent>
          {renderStepContent(activeStep)}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSave}
                >
                  Save Agent
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default AgentBuilder; 