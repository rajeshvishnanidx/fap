import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  useTheme,
  Fab,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ChromePicker } from 'react-color';
import { 
  PhotoCamera, 
  Save as SaveIcon,
  ChevronLeft as BackIcon,
  ChevronRight as NextIcon,
  Description as PromptIcon,
  FormatListNumbered as GuidelinesIcon,
  ColorLens as AppearanceIcon,
  Person as BehaviorIcon,
  Info as InfoIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ChatPreview from '../components/ChatPreview';

const defaultPrompt = `You are an AI assistant for [Company Name]. Your role is to answer questions about their services. For any unusual requests, politely refuse. Don't tell jokes or provide entertainment, poems, or write email-related queries. If a request is not related to [Company Name], politely refuse to answer. Only provide information related to [Company Name].`;

const defaultGuidelines = `1. Always refer to the name as [Company Name].
2. Tone of the conversation should be friendly and professional. Respond like a human assistant.
3. Your response should be short, concise, and in structured format. Provide answers in bullet points if required.
4. If you don't know the answer, just politely respond that you don't have the information.
5. For any unusual requests, politely refuse.
6. Don't mention that you are an AI assistant, just respond like an assistant.
7. Don't entertain any requests like writing emails, jokes, or poems. Don't provide any information other than information related to [Company Name].
8. If a response requires a link, provide the link in the proper format. There should be no space between the text in the link and don't repeat the link text in the response.`;

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

// Steps for the wizard
const steps = [
  'Basic Info',
  'Instructions',
  'Appearance',
  'Behavior',
];

// Add modules and formats configuration for ReactQuill
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    ['clean']
  ]
};

