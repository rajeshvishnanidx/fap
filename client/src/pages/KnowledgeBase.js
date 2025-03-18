import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Language as WebIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Description as FileIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Map as MapIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  CloudUpload,
  Close as CloseIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

const KnowledgeBase = () => {
  // Tab and URL states
  const [activeTab, setActiveTab] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');

  // Loading states
  const [scraping, setScraping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Data states
  const [knowledgeBaseItems, setKnowledgeBaseItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);
  const [scrapingProgress, setScrapingProgress] = useState(null);
  const [progressStats, setProgressStats] = useState(null);

  // Dialog states
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Error state
  const [error, setError] = useState('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Add filter state
  const [statusFilter, setStatusFilter] = useState(null);

  // Add separate pagination states for knowledge base items
  const [kbPage, setKbPage] = useState(0);
  const [kbRowsPerPage, setKbRowsPerPage] = useState(10);
  const [totalKbItems, setTotalKbItems] = useState(0);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoadingAgents(true);
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          setError('Authentication token missing. Please log in again.');
          setLoadingAgents(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/agents?fields=name,_id', {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 10000,
          validateStatus: function (status) {
            return (status >= 200 && status < 300) || status === 404;
          }
        });

        if (response.status === 200) {
          const agentsList = response.data;
          console.log(`Fetched ${agentsList.length} real agents for knowledge base`);
          
          if (agentsList.length > 0) {
            setAgents(agentsList);
            
            if (!selectedAgent && agentsList.length > 0) {
              setSelectedAgent(agentsList[0]._id);
              fetchKnowledgeBaseItems();
            } else if (selectedAgent) {
              fetchKnowledgeBaseItems();
            }
          } else {
            setError('No agents found. Please create an agent first.');
            setLoadingAgents(false);
          }
        } else if (response.status === 404) {
          setError('No agents found. Please create an agent first.');
          setLoadingAgents(false);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
        
        // Instead of using mock agents, show helpful error message
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          setError('Authentication failed. Please log in again.');
        } else if (err.code === 'ECONNABORTED') {
          setError('Request timed out. Server may be unavailable.');
        } else {
          setError(`Failed to fetch agents: ${err.message}`);
        }
        
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      fetchKnowledgeBaseItems();
    } else {
      setKnowledgeBaseItems([]);
    }
  }, [selectedAgent, kbPage, kbRowsPerPage]);

  // Add interval to update scraping progress
  useEffect(() => {
    let progressInterval;
    
    // Only set up the interval if we're on the sitemap tab and have an agent selected
    if (activeTab === 1 && selectedAgent) {
      // Initial fetch
      fetchScrapingProgress();
      
      // Set up interval to fetch progress every 5 seconds
      progressInterval = setInterval(() => {
        fetchScrapingProgress();
      }, 5000);
    }
    
    // Clean up interval on unmount or when dependencies change
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [activeTab, selectedAgent]);

  // Close content view when tab changes
  useEffect(() => {
    // Reset selected content when tab changes
    setSelectedContent(null);
  }, [activeTab]);

  const fetchKnowledgeBaseItems = async () => {
    if (!selectedAgent) return;
    try {
      console.log('Fetching knowledge base items with params:', {
        agent: selectedAgent,
        page: kbPage + 1,
        limit: kbRowsPerPage
      });
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/knowledge-base/agent/${selectedAgent}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: kbPage + 1, // API uses 1-indexed pages
          limit: kbRowsPerPage
        }
      });
      
      console.log('Knowledge base response:', response.data);
      setKnowledgeBaseItems(response.data.items || []);
      setTotalKbItems(response.data.total || 0);
      
      console.log('Items set:', response.data.items?.length || 0, 'Total:', response.data.total || 0);
    } catch (error) {
      console.error('Error fetching knowledge base items:', error);
      toast.error('Failed to fetch knowledge base items');
    }
  };

  const fetchScrapingProgress = async () => {
    if (!selectedAgent) return;
    
    try {
      setLoadingProgress(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/knowledge-base/scraping-progress/${selectedAgent}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setScrapingProgress(response.data.progress);
      setProgressStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast.error('Error fetching scraping progress');
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleFileUpload = async (event) => {
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }
    const files = Array.from(event.target.files);
    setUploading(true);
    setUploadProgress(0);
    setError('');

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('agentId', selectedAgent);

        await axios.post(
          `${process.env.REACT_APP_API_URL}/knowledge-base/process-file`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            onUploadProgress: (progressEvent) => {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              setUploadProgress(progress);
            },
          }
        );

        toast.success(`File ${file.name} uploaded and processed successfully`);
        fetchKnowledgeBaseItems(); // Refresh the knowledge base list
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Error uploading file';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    event.target.value = null; // Reset file input
  };

  const handleWebsiteScrape = async () => {
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }
    if (!websiteUrl) {
      toast.error('Please enter a website URL');
      return;
    }
    setScraping(true);
    setScrapingProgress(0);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/knowledge-base/scrape`,
        {
          url: websiteUrl,
          agentId: selectedAgent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Website content scraped successfully!');
      fetchKnowledgeBaseItems(); // Refresh the knowledge base list
      setWebsiteUrl(''); // Clear the input
    } catch (error) {
      console.error('Scraping error:', error);
      let errorMessage = error.response?.data?.message || 'Error scraping website';
      
      // Handle quota exceeded error
      if (error.response?.data?.type === 'quota_exceeded') {
        errorMessage = (
          <div>
            <p>{error.response.data.message}</p>
            <p style={{ marginTop: '8px', fontSize: '0.9em' }}>
              {error.response.data.suggestion}
            </p>
          </div>
        );
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }

    setScraping(false);
    setScrapingProgress(0);
  };

  const handleSitemapScrape = async () => {
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }
    if (!sitemapUrl) {
      toast.error('Please enter a sitemap URL');
      return;
    }
    setLoadingProgress(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/knowledge-base/scrape-sitemap`,
        {
          sitemapUrl,
          agentId: selectedAgent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`Found ${response.data.totalUrls} URLs in sitemap. Processing started.`);
      setSitemapUrl('');
      fetchScrapingProgress();
    } catch (error) {
      console.error('Sitemap processing error:', error);
      toast.error(error.response?.data?.message || 'Error processing sitemap');
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/knowledge-base/retry-failed`,
        {
          agentId: selectedAgent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Failed URLs queued for retry');
      fetchScrapingProgress();
    } catch (error) {
      console.error('Retry error:', error);
      toast.error('Error retrying failed URLs');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <CircularProgress size={20} />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const renderProgressTable = () => {
    // Filter the progress data based on selected status
    const filteredProgress = statusFilter 
      ? scrapingProgress?.filter(item => item.status === statusFilter)
      : scrapingProgress;
      
    return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {progressStats && (
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <Paper 
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: statusFilter === null ? '2px solid #1976d2' : 'none',
                  boxShadow: statusFilter === null ? 3 : 1
                }}
                onClick={() => setStatusFilter(null)}
              >
                <Typography variant="h6">{progressStats.total}</Typography>
                <Typography variant="body2">Total URLs</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper 
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  bgcolor: 'grey.100',
                  cursor: 'pointer',
                  border: statusFilter === 'pending' ? '2px solid #1976d2' : 'none',
                  boxShadow: statusFilter === 'pending' ? 3 : 1
                }}
                onClick={() => setStatusFilter('pending')}
              >
                <Typography variant="h6">{progressStats.pending}</Typography>
                <Typography variant="body2">Pending</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper 
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  bgcolor: 'info.light',
                  cursor: 'pointer',
                  border: statusFilter === 'processing' ? '2px solid #1976d2' : 'none',
                  boxShadow: statusFilter === 'processing' ? 3 : 1
                }}
                onClick={() => setStatusFilter('processing')}
              >
                <Typography variant="h6">{progressStats.processing}</Typography>
                <Typography variant="body2">Processing</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper 
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  bgcolor: 'success.light',
                  cursor: 'pointer',
                  border: statusFilter === 'completed' ? '2px solid #1976d2' : 'none',
                  boxShadow: statusFilter === 'completed' ? 3 : 1
                }}
                onClick={() => setStatusFilter('completed')}
              >
                <Typography variant="h6">{progressStats.completed}</Typography>
                <Typography variant="body2">Completed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper 
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  bgcolor: 'error.light',
                  cursor: 'pointer',
                  border: statusFilter === 'failed' ? '2px solid #1976d2' : 'none',
                  boxShadow: statusFilter === 'failed' ? 3 : 1
                }}
                onClick={() => setStatusFilter('failed')}
              >
                <Typography variant="h6">{progressStats.failed}</Typography>
                <Typography variant="body2">Failed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper 
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  bgcolor: 'warning.light',
                  cursor: 'pointer'
                }}
              >
                <Typography variant="h6">{progressStats.totalChunks}</Typography>
                <Typography variant="body2">Total Chunks</Typography>
              </Paper>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            {statusFilter && (
              <Button 
                startIcon={<VisibilityIcon />}
                onClick={() => setStatusFilter(null)} 
              >
                Show All
              </Button>
            )}
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={fetchScrapingProgress} 
              disabled={loadingProgress}
            >
              {loadingProgress ? 'Refreshing...' : 'Refresh Progress'}
            </Button>
          </Box>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Chunks</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProgress
              ?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((progress) => (
                <TableRow key={progress._id}>
                  <TableCell>{getStatusIcon(progress.status)}</TableCell>
                  <TableCell>{progress.url}</TableCell>
                  <TableCell>{progress.chunks || 0}</TableCell>
                  <TableCell>
                    {progress.startedAt
                      ? new Date(progress.startedAt).toLocaleString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {progress.completedAt
                      ? new Date(progress.completedAt).toLocaleString()
                      : '-'}
                  </TableCell>
                  <TableCell>{progress.error || '-'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredProgress?.length || 0}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {progressStats?.failed > 0 && (
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<RefreshIcon />}
            onClick={handleRetryFailed}
          >
            Retry Failed URLs
          </Button>
        </Box>
      )}
    </Box>
  )};

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/knowledge-base/${itemToDelete._id}/agent/${selectedAgent}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Item removed from knowledge base');
      fetchKnowledgeBaseItems(); // Refresh the list
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting item';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setIsDeleting(false);
  };

  const handleViewContent = async (itemId) => {
    setLoadingContent(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/knowledge-base/content/${itemId}/agent/${selectedAgent}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (!response.data || !response.data.content) {
        throw new Error('No content available');
      }
      
      setSelectedContent(response.data);
    } catch (error) {
      console.error('View content error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error fetching content';
      toast.error(errorMessage);
      setError(errorMessage);
    }
    setLoadingContent(false);
  };

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Knowledge Base
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Select Agent</InputLabel>
            <Select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              label="Select Agent"
            >
              <MenuItem value="">
                <em>Select an agent</em>
              </MenuItem>
              {agents.map((agent) => (
                <MenuItem key={agent._id} value={agent._id}>
                  {agent.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Main content area with left and right panes */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {/* Left pane for tabs and content lists */}
            <Grid item xs={12} md={selectedContent ? 6 : 12} lg={selectedContent ? 5 : 12}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: '48px' }}
                >
                  <Tab label="Single URL" />
                  <Tab label="Sitemap" />
                  <Tab label="Upload" />
                  <Tab label="Knowledge Base" />
                </Tabs>
              </Box>

              {activeTab === 0 && (
                <Card sx={{ height: selectedContent ? 'calc(100vh - 270px)' : 'auto', overflow: 'auto' }}>
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Website URL"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      disabled={!selectedAgent || scraping}
                      helperText={!selectedAgent ? "Please select an agent first" : ""}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleWebsiteScrape}
                      disabled={!selectedAgent || !websiteUrl || scraping}
                      startIcon={scraping ? <CircularProgress size={20} /> : <CloudUpload />}
                    >
                      {scraping ? 'Processing...' : 'Start Scraping'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTab === 1 && (
                <Card sx={{ height: selectedContent ? 'calc(100vh - 270px)' : 'auto', overflow: 'auto' }}>
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Sitemap URL"
                      value={sitemapUrl}
                      onChange={(e) => setSitemapUrl(e.target.value)}
                      disabled={!selectedAgent || loadingProgress}
                      helperText={!selectedAgent ? "Please select an agent first" : ""}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSitemapScrape}
                      disabled={!selectedAgent || !sitemapUrl || loadingProgress}
                      startIcon={loadingProgress ? <CircularProgress size={20} /> : <CloudUpload />}
                    >
                      {loadingProgress ? 'Processing...' : 'Process Sitemap'}
                    </Button>
                    {renderProgressTable()}
                  </CardContent>
                </Card>
              )}

              {activeTab === 2 && (
                <Card sx={{ height: selectedContent ? 'calc(100vh - 270px)' : 'auto', overflow: 'auto' }}>
                  <CardContent>
                    <input
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="file-upload"
                      disabled={!selectedAgent || uploading}
                    />
                    <label htmlFor="file-upload">
                      <Button
                        fullWidth
                        variant="contained"
                        component="span"
                        disabled={!selectedAgent || uploading}
                        startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                      >
                        {uploading ? 'Uploading...' : 'Upload Document'}
                      </Button>
                    </label>
                    {!selectedAgent && (
                      <Typography color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                        Please select an agent first
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 3 && (
                <Card sx={{ height: selectedContent ? 'calc(100vh - 270px)' : 'auto', overflow: 'auto' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Knowledge Base Items ({totalKbItems})
                      </Typography>
                      <Box>
                        <Chip 
                          icon={<WebIcon />} 
                          label={`Websites: ${knowledgeBaseItems.filter(item => item.type === 'website').length}`}
                          sx={{ mr: 1 }}
                        />
                        <Chip 
                          icon={<FileIcon />} 
                          label={`Files: ${knowledgeBaseItems.filter(item => item.type === 'file').length}`}
                        />
                      </Box>
                    </Box>
                    {!selectedAgent ? (
                      <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                        Please select an agent to view its knowledge base
                      </Typography>
                    ) : (
                      <>
                        <List sx={{ p: 0 }}>
                          {knowledgeBaseItems.map((item) => (
                            <React.Fragment key={item._id}>
                              <ListItem
                                secondaryAction={
                                  <Box sx={{ display: 'flex', minWidth: '80px', justifyContent: 'flex-end' }}>
                                    <IconButton
                                      edge="end"
                                      aria-label="view"
                                      onClick={() => handleViewContent(item._id)}
                                      disabled={loadingContent}
                                      sx={{ mr: 1 }}
                                    >
                                      {loadingContent && itemToDelete?._id === item._id ? (
                                        <CircularProgress size={24} />
                                      ) : (
                                        <VisibilityIcon />
                                      )}
                                    </IconButton>
                                    <IconButton
                                      edge="end"
                                      aria-label="delete"
                                      onClick={() => handleDeleteClick(item)}
                                      disabled={isDeleting}
                                    >
                                      {isDeleting && itemToDelete?._id === item._id ? (
                                        <CircularProgress size={24} />
                                      ) : (
                                        <DeleteIcon />
                                      )}
                                    </IconButton>
                                  </Box>
                                }
                                sx={{ 
                                  pr: 12, // Add padding to prevent text from overlapping with buttons
                                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                                }}
                              >
                                <ListItemIcon>
                                  {item.type === 'website' ? <WebIcon /> : <FileIcon />}
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography 
                                      variant="body1" 
                                      sx={{ 
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {item.source}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="body2" color="text.secondary">
                                      Added: {new Date(item.addedAt).toLocaleString()}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                              <Divider />
                            </React.Fragment>
                          ))}
                          {knowledgeBaseItems.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                              No items in knowledge base. Add content by scraping websites or uploading files.
                            </Typography>
                          )}
                        </List>
                        <TablePagination
                          component="div"
                          count={totalKbItems}
                          page={kbPage}
                          onPageChange={(e, newPage) => setKbPage(newPage)}
                          rowsPerPage={kbRowsPerPage}
                          onRowsPerPageChange={(e) => {
                            setKbRowsPerPage(parseInt(e.target.value, 10));
                            setKbPage(0);
                          }}
                          labelRowsPerPage="Items per page:"
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Right pane for content display */}
            {selectedContent && (
              <Grid item xs={12} md={6} lg={7}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: '48px' }}>
                  <Button 
                    variant="outlined"
                    color="error"
                    onClick={() => setSelectedContent(null)}
                    startIcon={<CloseIcon />}
                    sx={{ mt: 1 }}
                  >
                    Close Content View
                  </Button>
                </Box>
                <Card sx={{ height: 'calc(100vh - 270px)', overflow: 'auto' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Content View
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          icon={selectedContent?.metadata.type === 'website' ? <WebIcon /> : <FileIcon />}
                          label={selectedContent?.metadata.source}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={`${selectedContent?.content.length} chunks`}
                          size="small"
                          color="primary"
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedContent(null)}
                          sx={{ ml: 1 }}
                          color="error"
                          title="Close content view"
                        >
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {loadingContent ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      selectedContent && (
                        <Box>
                          {selectedContent.content.map((chunk, index) => (
                            <Paper 
                              key={index} 
                              elevation={1}
                              sx={{ 
                                p: 3, 
                                mb: 2, 
                                backgroundColor: 'grey.50',
                                '&:hover': {
                                  backgroundColor: 'grey.100',
                                },
                                position: 'relative'
                              }}
                            >
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                }}
                              >
                                Chunk {index + 1}
                              </Typography>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'system-ui',
                                  lineHeight: 1.8,
                                  textAlign: 'justify',
                                  mt: 2
                                }}
                              >
                                {chunk}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                      )
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this item from the knowledge base?
              This action cannot be undone.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Source: {itemToDelete?.source}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)} 
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} /> : null}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </Box>
  );
};

export default KnowledgeBase; 