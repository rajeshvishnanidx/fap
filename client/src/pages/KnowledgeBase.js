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
} from '@mui/material';
import {
  Language as WebIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Description as FileIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

function KnowledgeBase() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scrapingProgress, setScrapingProgress] = useState(0);
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

  useEffect(() => {
    fetchAgents();
    if (selectedAgent) {
      fetchKnowledgeBase();
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Agent
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="AI Agent"
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="">Select an agent</option>
                    {agents.map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {agent.name}
                      </option>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Website Scraping
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

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Knowledge Base Items
              </Typography>
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

        <Dialog
          open={contentDialogOpen}
          onClose={() => setContentDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Processed Content
            {selectedContent && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={`Source: ${selectedContent.metadata.source}`}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`Type: ${selectedContent.metadata.type}`}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`Chunks: ${selectedContent.metadata.chunks}`}
                  size="small"
                />
              </Box>
            )}
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
                    <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="body2">{chunk}</Typography>
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