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

  // Effect to fetch FAQs and related data when dependencies change
  useEffect(() => {
    if (selectedAgent) {
      console.log('Fetching data for agent:', {
        agent: selectedAgent,
        page,
        category: selectedCategory,
        limit: itemsPerPage
      });
      
      // Fetch settings and jobs only when agent changes
      const isAgentChange = !prevAgent.current || prevAgent.current !== selectedAgent;
      if (isAgentChange) {
        console.log('Agent changed, fetching settings and jobs');
        fetchAgentSettings();
        fetchJobs();
        prevAgent.current = selectedAgent;
      }
      
      // Always fetch FAQs when any dependency changes
      fetchFaqs();
    }
  }, [selectedAgent, page, selectedCategory, itemsPerPage]);

  // Clean up polling interval when component unmounts
  useEffect(() => {
    return () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
    };
  }, [statusPollingInterval]);

  // Helper function to construct API URLs correctly
  const getApiUrl = (endpoint) => {
    // For direct testing, use localhost directly
    return `http://localhost:5000/api/${endpoint}`;
  };

  // Update the fetchAgents function to use real data
  const fetchAgents = async () => {
    try {
      setLoading(true);
      
      // Fetch agents from API
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      // Get agents from API
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
          } else {
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

  // Update the fetchFaqs function to use mock data when in mock mode
  const fetchFaqs = async (agentId) => {
    if (!agentId) {
      console.error('No agent ID provided');
      setError('No agent selected. Please select an agent first.');
      setLoading(false);
      return;
    }

    try {
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

      let queryParams = `?agent=${agentId}&page=${page}&limit=${pageSize}`;
      
      if (searchQuery) {
        queryParams += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
        queryParams += `&category=${encodeURIComponent(selectedCategory)}`;
      }

      const response = await axios.get(`http://localhost:5000/api/faqs${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
        validateStatus: function (status) {
          return (status >= 200 && status < 300) || status === 404;
        }
      });

      if (response.status === 200) {
        const { faqs: fetchedFaqs, total, categories, categoryStats } = response.data;
        setFaqs(fetchedFaqs);
        setTotalFaqs(total);
        setCategories(categories || []);
        setCategoryStats(categoryStats || {});
        setLoading(false);
      } else if (response.status === 404) {
        console.warn('No FAQs found');
        setFaqs([]);
        setTotalFaqs(0);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The server is taking too long to respond.');
      } else {
        setError(`Failed to fetch FAQs: ${err.message || 'Unknown error'}`);
      }
      setLoading(false);
    }
  };

  const fetchAgentSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        getApiUrl('agents/' + selectedAgent), 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update settings state
      if (response.data.settings) {
        setExactMatchEnabled(response.data.settings.useExactMatchForFAQs ?? true);
        setMatchThreshold(response.data.settings.faqMatchThreshold ?? 0.85);
      }
      
    } catch (error) {
      console.error('Error fetching agent settings:', error);
    }
  };

  const handleAgentChange = (event) => {
    const newAgentId = event.target.value;
    setSelectedAgent(newAgentId);
    // Reset page and category when changing agent
    setPage(1);
    setSelectedCategory('all');
    
    // Fetch FAQs for the new agent
    fetchFaqs(newAgentId);
  };

  const handlePageChange = (event, newPage) => {
    console.log(`Changing to page ${newPage}`);
    setPage(newPage);
  };

  const handleAddFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      setError('Question and answer are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      await axios.post(
        getApiUrl('faqs/agent/' + selectedAgent),
        {
          question: newQuestion.trim(),
          answer: newAnswer.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh FAQs to include the new one
      fetchFaqs();
      
      // Clear form
      setNewQuestion('');
      setNewAnswer('');
      
      setSuccess('FAQ added successfully');
    } catch (error) {
      console.error('Error adding FAQ:', error);
      setError('Failed to add FAQ: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaq = async (faqId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.delete(
        getApiUrl('faqs/' + faqId + '/agent/' + selectedAgent),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh FAQs after delete
      fetchFaqs();
      
      setSuccess('FAQ deleted successfully');
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      setError('Failed to delete FAQ: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (faq) => {
    setEditingFaq(faq);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    setEditEnabled(faq.enabled);
    setEditDialogOpen(true);
  };

  const handleUpdateFaq = async () => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      setError('Question and answer are required');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put(
        getApiUrl('faqs/' + editingFaq._id + '/agent/' + selectedAgent),
        {
          question: editQuestion.trim(),
          answer: editAnswer.trim(),
          enabled: editEnabled
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh FAQs to include the updated one
      fetchFaqs();
      
      setEditDialogOpen(false);
      setSuccess('FAQ updated successfully');
    } catch (error) {
      console.error('Error updating FAQ:', error);
      setError('Failed to update FAQ: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImportDialog = () => {
    setImportText('');
    setOpenImportDialog(true);
  };

  const handleImportFaqs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let faqsToImport = [];
      
      // Parse import data based on selected format
      if (importFormat === 'json') {
        try {
          faqsToImport = JSON.parse(importText);
          if (!Array.isArray(faqsToImport)) {
            faqsToImport = [faqsToImport];
          }
        } catch (e) {
          setError('Invalid JSON format. Please check your input.');
          setLoading(false);
          return;
        }
      } else if (importFormat === 'csv') {
        // Simple CSV parsing (question,answer)
        faqsToImport = importText
          .split('\n')
          .filter(line => line.trim() && line.includes(','))
          .map(line => {
            const [question, ...answerParts] = line.split(',');
            return {
              question: question.trim(),
              answer: answerParts.join(',').trim()
            };
          });
      }
      
      if (faqsToImport.length === 0) {
        setError('No valid FAQs found to import');
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        getApiUrl('faqs/bulk-import/' + selectedAgent),
        {
          faqs: faqsToImport
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setOpenImportDialog(false);
      
      // Refresh FAQs
      fetchFaqs();
      
      setSuccess(`Imported ${response.data.stats.imported} FAQs successfully`);
    } catch (error) {
      console.error('Error importing FAQs:', error);
      setError('Failed to import FAQs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put(
        getApiUrl('agents/' + selectedAgent),
        {
          settings: {
            useExactMatchForFAQs: exactMatchEnabled,
            faqMatchThreshold: parseFloat(matchThreshold)
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setOpenSettingsDialog(false);
      setSuccess('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Failed to update settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkJobStatus = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl('faqs/job/' + jobId),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setGenerationStatus(response.data);
      
      // If completed, stop polling and refresh FAQs
      if (response.data.completed) {
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
          setStatusPollingInterval(null);
        }
        
        setIsGenerating(false);
        setCurrentJobId(null);
        
        if (response.data.status === 'completed') {
          setSuccess(`Generated ${response.data.progress?.generated || 0} FAQs from knowledge base`);
          fetchFaqs();
          fetchJobs(); // Also refresh jobs list
        } else if (response.data.status === 'error') {
          setError(`Error generating FAQs: ${response.data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error checking job status:', error);
    }
  };

  const handleGenerateFaqs = async () => {
    if (!selectedAgent) {
      setError('Please select an agent first');
      return;
    }
    
    setIsGenerating(true);
    setGenerationStatus(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        getApiUrl('faqs/generate-from-kb/' + selectedAgent),
        {}, // No need to specify limit anymore
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Check if there's an existing job or a new one was created
      if (response.data.jobId) {
        setCurrentJobId(response.data.jobId);
        
        // Start polling for job status
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
        }
        
        const intervalId = setInterval(() => checkJobStatus(response.data.jobId), 2000);
        setStatusPollingInterval(intervalId);
        
        // Set initial status
        setGenerationStatus({
          status: response.data.status || 'processing',
          progress: {
            processed: 0,
            total: response.data.totalItems || 0,
            generated: 0
          },
          completed: false
        });
      }
      
      setOpenGenerateDialog(false);
      
    } catch (error) {
      console.error('Error starting FAQ generation:', error);
      setIsGenerating(false);
      const errorMessage = error.response?.data?.message || 'Error generating FAQs';
      
      if (error.response?.data?.error) {
        setError(`${errorMessage}: ${error.response.data.error}`);
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(null);
    setError(null);
  };

  // Calculate pagination info
  // const totalPages = Math.ceil(totalFaqs / itemsPerPage);
  
  // Function to handle deleting all FAQs
  const handleDeleteAllFaqs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Attempting to delete all FAQs for agent:', selectedAgent);
      
      // Use the alternative endpoint
      const url = getApiUrl('faqs/deleteAll/' + selectedAgent);
      console.log('Request URL:', url);
      
      const response = await axios.delete(
        url,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setDeleteAllDialogOpen(false);
      
      // Refresh FAQs after delete
      fetchFaqs();
      
      setSuccess(`All FAQs deleted successfully (${response.data.deletedCount} FAQs removed)`);
    } catch (error) {
      console.error('Error deleting all FAQs:', error);
      // Provide more detailed error information
      let errorMessage = 'Failed to delete all FAQs. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server response:', error.response.data);
        console.error('Status code:', error.response.status);
        
        if (error.response.data && error.response.data.message) {
          errorMessage = `Error: ${error.response.data.message}`;
        } else if (error.response.data && error.response.data.error) {
          errorMessage = `Error: ${error.response.data.error}`;
        } else {
          errorMessage = `Error (${error.response.status}): Failed to delete all FAQs`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request error:', error.message);
        errorMessage = `Request failed: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch all jobs
  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl('faqs/jobs'),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Filter jobs by selected agent and type
      const agentJobs = response.data.filter(job => 
        job.agent === selectedAgent && job.type === 'faq_generation'
      );
      
      // Separate active and completed jobs
      const active = agentJobs.filter(job => 
        job.status === 'queued' || job.status === 'processing'
      );
      const completed = agentJobs.filter(job => 
        job.status === 'completed' || job.status === 'error'
      );
      
      setActiveJobs(active);
      setCompletedJobs(completed);
      
      // If there's an active job, start polling its status
      if (active.length > 0) {
        setIsGenerating(true);
        setCurrentJobId(active[0]._id);
        if (!statusPollingInterval) {
          const intervalId = setInterval(() => checkJobStatus(active[0]._id), 2000);
          setStatusPollingInterval(intervalId);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  // Add this function to handle view mode changes
  const handleViewModeChange = (event, newMode) => {
    setViewMode(newMode);
  };

  // Add a new function to handle job cancellation
  const handleCancelJob = async (jobId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        getApiUrl('faqs/job/' + jobId + '/cancel'),
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
      fetchFaqs();
      fetchJobs();
    } catch (error) {
      console.error('Error cancelling job:', error);
      setError('Failed to cancel job: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    console.log(`Changing category to: ${category}`);
    // Don't send 'all' as a category to the server
    setSelectedCategory(category === 'all' ? '' : category);
    // Reset to first page when changing category
    setPage(1);
  };

  // Get FAQs for the selected category
  const getFilteredFaqs = () => {
    console.log('getFilteredFaqs called with:', {
      faqs: faqs?.length || 0,
      selectedCategory,
      totalFaqs
    });
    return faqs || [];
  };

  // Calculate total pages for the current category
  const getCategoryTotalPages = () => {
    const pages = Math.ceil(totalFaqs / itemsPerPage);
    console.log('getCategoryTotalPages:', {
      totalFaqs,
      itemsPerPage,
      calculatedPages: pages
    });
    return pages;
  };

  // Add a new function for refresh
  const handleRefresh = async () => {
    try {
      setLoading(true);
      // First fetch the jobs to update any background processes
      await fetchJobs();
      // Then fetch the current page of FAQs
      await fetchFaqs();
      setSuccess('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Add a debug function to inspect state variables
  useEffect(() => {
    console.log('--- DEBUG: STATE VARIABLES ---');
    console.log('selectedAgent:', selectedAgent);
    console.log('faqs state:', { length: faqs.length, firstItem: faqs[0] });
    console.log('totalFaqs:', totalFaqs);
    console.log('loading:', loading);
    console.log('error:', error);
    console.log('page:', page);
    console.log('itemsPerPage:', itemsPerPage);
    console.log('--- END DEBUG ---');
  }, [selectedAgent, faqs, totalFaqs, loading, error, page, itemsPerPage]);

  const refreshAuthToken = async () => {
    try {
      setLoading(true);
      
      // Generate a token that should work with the server
      // This is a properly formatted JWT that will be recognized by the server
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTYxOTVhZjJiZWVkOTUwMGMwZWZlNzQiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3MDA5MzMwMzksImV4cCI6MjcwMDkzMzAzOX0.c_zpi_yvBhxnOxyw6YqNWVvN6jYmQn3Qm6TnLrSRCeo';
      
      // Save the token to localStorage
      localStorage.setItem('token', testToken);
      
      console.log('Test auth token set successfully');
      setSuccess('Test authentication token set. Fetching agents...');
      
      // Fetch agents with the new token
      await fetchAgents();
      setLoading(false);
      
      return true;
    } catch (err) {
      console.error('Error setting test token:', err);
      setError('Error setting test authentication: ' + err.message);
      setLoading(false);
      return false;
    }
  };

  const handleSaveManualToken = () => {
    try {
      const manualToken = document.getElementById('manual-token').value;
      if (!manualToken) {
        setError('Please enter a token');
        return;
      }
      
      // Save the token to localStorage
      localStorage.setItem('token', manualToken);
      console.log('Manual auth token set successfully');
      setSuccess('Manual authentication token set');
      setTokenDialogOpen(false);
      
      // Refresh the data with the new token
      fetchAgents();
    } catch (err) {
      console.error('Error setting manual token:', err);
      setError('Error setting authentication: ' + err.message);
    }
  };

  // Function to handle adding a new category
  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    if (categories.includes(newCategory.trim())) {
      setError('Category already exists');
      return;
    }

    // Add new category to the list (will be saved when updating FAQs)
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
    setSuccess(`Category "${newCategory.trim()}" added`);
  };

  // Function to handle deleting a category
  const handleDeleteCategory = () => {
    if (!categoryToDelete) {
      return;
    }

    // Check if category is in use
    const faqsUsingCategory = faqs.filter(faq => faq.category === categoryToDelete).length;
    
    if (faqsUsingCategory > 0) {
      setConfirmDialogOpen(true);
      return;
    }

    // If not in use, delete directly
    performCategoryDelete();
  };

  // Actually perform the category deletion
  const performCategoryDelete = () => {
    // Remove the category from the list
    setCategories(categories.filter(cat => cat !== categoryToDelete));
    
    // If we were viewing that category, switch to all
    if (selectedCategory === categoryToDelete) {
      setSelectedCategory('');
    }
    
    setSuccess(`Category "${categoryToDelete}" deleted`);
    setCategoryToDelete('');
    setConfirmDialogOpen(false);
  };

  // Function to check if server performance might be an issue
  useEffect(() => {
    // Show performance warning if there are too many FAQs
    if (totalFaqs > 500) {
      setShowPerformanceWarning(true);
    } else {
      setShowPerformanceWarning(false);
    }
  }, [totalFaqs]);

  // Function to generate sample FAQs
  const handleGenerateSampleFaqs = () => {
    setIsGenerating(true);
    
    // Create sample FAQs
    const newFaqs = [];
    const topics = [
      'Product Features', 'Pricing', 'Shipping', 'Returns', 
      'Account Setup', 'Password Reset', 'Technical Support',
      'Mobile App', 'Browser Compatibility', 'Data Privacy'
    ];
    
    for (let i = 1; i <= generationCount; i++) {
      const topicIndex = i % topics.length;
      const topic = topics[topicIndex];
      
      newFaqs.push({
        _id: `gen_faq_${Date.now()}_${i}`,
        question: `What are the ${topic.toLowerCase()} options available?`,
        answer: `This is a sample answer about ${topic.toLowerCase()}. It provides information that would be helpful to customers.`,
        category: generationCategory || 'Sample',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // In mock mode, add to existing mock FAQs
    // if (mockMode) {
    //   setMockFaqs([...mockFaqs, ...newFaqs]);
    //   
    //   // Update the stats for the new category
    //   const updatedStats = { ...mockCategoryStats };
    //   const category = generationCategory || 'Sample';
    //   updatedStats[category] = (updatedStats[category] || 0) + generationCount;
    //   setMockCategoryStats(updatedStats);
    //   
    //   // Add the category if it's new
    //   if (generationCategory && !mockCategories.includes(generationCategory)) {
    //     setMockCategories([...mockCategories, generationCategory]);
    //   }
    //   
    //   setSuccess(`Generated ${generationCount} sample FAQs in category "${category}"`);
    //   fetchFaqs(); // Refresh the view
    // } else {
    //   // In real mode, this would call the API
    //   setError('FAQ generation is only available in mock mode');
    // }
    
    setIsGenerating(false);
    setGenerationOpen(false);
  };

  // Remove the handleToggleMockMode function
  
  // In the render function, remove:
  // 1. Mock mode indicators
  // 2. Mock mode toggle switches
  // 3. Generate mock FAQs button and dialog

  // Update the agent ID in the URL when it changes
  useEffect(() => {
    if (selectedAgent) {
      navigate(`/faqs/${selectedAgent}`, { replace: true });
    }
  }, [selectedAgent, navigate]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 0 }}>
          FAQ Manager
          {/* {mockMode && (
            <Chip 
              label="MOCK MODE" 
              color="warning" 
              size="small" 
              sx={{ ml: 2, verticalAlign: 'middle' }} 
            />
          )} */}
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
          
          {/* {mockMode && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setGenerationOpen(true)}
              disabled={!mockMode}
            >
              Generate FAQs
            </Button>
          )} */}
          
          {/* <FormControlLabel
            control={
              <Switch
                checked={mockMode}
                onChange={(e) => handleToggleMockMode(e.target.checked)}
                color="success"
              />
            }
            label={
              <Typography sx={{ fontWeight: mockMode ? 'bold' : 'normal', color: mockMode ? 'success.main' : 'text.primary' }}>
                {mockMode ? 'Mock Mode: ON' : 'Mock Mode: OFF'}
              </Typography>
            }
          /> */}
        </Box>
      </Box>
      
      {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        {/* Remove the redundant toggle switch
        <FormControlLabel
          control={
            <Switch
              checked={mockMode}
              onChange={(e) => {
                const newMockMode = e.target.checked;
                setMockMode(newMockMode);
                setSuccess(newMockMode ? 'Switched to mock data mode' : 'Switched to server data mode');
                
                // Clear any errors
                setError(null);
                
                // Reset state
                if (newMockMode) {
                  // Generate fresh mock data
                  const freshMockFaqs = generateMockFaqs(14);
                  setMockFaqs(freshMockFaqs);
                  
                  // Set mock agents
                  setAgents(mockAgents);
                  if (!selectedAgent || !mockAgents.find(a => a._id === selectedAgent)) {
                    setSelectedAgent(mockAgents[0]._id);
                  }
                } else {
                  // Clearing data before fetching from server
                  setFaqs([]);
                  setTotalFaqs(0);
                }
                
                // Fetch data based on new mode
                setTimeout(() => {
                  fetchAgents();
                }, 100);
              }}
              color="success"
            />
          }
          label={
            <Typography sx={{ fontWeight: mockMode ? 'bold' : 'normal', color: mockMode ? 'success.main' : 'text.primary' }}>
              {mockMode ? 'Mock Mode: ON' : 'Mock Mode: OFF'}
            </Typography>
          }
        />
        */}
      {/* </Box> */}
      
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
      
      {selectedAgent ? (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Add New FAQ
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Question"
                  variant="outlined"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="What is your return policy?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Answer"
                  variant="outlined"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Our return policy allows returns within 30 days..."
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleAddFaq}
                  disabled={loading || !newQuestion.trim() || !newAnswer.trim()}
                >
                  Add FAQ
                </Button>
              </Grid>
            </Grid>
          </Paper>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Existing FAQs ({totalFaqs})
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            {/* Left Panel - Categories */}
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Categories
                </Typography>
                <List component="nav" aria-label="faq categories">
                  <ListItemButton
                    selected={!selectedCategory}
                    onClick={() => handleCategoryChange('all')}
                  >
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography 
                            variant="body2" 
                            sx={{
                              fontWeight: !selectedCategory ? 'bold' : 'normal',
                              textTransform: 'uppercase'
                            }}
                          >
                            All Categories
                          </Typography>
                          <Chip 
                            label={totalFaqs} 
                            size="small" 
                            color={!selectedCategory ? "primary" : "default"}
                          />
                        </Box>
                      } 
                    />
                  </ListItemButton>
                  {categories.filter(cat => cat && cat !== 'all').map(category => (
                    <ListItemButton
                      key={category}
                      selected={selectedCategory === category}
                      onClick={() => handleCategoryChange(category)}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography 
                              variant="body2" 
                              sx={{
                                fontWeight: selectedCategory === category ? 'bold' : 'normal'
                              }}
                            >
                              {category}
                            </Typography>
                            <Chip 
                              label={categoryStats[category] || 0} 
                              size="small" 
                              color={selectedCategory === category ? "primary" : "default"}
                            />
                          </Box>
                        } 
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            {/* Right Panel - FAQs */}
            <Grid item xs={12} md={9}>
              <Paper sx={{ p: 2 }}>
                {/* Debug Banner */}
                <Box sx={{ mb: 2, p: 1, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Debug: {loading ? 'Loading...' : 
                           error ? `Error: ${error}` : 
                           !faqs.length ? `No FAQs (total: ${totalFaqs})` :
                           `Showing ${faqs.length} FAQs (page ${page}/${Math.ceil(totalFaqs/itemsPerPage)})`}
                  </Typography>
                </Box>

                {/* Loading state */}
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                )}

                {/* Error state */}
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {/* Empty state */}
                {!loading && !error && (!faqs || faqs.length === 0) && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {totalFaqs === 0 
                        ? 'No FAQs found for this agent. Add your first FAQ above.'
                        : `No FAQs found in the "${selectedCategory || 'All'}" category.`}
                    </Alert>
                    
                    {/* Debug section for when no FAQs are loaded */}
                    <Box sx={{ mt: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                      <Typography variant="h6" gutterBottom>Debug Tools</Typography>
                      
                      <Button 
                        variant="outlined" 
                        color="primary"
                        onClick={() => {
                          const agent = selectedAgent;
                          console.log('Direct fetch for agent:', agent);
                          
                          if (!agent) {
                            console.error('No agent selected');
                            return;
                          }
                          
                          const token = localStorage.getItem('token');
                          if (!token) {
                            console.error('No authentication token found');
                            setError('Authentication token is missing. Please log in again.');
                            return;
                          }
                          
                          console.log('Using token from localStorage:', token ? 'Token exists' : 'No token');
                          
                          fetch(`http://localhost:5000/api/faqs/agent/${agent}?page=1&limit=10`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Accept': 'application/json'
                            }
                          })
                            .then(response => {
                              console.log('Direct fetch response status:', response.status);
                              console.log('Response headers:', response.headers);
                              return response.text();
                            })
                            .then(text => {
                              console.log('Direct fetch raw response:', text);
                              try {
                                const data = JSON.parse(text);
                                console.log('Parsed JSON data:', data);
                                
                                if (data.faqs && Array.isArray(data.faqs)) {
                                  console.log('Found faqs array with', data.faqs.length, 'items');
                                  if (data.faqs.length > 0) {
                                    console.log('First FAQ:', data.faqs[0]);
                                    
                                    // Update the state with the fetched FAQs
                                    setFaqs(data.faqs);
                                    setTotalFaqs(data.totalFaqs || data.faqs.length);
                                    if (data.categories) setCategories(data.categories);
                                    if (data.categoryStats) setCategoryStats(data.categoryStats);
                                    
                                    console.log('Updated state with fetched FAQs');
                                  }
                                } else {
                                  console.log('No faqs array in response');
                                }
                              } catch (err) {
                                console.error('Failed to parse JSON:', err);
                              }
                            })
                            .catch(err => {
                              console.error('Direct fetch error:', err);
                            });
                        }}
                        sx={{ mr: 1 }}
                      >
                        Direct Fetch (Debug)
                      </Button>
                      
                      {/* <Button 
                        variant="outlined" 
                        color="secondary"
                        onClick={() => {
                          console.log('Activating mock mode with sample data');
                          
                          // Enable mock mode
                          setMockMode(true);
                          
                          // Reset any error state
                          setError(null);
                          
                          // Generate fresh mock data and load it
                          const freshMockFaqs = generateMockFaqs(14);
                          setMockFaqs(freshMockFaqs);
                          
                          // Set mock agents if needed
                          setAgents(mockAgents);
                          
                          // Set selected agent if needed
                          if (!selectedAgent || !mockAgents.find(a => a._id === selectedAgent)) {
                            setSelectedAgent(mockAgents[0]._id);
                          }
                          
                          // Show mock data right away
                          const filtered = selectedCategory 
                            ? freshMockFaqs.filter(faq => faq.category === selectedCategory)
                            : freshMockFaqs;
                            
                          const startIndex = (page - 1) * itemsPerPage;
                          const paginatedFaqs = filtered.slice(startIndex, startIndex + itemsPerPage);
                          
                          setFaqs(paginatedFaqs);
                          setTotalFaqs(filtered.length);
                          setCategories(mockCategories);
                          setCategoryStats(mockCategoryStats);
                          
                          setSuccess('Switched to mock data mode with sample FAQs');
                        }}
                      >
                        Load Mock Data (Debug)
                      </Button> */}

                      <Button 
                        variant="outlined" 
                        color="warning"
                        onClick={() => {
                          // Check token
                          const token = localStorage.getItem('token');
                          console.log('Debug: Token Check');
                          console.log('Token exists:', !!token);
                          if (token) {
                            // Parse the JWT token (without verification)
                            try {
                              const parts = token.split('.');
                              if (parts.length !== 3) {
                                console.error('Token does not appear to be a valid JWT (should have 3 parts)');
                              } else {
                                const header = JSON.parse(atob(parts[0]));
                                const payload = JSON.parse(atob(parts[1]));
                                console.log('Token header:', header);
                                console.log('Token payload:', payload);
                                
                                // Check if token is expired
                                const now = Math.floor(Date.now() / 1000);
                                if (payload.exp && payload.exp < now) {
                                  console.error('Token is expired. Expired at:', new Date(payload.exp * 1000).toLocaleString());
                                  setError('Authentication token has expired. Please log in again.');
                                } else if (payload.exp) {
                                  console.log('Token expires at:', new Date(payload.exp * 1000).toLocaleString());
                                }
                              }
                            } catch (err) {
                              console.error('Error parsing token:', err);
                            }
                          } else {
                            setError('No authentication token found. Please log in.');
                          }
                        }}
                        sx={{ ml: 1 }}
                      >
                        Check Token (Debug)
                      </Button>

                      <Button 
                        variant="outlined" 
                        color="info"
                        onClick={refreshAuthToken}
                        sx={{ ml: 1 }}
                      >
                        Refresh Auth (Debug)
                      </Button>

                      <Button 
                        variant="outlined"
                        color="secondary"
                        onClick={() => setTokenDialogOpen(true)}
                        sx={{ ml: 1 }}
                      >
                        Manual Token (Debug)
                      </Button>
                    </Box>
                  </>
                )}

                {/* Data state */}
                {!loading && !error && faqs && faqs.length > 0 && (
                  <>
                    {/* Debug info */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        Showing {faqs.length} FAQs (Page {page} of {Math.ceil(totalFaqs / itemsPerPage)})
                      </Typography>
                    </Box>
                    
                    {/* Debug Table */}
                    <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1, overflow: 'auto' }}>
                      <Typography variant="h6" gutterBottom>Debug: Raw FAQ Data</Typography>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Question</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Answer</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {faqs.slice(0, 5).map((faq, index) => (
                            <tr key={faq._id || index}>
                              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{faq._id || 'No ID'}</td>
                              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{faq.question || 'No question'}</td>
                              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{faq.answer || 'No answer'}</td>
                              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{faq.category || 'No category'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {faqs.length > 5 && (
                        <Typography variant="caption" color="textSecondary">
                          Showing 5 of {faqs.length} FAQs
                        </Typography>
                      )}
                    </Box>
                    
                    {/* Pagination controls */}
                    {Math.ceil(totalFaqs / itemsPerPage) > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Pagination 
                          count={Math.ceil(totalFaqs / itemsPerPage)} 
                          page={page} 
                          onChange={handlePageChange} 
                          color="primary" 
                          showFirstButton 
                          showLastButton
                        />
                      </Box>
                    )}
                    
                    {/* FAQ cards */}
                    <Grid container spacing={2}>
                      {faqs.map(faq => (
                        <Grid item xs={12} md={6} key={faq._id || Math.random()}>
                          <Card 
                            sx={{ 
                              height: '100%',
                              opacity: faq.enabled ? 1 : 0.7,
                              borderLeft: faq.enabled ? '4px solid #2E7D32' : '4px solid #d32f2f'
                            }}
                          >
                            <CardContent>
                              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {faq.question || 'No question'}
                                </Typography>
                                <Box>
                                  {faq.sourceType && (
                                    <Chip 
                                      label={faq.sourceType} 
                                      size="small" 
                                      color="default" 
                                      sx={{ mr: 1 }}
                                    />
                                  )}
                                  <Chip 
                                    label={faq.enabled ? 'Active' : 'Disabled'} 
                                    size="small"
                                    color={faq.enabled ? 'success' : 'error'}
                                  />
                                </Box>
                              </Box>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                {faq.answer || 'No answer'}
                              </Typography>
                              {faq.source && (
                                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                                  Source: {faq.source}
                                </Typography>
                              )}
                              {faq.category && (
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                  Category: {faq.category}
                                </Typography>
                              )}
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'flex-end' }}>
                              <IconButton 
                                onClick={() => openEditDialog(faq)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                onClick={() => handleDeleteFaq(faq._id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </CardActions>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                    
                    {/* Bottom pagination */}
                    {Math.ceil(totalFaqs / itemsPerPage) > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination 
                          count={Math.ceil(totalFaqs / itemsPerPage)} 
                          page={page} 
                          onChange={handlePageChange} 
                          color="primary" 
                          showFirstButton 
                          showLastButton
                        />
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : (
        <Alert severity="info">
          Please select an agent to manage FAQs
        </Alert>
      )}
      
      {/* Jobs Dialog */}
      <Dialog 
        open={jobsDialogOpen} 
        onClose={() => setJobsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>FAQ Generation Jobs</DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>Active Jobs</Typography>
          {activeJobs.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>No active jobs</Alert>
          ) : (
            <Box sx={{ mb: 3 }}>
              {activeJobs.map(job => (
                <Paper key={job._id} sx={{ p: 2, mb: 1 }}>
                  <Typography variant="subtitle1">
                    Job ID: {job._id}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                    <Typography variant="body2" sx={{ mr: 1, minWidth: 120 }}>
                      Progress: {job.progress?.processed || 0} / {job.progress?.total || 0}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(job.progress?.processed / job.progress?.total) * 100 || 0} 
                      sx={{ flexGrow: 1 }}
                    />
                  </Box>
                  <Typography variant="body2">
                    Status: {job.status}
                  </Typography>
                  <Typography variant="body2">
                    Started: {new Date(job.startTime).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    FAQs Generated: {job.progress?.generated || 0}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setCurrentJobId(job._id);
                        setJobsDialogOpen(false);
                        if (!statusPollingInterval) {
                          const intervalId = setInterval(() => checkJobStatus(job._id), 2000);
                          setStatusPollingInterval(intervalId);
                        }
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleCancelJob(job._id)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
          
          <Typography variant="h6" gutterBottom>Completed Jobs</Typography>
          {completedJobs.length === 0 ? (
            <Alert severity="info">No completed jobs</Alert>
          ) : (
            <Box>
              {completedJobs.map(job => (
                <Paper key={job._id} sx={{ p: 2, mb: 1 }}>
                  <Typography variant="subtitle1">
                    Job ID: {job._id}
                  </Typography>
                  <Typography variant="body2">
                    Status: {job.status}
                  </Typography>
                  <Typography variant="body2">
                    Started: {new Date(job.startTime).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Completed: {job.endTime ? new Date(job.endTime).toLocaleString() : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    FAQs Generated: {job.progress?.generated || 0}
                  </Typography>
                  {job.stats && (
                    <Typography variant="body2">
                      Time Taken: {Math.round(job.stats.elapsedTimeMs / 1000)} seconds
                    </Typography>
                  )}
                  {job.error && (
                    <Typography variant="body2" color="error">
                      Error: {job.error}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobsDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              fetchJobs();
            }}
          >
            Refresh Jobs
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit FAQ</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Question"
                  variant="outlined"
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Answer"
                  variant="outlined"
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  multiline
                  rows={4}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editEnabled}
                      onChange={(e) => setEditEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateFaq} 
            variant="contained" 
            color="primary"
            disabled={loading || !editQuestion.trim() || !editAnswer.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Import FAQs</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Import Format</InputLabel>
              <Select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value)}
                label="Import Format"
              >
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              {importFormat === 'json' ? (
                <>
                  Format: <code>{`[{"question": "Question text", "answer": "Answer text"}, ...]`}</code>
                </>
              ) : (
                <>
                  Format: <code>Question1,Answer1</code> (one per line)
                </>
              )}
            </Alert>
            
            <TextField
              fullWidth
              label="FAQs to Import"
              variant="outlined"
              multiline
              rows={10}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={importFormat === 'json' 
                ? '[{"question": "What is your return policy?", "answer": "Our return policy..."}]' 
                : 'What is your return policy?,Our return policy allows returns within 30 days...'
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleImportFaqs} 
            variant="contained" 
            color="primary"
            disabled={loading || !importText.trim()}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Settings Dialog */}
      <Dialog open={openSettingsDialog} onClose={() => setOpenSettingsDialog(false)}>
        <DialogTitle>FAQ Matching Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, minWidth: 300 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={exactMatchEnabled}
                  onChange={(e) => setExactMatchEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Use exact string matching"
            />
            <Tooltip title="Exact string matching will check if the user's question contains the FAQ question text exactly">
              <IconButton size="small">
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Vector Similarity Threshold
                <Tooltip title="When using vector similarity for FAQ matching, the system will only return an FAQ answer if the similarity score is above this threshold (0.5-1.0)">
                  <IconButton size="small">
                    <HelpIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <TextField
                type="number"
                inputProps={{ min: 0.5, max: 1.0, step: 0.01 }}
                value={matchThreshold}
                onChange={(e) => setMatchThreshold(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveSettings} 
            variant="contained" 
            color="primary"
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Generate FAQs Dialog */}
      <Dialog open={openGenerateDialog} onClose={() => setOpenGenerateDialog(false)}>
        <DialogTitle>Generate FAQs from Knowledge Base</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            This will analyze your entire knowledge base and automatically generate relevant FAQs with answers based on your content.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              The generation process may take several minutes depending on the size of your knowledge base.
              You'll be able to see the progress and continue using the application while FAQs are being generated.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGenerateDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleGenerateFaqs} 
            color="primary" 
            variant="contained"
            disabled={isGenerating}
            startIcon={<GenerateIcon />}
          >
            Generate FAQs
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete All Confirmation Dialog */}
      <Dialog open={deleteAllDialogOpen} onClose={() => setDeleteAllDialogOpen(false)}>
        <DialogTitle>Delete All FAQs</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ pt: 1 }}>
            Are you sure you want to delete all {totalFaqs} FAQs for this agent? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAllFaqs} 
            variant="contained" 
            color="error"
          >
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Token Dialog */}
      <Dialog open={tokenDialogOpen} onClose={() => setTokenDialogOpen(false)}>
        <DialogTitle>Enter Auth Token</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Paste your JWT token here to authenticate with the API. This is for testing purposes.
          </DialogContentText>
          <TextField
            id="manual-token"
            label="JWT Token"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            margin="normal"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            defaultValue={localStorage.getItem('token') || ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTokenDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveManualToken} color="primary">
            Save Token
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success/Error Snackbar */}
      <Snackbar
        open={!!success || !!error}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={success ? "success" : "error"}
          variant="filled"
        >
          {success || error}
        </Alert>
      </Snackbar>

      {/* Add debug section for checking token validity and adding test token */}
      <Box sx={{ mt: 3, p: 2, border: '1px dashed #f00', borderRadius: 1, bgcolor: '#fff0f0' }}>
        <Typography variant="h6" gutterBottom>Emergency Debug Tools</Typography>
        <Typography variant="body2" color="error" paragraph>
          The application seems stuck in a loading state. Try these emergency options:
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Button 
              variant="contained" 
              color="error"
              fullWidth
              onClick={() => {
                // Force reset loading state and clear any pending operations
                setLoading(false);
                if (statusPollingInterval) {
                  clearInterval(statusPollingInterval);
                  setStatusPollingInterval(null);
                }
                setError("Loading state manually reset. Try refreshing the page or using a test token.");
              }}
            >
              Emergency Reset Loading State
            </Button>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Button 
              variant="contained" 
              color="warning"
              fullWidth
              onClick={() => {
                // Add a test token for debugging
                const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjgwMDAwMDAwLCJleHAiOjQ4MzM5MzcyMDB9.QDC1xJhIZdQqDOt1EFXKdJxAZXUWpwb7yJCXPjO5T-Y";
                localStorage.setItem('token', testToken);
                setSuccess("Test token set. Attempting to fetch data again...");
                
                // Reset any error state
                setError(null);
                
                // Try to fetch data again
                setTimeout(() => {
                  fetchAgents();
                }, 500);
              }}
            >
              Set Test Token & Fetch
            </Button>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="outlined"
              color="inherit"
              fullWidth
              onClick={() => {
                // Clear all localStorage and reset the app
                localStorage.clear();
                setError("All stored data cleared. You will need to log in again.");
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }}
            >
              Clear All Data & Reset App
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Add this for advanced settings */}
      <Accordion 
        sx={{ mt: 3, mb: 3 }} 
        expanded={advancedSettingsOpen}
        onChange={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Advanced Settings</Typography>
        </AccordionSummary>
        <AccordionContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">Category Management</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="New Category Name"
                  variant="outlined"
                  fullWidth
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddCategory}
                  sx={{ ml: 1, height: 56 }}
                >
                  Add
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Select Category to Delete</InputLabel>
                  <Select
                    value={categoryToDelete}
                    onChange={(e) => setCategoryToDelete(e.target.value)}
                    label="Select Category to Delete"
                  >
                    <MenuItem value="">
                      <em>Select a category</em>
                    </MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat} ({categoryStats[cat] || 0} FAQs)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteCategory}
                  disabled={!categoryToDelete}
                  sx={{ ml: 1, height: 56 }}
                >
                  Delete
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1">Performance Settings</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Items Per Page</InputLabel>
                <Select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  label="Items Per Page"
                >
                  <MenuItem value={5}>5 items</MenuItem>
                  <MenuItem value={10}>10 items</MenuItem>
                  <MenuItem value={25}>25 items</MenuItem>
                  <MenuItem value={50}>50 items</MenuItem>
                  <MenuItem value={100}>100 items (may be slow)</MenuItem>
                </Select>
                <FormHelperText>
                  Lower values load faster. Higher values show more FAQs at once.
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionContent>
      </Accordion>
      
      {/* Performance warning alert */}
      {showPerformanceWarning && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Performance Warning</AlertTitle>
          You have {totalFaqs} FAQs in this agent. Large numbers of FAQs may cause slower performance.
          Consider using category filters and smaller page sizes to improve loading times.
        </Alert>
      )}

      {/* Confirmation dialog for category deletion */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Category Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The category "{categoryToDelete}" is currently used by {categoryStats[categoryToDelete] || 0} FAQs.
            If you delete this category, these FAQs will have no category assigned.
            Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={performCategoryDelete} color="error">
            Delete Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert if any operation is in progress */}
      {(generationStatus || importStatus) && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => {
                setGenerationStatus(null);
                setImportStatus(null);
              }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {generationStatus || importStatus}
        </Alert>
      )}
    </Box>
  );
}

export default FaqManager; 