function AgentBuilder() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  const [agentData, setAgentData] = useState({
    name: '',
    description: '',
    primaryColor: '#2E7D32',
    icon: null,
    tone: 'Professional',
    behavior: 'Helpful and Informative',
    greeting: '',
    prompt: defaultPrompt,
    guidelines: defaultGuidelines,
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [previewAgent, setPreviewAgent] = useState(null);
  const [showPreview, setShowPreview] = useState(true);

  // Handle prompt and guidelines changes safely
  const handlePromptChange = (content) => {
    console.log("Prompt content changed:", content?.substring(0, 50));
    // Always update the content, no additional checks that might prevent updates
    setAgentData(prevData => ({
      ...prevData,
      prompt: content
    }));
  };

  const handleGuidelinesChange = (content) => {
    console.log("Guidelines content changed:", content?.substring(0, 50));
    // Always update the content, no additional checks that might prevent updates
    setAgentData(prevData => ({
      ...prevData,
      guidelines: content
    }));
  };

  // Wrap fetchAgentData in useCallback to prevent infinite loops
  const fetchAgentData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching agent data for ID:', agentId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token missing. Please login again.');
        navigate('/login');
        return;
      }
      
      // Add timeout to prevent hanging requests
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/agents/${agentId}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500; // Don't reject responses with 4xx status
          }
        }
      );
      
      if (response.status !== 200 || !response.data) {
        throw new Error('Failed to fetch agent data: ' + (response.data?.message || 'Unknown error'));
      }
      
      const agent = response.data;
      if (!agent) {
        throw new Error('Agent data not found in response');
      }

      const updatedData = {
        name: agent.name || '',
        description: agent.description || '',
        primaryColor: agent.appearance?.primaryColor || '#2E7D32',
        icon: agent.appearance?.icon || null,
        tone: agent.behavior?.tone || 'Professional',
        behavior: agent.behavior?.style || 'Helpful and Informative',
        greeting: agent.behavior?.greeting || '',
        prompt: agent.behavior?.prompt || defaultPrompt,
        guidelines: agent.behavior?.guidelines || defaultGuidelines,
      };

      console.log("Setting agent data from server:", {
        name: updatedData.name,
        promptSnippet: updatedData.prompt?.substring(0, 100),
        guidelinesSnippet: updatedData.guidelines?.substring(0, 100)
      });

      setAgentData(updatedData);
      toast.success('Agent loaded successfully');
    } catch (error) {
      console.error('Error fetching agent:', error);
      toast.error('Error fetching agent: ' + (error.response?.data?.message || error.message));
      navigate('/agents');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, navigate]);

  useEffect(() => {
    if (agentId) {
      fetchAgentData();
    }
  }, [agentId, fetchAgentData]);

  // Update preview agent whenever agentData changes
  useEffect(() => {
    setPreviewAgent({
      _id: agentId || 'preview',
      name: agentData.name || 'New Agent',
      description: agentData.description || 'AI Assistant',
      appearance: {
        primaryColor: agentData.primaryColor || '#2E7D32',
        icon: agentData.icon,
      },
      behavior: {
        tone: agentData.tone || 'Professional',
        style: agentData.behavior || 'Helpful and Informative',
        greeting: agentData.greeting || `Hello! I'm ${agentData.name || 'your assistant'}. How can I help you today?`,
        prompt: agentData.prompt || defaultPrompt,
        guidelines: agentData.guidelines || defaultGuidelines,
      },
      settings: {
        model: 'gpt-3.5-turbo'
      }
    });
    
    // Log preview update for debugging
    console.log("Preview updated with:", {
      name: agentData.name,
      description: agentData.description,
      color: agentData.primaryColor,
      greeting: agentData.greeting,
      promptSnippet: agentData.prompt?.substring(0, 50) + "...",
      guidelinesSnippet: agentData.guidelines?.substring(0, 50) + "..."
    });
  }, [agentData, agentId]);

  const handleInputChange = (field) => (event) => {
    setAgentData({ ...agentData, [field]: event.target.value });
  };

  const handleColorChange = (color) => {
    setAgentData({ ...agentData, primaryColor: color.hex });
  };

  const handleIconUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAgentData({ ...agentData, icon: reader.result });
    };
    reader.readAsDataURL(file);
  };

  // Wizard navigation functions
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setSaveError(null);
      
      // Validate the data before saving
      if (!agentData.name.trim()) {
        setSaveError("Agent name is required");
        setActiveStep(0);
        toast.error("Agent name is required");
        return;
      }
      
      // Check that prompt and guidelines exist and aren't just empty HTML tags
      const strippedPrompt = agentData.prompt?.replace(/<[^>]*>/g, '').trim();
      const strippedGuidelines = agentData.guidelines?.replace(/<[^>]*>/g, '').trim();
      
      if (!strippedPrompt) {
        setSaveError("System prompt is required");
        setActiveStep(1);
        toast.error("System prompt is required");
        return;
      }
      
      if (!strippedGuidelines) {
        setSaveError("Response guidelines are required");
        setActiveStep(1);
        toast.error("Response guidelines are required");
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token missing. Please login again.');
        navigate('/login');
        return;
      }
      
      // Don't sanitize or modify the user's input except for the requested company name substitution
      console.log("Prompt before saving:", agentData.prompt?.substring(0, 100));
      console.log("Guidelines before saving:", agentData.guidelines?.substring(0, 100));
      
      // Create the payload with the exact values from the state
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
          prompt: agentData.prompt,
          guidelines: agentData.guidelines,
        },
      };

      console.log("Final agent payload being sent to server:", {
        name: agentPayload.name,
        promptExcerpt: agentPayload.behavior.prompt?.substring(0, 100),
        guidelinesExcerpt: agentPayload.behavior.guidelines?.substring(0, 100)
      });

      let response;
      if (agentId) {
        // Update existing agent
        response = await axios.put(
          `${process.env.REACT_APP_API_URL}/agents/${agentId}`,
          agentPayload,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        console.log("Server response:", response.data);
        toast.success('Agent updated successfully');
      } else {
        // Create new agent
        response = await axios.post(
          `${process.env.REACT_APP_API_URL}/agents`,
          agentPayload,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        console.log("Server response:", response.data);
        toast.success('Agent created successfully');
      }

      navigate('/agents');
    } catch (error) {
      console.error('Error saving agent:', error);
      console.error('Error details:', error.response?.data);
      setSaveError(error.response?.data?.message || error.message);
      toast.error('Error saving agent: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Basic Information
  const renderBasicInfoStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" fontWeight={500} color="primary" gutterBottom>
          Let's create your AI agent
        </Typography>
        <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
          Start with the basic information about your agent. This will help users identify your agent's purpose.
        </Typography>
        
        <TextField
          fullWidth
          label="Agent Name"
          value={agentData.name}
          onChange={handleInputChange('name')}
          placeholder="Enter a descriptive name for your AI agent"
          variant="outlined"
          required
          sx={{ mb: 3 }}
        />
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description"
          value={agentData.description}
          onChange={handleInputChange('description')}
          placeholder="Describe what this agent does and how it can help users"
          variant="outlined"
          required
          helperText="This description will be visible to users and help them understand your agent's purpose"
        />
      </Grid>
    </Grid>
  );

  // Step 2: Instructions
  const renderInstructionsStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" fontWeight={500} color="primary" gutterBottom>
          Agent Instructions
        </Typography>
        <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
          Define how your agent should behave and respond to user queries.
        </Typography>
      
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PromptIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="subtitle1" fontWeight={500}>
              System Prompt
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={1}>
            The main instruction that defines the agent's role and purpose
          </Typography>
          <Box 
            sx={{ 
              border: '1px solid', 
              borderColor: 'divider',
              borderRadius: 1,
              height: 180,
              '& .ql-container': {
                borderBottomLeftRadius: '4px',
                borderBottomRightRadius: '4px',
                backgroundColor: 'background.paper',
              },
              '& .ql-toolbar': {
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
                backgroundColor: 'background.default',
              },
            }}
          >
            <ReactQuill
              theme="snow"
              value={agentData.prompt}
              onChange={handlePromptChange}
              style={{ height: 148 }}
              preserveWhitespace={true}
              modules={quillModules}
              formats={[
                'header', 'bold', 'italic', 'underline', 'strike', 'list',
                'bullet'
              ]}
            />
          </Box>
        </Box>
        
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <GuidelinesIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="subtitle1" fontWeight={500}>
              Response Guidelines
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Specific instructions for how the agent should format and structure its responses
          </Typography>
          <Box 
            sx={{ 
              border: '1px solid', 
              borderColor: 'divider',
              borderRadius: 1,
              height: 250,
              '& .ql-container': {
                borderBottomLeftRadius: '4px',
                borderBottomRightRadius: '4px',
                backgroundColor: 'background.paper',
              },
              '& .ql-toolbar': {
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
                backgroundColor: 'background.default',
              },
            }}
          >
            <ReactQuill
              theme="snow"
              value={agentData.guidelines}
              onChange={handleGuidelinesChange}
              style={{ height: 218 }}
              preserveWhitespace={true}
              modules={quillModules}
              formats={[
                'header', 'bold', 'italic', 'underline', 'strike', 'list',
                'bullet'
              ]}
            />
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  // Step 3: Appearance
  const renderAppearanceStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" fontWeight={500} color="primary" gutterBottom>
          Visual Appearance
        </Typography>
        <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
          Customize how your agent will look to your users.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AppearanceIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={500}>
            Primary Color
          </Typography>
        </Box>
        
        <Box sx={{ position: 'relative', mb: 4 }}>
          <Button
            variant="outlined"
            onClick={() => setShowColorPicker(!showColorPicker)}
            sx={{ 
              backgroundColor: agentData.primaryColor, 
              color: '#fff', 
              width: '100%',
              py: 1.5,
              '&:hover': {
                backgroundColor: agentData.primaryColor,
                opacity: 0.9
              }
            }}
          >
            {showColorPicker ? 'Close Color Picker' : 'Select Primary Color'} - {agentData.primaryColor}
          </Button>
          {showColorPicker && (
            <Box sx={{ 
              position: 'absolute', 
              zIndex: 2, 
              mt: 1,
              boxShadow: 3,
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <ChromePicker
                color={agentData.primaryColor}
                onChange={handleColorChange}
                disableAlpha={true}
              />
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <PhotoCamera color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={500}>
            Agent Icon
          </Typography>
        </Box>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCamera />}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {agentData.icon ? 'Change Icon' : 'Upload Icon'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleIconUpload}
              />
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            {agentData.icon ? (
              <Box
                component="img"
                src={agentData.icon}
                alt="Agent Icon"
                sx={{ 
                  width: 80, 
                  height: 80, 
                  objectFit: 'cover', 
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: agentData.primaryColor,
                  mx: 'auto',
                  display: 'block'
                }}
              />
            ) : (
              <Box 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%',
                  backgroundColor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No icon
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );

  // Step 4: Behavior
  const renderBehaviorStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" fontWeight={500} color="primary" gutterBottom>
          Agent Behavior
        </Typography>
        <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
          Define how your agent will interact with users.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <BehaviorIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={500}>
            Personality Settings
          </Typography>
        </Box>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
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
        
        <FormControl fullWidth sx={{ mb: 4 }}>
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
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <ChatIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={500}>
            First Message
          </Typography>
        </Box>
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Greeting Message"
          value={agentData.greeting}
          onChange={handleInputChange('greeting')}
          placeholder="Enter the first message your agent will send to users"
          variant="outlined"
          helperText="This is the message users will see when they first interact with your agent"
        />
      </Grid>
    </Grid>
  );

  // Render the current step
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderInstructionsStep();
      case 2:
        return renderAppearanceStep();
      case 3:
        return renderBehaviorStep();
      default:
        return 'Unknown step';
    }
  };

  // Check if current step is valid and can proceed
  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return agentData.name.trim() !== '' && agentData.description.trim() !== '';
      case 1:
        return agentData.prompt && agentData.prompt.trim() !== '' && 
               agentData.guidelines && agentData.guidelines.trim() !== '';
      case 2:
        return true; // Appearance step always valid
      case 3:
        return agentData.tone !== '' && agentData.behavior !== '';
      default:
        return true;
    }
  };

  // Determine if we can submit the form
  const canSubmit = isStepValid(3) && isStepValid(0);

  // Toggle chat preview
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  if (isLoading && !agentId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: 'calc(100vh - 80px)',
      backgroundColor: 'background.default',
      pb: 8
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        backgroundColor: theme.palette.background.paper,
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <Typography variant="h5" component="h1" fontWeight={500}>
          {agentId ? 'Edit AI Agent' : 'Create AI Agent'}
        </Typography>
        
        <Box>
          <Tooltip title="Toggle Preview">
            <IconButton 
              color={showPreview ? 'primary' : 'default'} 
              onClick={togglePreview}
              sx={{ mr: 1 }}
            >
              <ChatIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={!canSubmit || isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {agentId ? 'Update Agent' : 'Create Agent'}
          </Button>
        </Box>
      </Box>
      
      {/* Main content */}
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {saveError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {saveError}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Left Side - Form */}
          <Grid item xs={12} md={showPreview ? 8 : 12}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              {/* Stepper */}
              <Stepper 
                activeStep={activeStep} 
                sx={{ 
                  mb: 4,
                  '& .MuiStepLabel-label': {
                    mt: 0.5
                  }
                }}
              >
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              
              {/* Step Content */}
              <Box sx={{ mt: 2, minHeight: 400 }}>
                {getStepContent(activeStep)}
              </Box>
              
              {/* Navigation */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                pt: 3,
                mt: 3,
                borderTop: '1px solid',
                borderColor: 'divider'
              }}>
                <Button
                  color="inherit"
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<BackIcon />}
                >
                  Back
                </Button>
                
                <Box>
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSave}
                      disabled={!canSubmit || isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    >
                      {agentId ? 'Update Agent' : 'Create Agent'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleNext}
                      disabled={!isStepValid(activeStep)}
                      endIcon={<NextIcon />}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          {/* Right Side - Preview (only shown when showPreview is true) */}
          {showPreview && (
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0} 
                sx={{ 
                  height: '100%', 
                  position: 'relative',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid', 
                  borderColor: 'divider',
                  backgroundColor: theme.palette.background.default
                }}>
                  <Typography variant="subtitle1" fontWeight={500} align="center">
                    Chat Preview
                  </Typography>
                  <Typography variant="caption" align="center" display="block" color="text.secondary">
                    This preview shows how your agent will appear to users
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  flex: 1, 
                  backgroundColor: 'rgba(0,0,0,0.02)', 
                  position: 'relative',
                  height: '600px'
                }}>
                  {previewAgent && (
                    <Box sx={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      right: 0, 
                      width: '100%', 
                      height: '100%'
                    }}>
                      <ChatPreview 
                        agent={previewAgent}
                        onClose={() => {}}
                        embedded={true}
                        initiallyOpen={true}
                        forceUpdate={JSON.stringify({
                          color: agentData.primaryColor,
                          icon: agentData.icon ? true : false,
                          name: agentData.name,
                          description: agentData.description,
                          greeting: agentData.greeting,
                          timestamp: new Date().getTime() // Force update on any field change
                        })}
                      />
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
      
      {/* Fixed action button for small screens */}
      <Box 
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16, 
          display: { xs: 'block', md: 'none' },
          zIndex: 1000 
        }}
      >
        <Fab 
          color="primary" 
          onClick={handleSave}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
        </Fab>
      </Box>
    </Box>
  );
}

export default AgentBuilder; 