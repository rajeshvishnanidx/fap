import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  InputAdornment,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  LinearProgress,
  Slider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  VpnKey as VpnKeyIcon,
  Close as CloseIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
  BoltOutlined as GenerateIcon,
  DeleteSweep as DeleteAllIcon,
  Cancel as CancelIcon,
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function FaqManager() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // New FAQ form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  
  // Bulk import dialog state
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState('json'); // or 'csv'
  
  // Settings dialog state
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [exactMatchEnabled, setExactMatchEnabled] = useState(true);
  const [matchThreshold, setMatchThreshold] = useState(0.85);

  // Generation state
  const [generationStatus, setGenerationStatus] = useState(null);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [statusPollingInterval, setStatusPollingInterval] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalFaqs, setTotalFaqs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Add new state for delete all confirmation dialog
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  // Add new state variables
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobsDialogOpen, setJobsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grouped'
  const [groupedFaqs, setGroupedFaqs] = useState({});

  // Add new state variables for category navigation
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryStats, setCategoryStats] = useState({});

  // Add a new state variable to track previous agent
  const prevAgent = React.useRef(null);

  // Add this state variable for the token dialog
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');

  // Add state for advanced settings
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState('');
  const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // State for UI
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  // Initial fetch of agents
  useEffect(() => {
    fetchAgents();
  }, []);

  // Update the agent ID in the URL when it changes
  useEffect(() => {
    if (selectedAgent) {
      try {
        navigate(`/faqs/${selectedAgent}`, { replace: true });
      } catch (err) {
        console.error('Navigation error:', err);
      }
    }
  }, [selectedAgent, navigate]);

  // Fetch agents from the server
  const fetchAgents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:5000/api/agents?fields=name,_id', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: function (status) {
          return (status >= 200 && status < 300) || status === 404;
        }
      });

      if (response.status === 200) {
        const agentsList = response.data;
        console.log(`Fetched ${agentsList.length} agents for FAQ manager`);
        
        if (agentsList.length > 0) {
          setAgents(agentsList);
          
          // If we don't have a selected agent yet, select the first one
          if (!selectedAgent && agentsList.length > 0) {
            setSelectedAgent(agentsList[0]._id);
            fetchFaqs(agentsList[0]._id);
          } else if (selectedAgent) {
            fetchFaqs(selectedAgent);
          }
        } else {
          setAgents([]);
          setError('No agents found. Please create an agent first.');
          setLoading(false);
        }
      } else if (response.status === 404) {
        console.warn('No agents found');
        setAgents([]);
        setError('No agents found. Please create an agent first.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(`Failed to fetch agents: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Fetch FAQs from the server
  const fetchFaqs = async (agentId) => {
    if (!agentId) {
      console.error('No agent ID provided');
      setError('No agent selected. Please select an agent first.');
      setLoading(false);
      return;
    }

    try {
      console.log('Starting fetchFaqs for agent:', agentId);
      setLoading(true);
      setError(null);
      
      // Fetch FAQs from API
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      let queryParams = `?page=${page}&limit=${itemsPerPage}`;
      
      if (searchQuery) {
        queryParams += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
        queryParams += `&category=${encodeURIComponent(selectedCategory)}`;
      }

      console.log(`Fetching FAQs with URL: http://localhost:5000/api/faqs/agent/${agentId}${queryParams}`);
      
      const response = await axios.get(`http://localhost:5000/api/faqs/agent/${agentId}${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
        validateStatus: function (status) {
          // Accept 404 as a valid status code - we'll handle it below
          return (status >= 200 && status < 300) || status === 404;
        }
      });

      console.log('FAQ API response status:', response.status);
      console.log('FAQ API response data:', response.data);

      if (response.status === 200) {
        // Handle null or undefined data for safety
        const fetchedFaqs = response.data.faqs || [];
        const total = response.data.total || 0;
        const pages = response.data.totalPages || 1;
        const cats = response.data.categories || [];
        const stats = response.data.categoryStats || {};
        
        console.log('Setting FAQs state:', fetchedFaqs.length, 'FAQs found');
        
        setFaqs(fetchedFaqs);
        setTotalFaqs(total);
        setTotalPages(pages);
        setCategories(cats);
        setCategoryStats(stats);
        setLoading(false);
      } else if (response.status === 404) {
        console.warn('No FAQs found for agent:', agentId);
        // Show a specific error for 404
        setError(`No FAQs found for this agent. The endpoint returned a 404 error.`);
        // Still keep the UI visible by setting empty arrays instead of null
        setFaqs([]);
        setTotalFaqs(0);
        setTotalPages(1);
        // Keep existing categories to avoid UI flicker
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      // Don't clear existing data on error to prevent UI from disappearing
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The server is taking too long to respond.');
      } else {
        setError(`Failed to fetch FAQs: ${err.message || 'Unknown error'}`);
      }
      // Make sure we're not clearing the state that would cause UI to disappear
      setFaqs([]);
      setTotalFaqs(0);
      setLoading(false);
    }
    
    console.log('After fetchFaqs, selectedAgent =', selectedAgent);
  };

  // Add a function to handle job cancellation
  const handleCancelJob = async (jobId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `http://localhost:5000/api/faqs/job/${jobId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess('Job cancelled successfully');
      
      // Clean up the polling interval
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
        setStatusPollingInterval(null);
      }
      
      // Reset generation status
      setIsGenerating(false);
      setCurrentJobId(null);
      setGenerationStatus(null);
      
      // Refresh data
      fetchAgents();
    } catch (error) {
      console.error('Error cancelling job:', error);
      setError('Failed to cancel job: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle agent change
  const handleAgentChange = (event) => {
    const newAgentId = event.target.value;
    setSelectedAgent(newAgentId);
    // Reset page and category when changing agent
    setPage(1);
    setSelectedCategory('all');
    
    // Fetch FAQs for the new agent
    fetchFaqs(newAgentId);
  };

  // Add a new function for refresh
  const handleRefresh = async () => {
    try {
      setLoading(true);
      // First fetch the jobs to update any background processes
      await fetchAgents();
      // Then fetch the current page of FAQs
      if (selectedAgent) {
        await fetchFaqs(selectedAgent);
      }
      setSuccess('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Add FAQ functionality
  const handleAddFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `http://localhost:5000/api/faqs`,
        {
          agent: selectedAgent,
          question: newQuestion,
          answer: newAnswer,
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess('FAQ added successfully');
      // Clear form
      setNewQuestion('');
      setNewAnswer('');
      // Refresh data
      fetchFaqs(selectedAgent);
    } catch (error) {
      console.error('Error adding FAQ:', error);
      setError('Failed to add FAQ: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Add save settings functionality
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `http://localhost:5000/api/faqs/settings/${selectedAgent}`,
        {
          exactMatchEnabled,
          matchThreshold
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess('Settings saved successfully');
      setOpenSettingsDialog(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Add category functionality
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `http://localhost:5000/api/faqs/category`,
        {
          agent: selectedAgent,
          category: newCategory
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess(`Category "${newCategory}" added successfully`);
      
      // Update categories list
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      setCategoryStats({...categoryStats, [newCategory]: 0});
      
      // Clear form
      setNewCategory('');
    } catch (error) {
      console.error('Error adding category:', error);
      setError('Failed to add category: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete category functionality
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(
        `http://localhost:5000/api/faqs/category/${selectedAgent}/${encodeURIComponent(categoryToDelete)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess(`Category "${categoryToDelete}" deleted successfully`);
      setConfirmDialogOpen(false);
      
      // Update categories list
      const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
      setCategories(updatedCategories);
      
      // If we were viewing that category, switch to 'all'
      if (selectedCategory === categoryToDelete) {
        setSelectedCategory('all');
      }
      
      // Refresh data
      fetchFaqs(selectedAgent);
      
      // Clear form
      setCategoryToDelete('');
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete FAQ functionality
  const handleDeleteFaq = async () => {
    if (!editingFaq) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(
        `http://localhost:5000/api/faqs/${editingFaq._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess('FAQ deleted successfully');
      setDeleteAllDialogOpen(false);
      
      // Refresh data
      fetchFaqs(selectedAgent);
      
      // Clear state
      setEditingFaq(null);
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      setError('Failed to delete FAQ: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete all FAQs functionality
  const handleDeleteAllFaqs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(
        `http://localhost:5000/api/faqs/agent/${selectedAgent}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess('All FAQs deleted successfully');
      setDeleteAllDialogOpen(false);
      
      // Refresh data
      fetchFaqs(selectedAgent);
    } catch (error) {
      console.error('Error deleting all FAQs:', error);
      setError('Failed to delete all FAQs: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Bulk import functionality
  const handleImportFaqs = async () => {
    if (!importText.trim()) {
      toast.error('Import content is required');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let importData;
      if (importFormat === 'json') {
        try {
          importData = JSON.parse(importText);
          if (!Array.isArray(importData)) {
            throw new Error('JSON must be an array of FAQ objects');
          }
        } catch (err) {
          toast.error('Invalid JSON format: ' + err.message);
          setLoading(false);
          return;
        }
      } else {
        // Simple CSV parsing
        try {
          const lines = importText.split('\n');
          const headers = lines[0].split(',');
          
          if (!headers.includes('question') || !headers.includes('answer')) {
            throw new Error('CSV must include question and answer columns');
          }
          
          importData = [];
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // This is a simple CSV parser that doesn't handle all edge cases
            const values = lines[i].split(',');
            const item = {};
            headers.forEach((header, index) => {
              item[header.trim()] = values[index] ? values[index].trim() : '';
            });
            
            importData.push(item);
          }
        } catch (err) {
          toast.error('Invalid CSV format: ' + err.message);
          setLoading(false);
          return;
        }
      }
      
      const response = await axios.post(
        `http://localhost:5000/api/faqs/bulk`,
        {
          agent: selectedAgent,
          faqs: importData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess(`${importData.length} FAQs imported successfully`);
      setOpenImportDialog(false);
      
      // Clear form
      setImportText('');
      
      // Refresh data
      fetchFaqs(selectedAgent);
    } catch (error) {
      console.error('Error importing FAQs:', error);
      setError('Failed to import FAQs: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Generate FAQs functionality
  const handleGenerateFaqs = async () => {
    try {
      setLoading(true);
      setIsGenerating(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `http://localhost:5000/api/faqs/generate/${selectedAgent}`,
        {
          // Add any generation parameters here
          groupSimilarQuestions: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Set up job monitoring
      setCurrentJobId(response.data.jobId);
      
      // Set up polling for job status
      const interval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `http://localhost:5000/api/faqs/job/${response.data.jobId}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          setGenerationStatus(statusResponse.data);
          
          // If job is completed or failed
          if (['completed', 'failed', 'cancelled'].includes(statusResponse.data.status)) {
            clearInterval(interval);
            setStatusPollingInterval(null);
            setIsGenerating(false);
            
            if (statusResponse.data.status === 'completed') {
              setSuccess('FAQs generated successfully');
            } else if (statusResponse.data.status === 'failed') {
              setError('FAQ generation failed: ' + statusResponse.data.error);
            } else {
              setSuccess('FAQ generation was cancelled');
            }
            
            // Refresh data
            fetchFaqs(selectedAgent);
          }
        } catch (error) {
          console.error('Error checking job status:', error);
        }
      }, 3000);
      
      setStatusPollingInterval(interval);
      setOpenGenerateDialog(false);
      
      // Clean up interval on component unmount
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } catch (error) {
      console.error('Error generating FAQs:', error);
      setError('Failed to generate FAQs: ' + (error.response?.data?.message || error.message));
      setIsGenerating(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 0 }}>
          FAQ Manager
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            startIcon={<RefreshIcon />}
            disabled={loading || !selectedAgent}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="agent-select-label">Select Agent</InputLabel>
            <Select
              labelId="agent-select-label"
              id="agent-select"
              value={selectedAgent || ''}
              onChange={handleAgentChange}
              label="Select Agent"
              disabled={loading}
            >
              {agents.map((agent) => (
                <MenuItem key={agent._id} value={agent._id}>
                  {agent.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setOpenSettingsDialog(true)}
              disabled={!selectedAgent}
            >
              FAQ Settings
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setOpenImportDialog(true)}
              disabled={!selectedAgent}
            >
              Bulk Import
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <GenerateIcon />}
              onClick={() => setOpenGenerateDialog(true)}
              disabled={!selectedAgent || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate from Knowledge Base'}
            </Button>

            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={!selectedAgent || loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteAllIcon />}
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={!selectedAgent || loading || totalFaqs === 0}
            >
              Delete All FAQs
            </Button>
          </Box>

          {/* Progress indicator for ongoing generation */}
          {isGenerating && generationStatus && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 1 }}>
                Generating FAQs from knowledge base... This may take several minutes.
                {currentJobId && (
                  <Typography variant="caption" display="block">
                    Job ID: {currentJobId} (You can close this page and check back later)
                  </Typography>
                )}
              </Alert>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1, minWidth: 120 }}>
                  Progress: {generationStatus.progress?.processed || 0} / {generationStatus.progress?.total || 0}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(generationStatus.progress?.processed / generationStatus.progress?.total) * 100 || 0} 
                  sx={{ flexGrow: 1 }}
                />
              </Box>
              <Typography variant="body2">
                FAQs generated so far: {generationStatus.progress?.generated || 0}
              </Typography>
              {generationStatus.progress?.currentBatch && (
                <Typography variant="body2">
                  Processing items: {generationStatus.progress.currentBatch}
                </Typography>
              )}
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => currentJobId && handleCancelJob(currentJobId)}
                  startIcon={<CancelIcon />}
                >
                  Cancel Generation
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
      
      {loading && !isGenerating && <LinearProgress sx={{ mb: 2 }} />}
      
      {/* Error and success messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Category selector and search */}
      {selectedAgent && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="category-select-label">Filter by Category</InputLabel>
                <Select
                  labelId="category-select-label"
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                    fetchFaqs(selectedAgent);
                  }}
                  label="Filter by Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category} ({categoryStats[category] || 0})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    fetchFaqs(selectedAgent);
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => {
                          setSearchQuery('');
                          setPage(1);
                          fetchFaqs(selectedAgent);
                        }}
                        edge="end"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* FAQ List - Always render this, even if there are no FAQs */}
      {selectedAgent ? (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
            <Table stickyHeader aria-label="FAQs table">
              <TableHead>
                <TableRow>
                  <TableCell width="40%">Question</TableCell>
                  <TableCell width="40%">Answer</TableCell>
                  <TableCell width="10%">Category</TableCell>
                  <TableCell width="10%" align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {faqs.length > 0 ? (
                  faqs.map((faq) => (
                    <TableRow key={faq._id} hover>
                      <TableCell sx={{ 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {faq.question}
                      </TableCell>
                      <TableCell sx={{ 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {faq.answer}
                      </TableCell>
                      <TableCell>
                        {faq.category ? (
                          <Chip 
                            label={faq.category} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        ) : (
                          <Chip 
                            label="Uncategorized" 
                            size="small" 
                            color="default" 
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <IconButton
                            onClick={() => {
                              setEditingFaq(faq);
                              setEditQuestion(faq.question);
                              setEditAnswer(faq.answer);
                              setEditEnabled(faq.enabled !== false);
                              setEditDialogOpen(true);
                            }}
                            size="small"
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setEditingFaq(faq);
                              setDeleteAllDialogOpen(true);
                            }}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      {loading ? (
                        <CircularProgress size={20} sx={{ my: 1 }} />
                      ) : searchQuery || selectedCategory !== 'all' ? (
                        <Typography variant="body2">
                          No FAQs match your search criteria. Try a different search or category.
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          No FAQs available. Click "Generate from Knowledge Base" to create FAQs automatically, or use "Bulk Import" to add them manually.
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalFaqs}
            rowsPerPage={itemsPerPage}
            page={page - 1} // MUI uses 0-indexed pages
            onPageChange={(_, newPage) => {
              setPage(newPage + 1); // Convert back to 1-indexed
              fetchFaqs(selectedAgent);
            }}
            onRowsPerPageChange={(e) => {
              setItemsPerPage(parseInt(e.target.value, 10));
              setPage(1);
              fetchFaqs(selectedAgent);
            }}
          />
        </Paper>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            Please select an agent to manage FAQs
          </Typography>
        </Paper>
      )}
      
      {/* Add new FAQ section */}
      {selectedAgent && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add New FAQ
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Question"
                multiline
                rows={3}
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter a question..."
                variant="outlined"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Answer"
                multiline
                rows={3}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Enter an answer..."
                variant="outlined"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  disabled={!newQuestion.trim() || !newAnswer.trim() || loading}
                  onClick={handleAddFaq}
                >
                  Add FAQ
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Confirmation Dialogs */}
      <Dialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {editingFaq ? 
              `Are you sure you want to delete this FAQ? This action cannot be undone.` :
              `Are you sure you want to delete all FAQs for this agent? This action cannot be undone.`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
          <Button 
            color="error" 
            onClick={() => {
              if (editingFaq) {
                handleDeleteFaq();
              } else {
                handleDeleteAllFaqs();
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAQ Settings Dialog */}
      <Dialog
        open={openSettingsDialog}
        onClose={() => setOpenSettingsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>FAQ Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 1 }}>
            <Typography variant="h6" gutterBottom>
              Response Settings
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={exactMatchEnabled}
                  onChange={(e) => setExactMatchEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Use exact match first"
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              When enabled, the system will first try to find an exact match for user questions before using semantic search.
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Typography id="match-threshold-slider" gutterBottom>
                Match Threshold: {matchThreshold}
              </Typography>
              <Slider
                value={matchThreshold}
                onChange={(e, newValue) => setMatchThreshold(newValue)}
                step={0.01}
                min={0.5}
                max={0.99}
                valueLabelDisplay="auto"
                aria-labelledby="match-threshold-slider"
              />
              <Typography variant="body2" color="textSecondary">
                Higher values require closer matches. Recommended: 0.85 - 0.90
              </Typography>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Category Management
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="New Category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="contained"
                    disabled={!newCategory.trim()}
                    onClick={handleAddCategory}
                  >
                    Add Category
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="delete-category-select-label">Select Category to Delete</InputLabel>
                  <Select
                    labelId="delete-category-select-label"
                    value={categoryToDelete}
                    onChange={(e) => setCategoryToDelete(e.target.value)}
                    label="Select Category to Delete"
                  >
                    <MenuItem value="">None</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category} ({categoryStats[category] || 0} FAQs)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  color="error"
                  sx={{ mt: 1 }}
                  disabled={!categoryToDelete}
                  onClick={() => {
                    setConfirmDialogOpen(true);
                  }}
                >
                  Delete Category
                </Button>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Warning: Deleting a category will set all FAQs in that category to "Uncategorized"
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>Cancel</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleSaveSettings}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bulk Import FAQs</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 1 }}>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Import Format</Typography>
              <Box sx={{ display: 'flex', mt: 1 }}>
                <Button
                  variant={importFormat === 'json' ? 'contained' : 'outlined'}
                  onClick={() => setImportFormat('json')}
                  sx={{ mr: 1 }}
                >
                  JSON
                </Button>
                <Button
                  variant={importFormat === 'csv' ? 'contained' : 'outlined'}
                  onClick={() => setImportFormat('csv')}
                >
                  CSV
                </Button>
              </Box>
            </FormControl>

            <TextField
              label="Import Content"
              multiline
              rows={10}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder={
                importFormat === 'json'
                  ? '[\n  {\n    "question": "What is your return policy?",\n    "answer": "Our return policy allows returns within 30 days.",\n    "category": "Returns"\n  }\n]'
                  : 'question,answer,category\n"What is your return policy?","Our return policy allows returns within 30 days.","Returns"'
              }
            />

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              {importFormat === 'json'
                ? 'JSON format should be an array of objects with question, answer, and optional category fields.'
                : 'CSV format should have columns for question, answer, and optional category. Enclose text in quotes if it contains commas.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)}>Cancel</Button>
          <Button
            color="primary"
            variant="contained"
            disabled={!importText.trim()}
            onClick={handleImportFaqs}
          >
            Import FAQs
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate FAQs Dialog */}
      <Dialog
        open={openGenerateDialog}
        onClose={() => setOpenGenerateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Generate FAQs from Knowledge Base</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will automatically generate FAQs based on your knowledge base documents. The process might take several minutes depending on the size of your knowledge base.
          </DialogContentText>

          <Alert severity="info" sx={{ mb: 2 }}>
            This process will use your OpenAI credits. Only proceed if you have available credits.
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={showPerformanceWarning}
                onChange={(e) => setShowPerformanceWarning(e.target.checked)}
              />
            }
            label="Show generation settings"
          />

          {showPerformanceWarning && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Advanced Settings
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                These settings affect the performance and quality of generated FAQs.
              </Typography>

              {/* Add advanced settings here if needed */}
              <FormControlLabel
                control={
                  <Switch
                    checked={true}
                    onChange={() => {}}
                  />
                }
                label="Group similar questions"
              />

              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                When enabled, similar questions will be grouped together to avoid duplication.
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGenerateDialog(false)}>Cancel</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleGenerateFaqs}
          >
            Start Generation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Category Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Category Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the category "{categoryToDelete}"? All FAQs in this category will be set to "Uncategorized". This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            color="error" 
            onClick={handleDeleteCategory}
          >
            Delete Category
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FaqManager; 