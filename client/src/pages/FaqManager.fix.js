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
    </Box>
  );
}

export default FaqManager; 