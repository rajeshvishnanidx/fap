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
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

function KnowledgeBase() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scrapingProgress, setScrapingProgress] = useState(null);
  const [knowledgeBaseItems, setKnowledgeBaseItems] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressStats, setProgressStats] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchAgents();
    if (selectedAgent) {
      fetchKnowledgeBase();
      fetchScrapingProgress();
    }
  }, [selectedAgent]);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(response.data);
      if (response.data.length > 0) {
        setSelectedAgent(response.data[0]._id);
      }
    } catch (error) {
      setError('Error fetching agents');
      toast.error('Error fetching agents');
    }
  };

  const fetchKnowledgeBase = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/knowledge-base/agent/${selectedAgent}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setKnowledgeBaseItems(response.data);
    } catch (error) {
      setError('Error fetching knowledge base');
      toast.error('Error fetching knowledge base');
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
        fetchKnowledgeBase(); // Refresh the knowledge base list
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
      fetchKnowledgeBase(); // Refresh the knowledge base list
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
    if (!sitemapUrl) {
      toast.error('Please enter a sitemap URL');
      return;
    }

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

  const renderProgressTable = () => (
    <Box sx={{ width: '100%', mt: 2 }}>
      {progressStats && (
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">{progressStats.total}</Typography>
                <Typography variant="body2">Total URLs</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
                <Typography variant="h6">{progressStats.pending}</Typography>
                <Typography variant="body2">Pending</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                <Typography variant="h6">{progressStats.processing}</Typography>
                <Typography variant="body2">Processing</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                <Typography variant="h6">{progressStats.completed}</Typography>
                <Typography variant="body2">Completed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                <Typography variant="h6">{progressStats.failed}</Typography>
                <Typography variant="body2">Failed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                <Typography variant="h6">{progressStats.totalChunks}</Typography>
                <Typography variant="body2">Total Chunks</Typography>
              </Paper>
            </Grid>
          </Grid>
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
            {scrapingProgress
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
          count={scrapingProgress?.length || 0}
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
  );

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
      fetchKnowledgeBase(); // Refresh the list
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
      setContentDialogOpen(true);
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
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Single URL" />
            <Tab label="Sitemap" />
            <Tab label="Upload" />
            <Tab label="Knowledge Base" />
          </Tabs>
        </Grid>

        {activeTab === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scrape Single URL
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Website URL"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      disabled={!selectedAgent || scraping}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleWebsiteScrape}
                      disabled={!selectedAgent || scraping || !websiteUrl}
                      startIcon={<WebIcon />}
                    >
                      Start Scraping
                    </Button>
                  </Grid>
                </Grid>
                {scraping && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                      Scraping in progress...
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {activeTab === 1 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scrape from Sitemap
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Sitemap URL"
                      value={sitemapUrl}
                      onChange={(e) => setSitemapUrl(e.target.value)}
                      placeholder="https://example.com/sitemap.xml"
                      disabled={!selectedAgent}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSitemapScrape}
                      disabled={!selectedAgent || !sitemapUrl}
                      startIcon={<MapIcon />}
                    >
                      Process Sitemap
                    </Button>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Scraping Progress</Typography>
                    <IconButton onClick={fetchScrapingProgress} disabled={loadingProgress}>
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                  {loadingProgress ? (
                    <LinearProgress />
                  ) : (
                    renderProgressTable()
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {activeTab === 2 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upload Files
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                  disabled={!selectedAgent || uploading}
                >
                  Upload Documents
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt"
                  />
                </Button>
                {uploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                      Upload Progress: {Math.round(uploadProgress)}%
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {activeTab === 3 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Knowledge Base Items ({knowledgeBaseItems.length})
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
                <List>
                  {knowledgeBaseItems.map((item) => (
                    <React.Fragment key={item._id}>
                      <ListItem
                        secondaryAction={
                          <Box>
                            <IconButton
                              edge="end"
                              aria-label="view"
                              onClick={() => handleViewContent(item._id)}
                              disabled={loadingContent}
                              sx={{ mr: 1 }}
                            >
                              {loadingContent ? (
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
                      >
                        <ListItemIcon>
                          {item.type === 'website' ? <WebIcon /> : <FileIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.source}
                          secondary={`Added: ${new Date(item.addedAt).toLocaleString()}`}
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
              </CardContent>
            </Card>
          </Grid>
        )}

        <Dialog
          open={contentDialogOpen}
          onClose={() => setContentDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { minHeight: '70vh' }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Content View
              </Typography>
              <Box>
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
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {loadingContent ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              selectedContent && (
                <Box sx={{ mt: 2 }}>
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setContentDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

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
}

export default KnowledgeBase; 