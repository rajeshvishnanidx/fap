/**
 * Vector utility functions for embedding similarity calculations
 */

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vector1 First vector
 * @param {Array<number>} vector2 Second vector
 * @returns {number} Cosine similarity between vectors (-1 to 1)
 */
function cosineSimilarity(vector1, vector2) {
  if (!vector1 || !vector2 || !Array.isArray(vector1) || !Array.isArray(vector2)) {
    throw new Error('Invalid vectors provided');
  }
  
  if (vector1.length !== vector2.length) {
    throw new Error(`Vector dimensions don't match: ${vector1.length} vs ${vector2.length}`);
  }
  
  // Calculate dot product
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  
  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  // Return cosine similarity
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Find best match from a list of vectors based on cosine similarity
 * @param {Array<number>} queryVector The query vector to compare against
 * @param {Array<{vector: Array<number>, data: any}>} vectorItems List of vectors with associated data
 * @param {number} threshold Similarity threshold (0 to 1)
 * @returns {Object|null} Best matching item or null if no match above threshold
 */
function findBestMatch(queryVector, vectorItems, threshold = 0.8) {
  if (!queryVector || !vectorItems || !Array.isArray(vectorItems)) {
    return null;
  }
  
  // No vectors to compare
  if (vectorItems.length === 0) {
    return null;
  }
  
  // Calculate similarities for all items
  const withSimilarities = vectorItems.map(item => ({
    ...item,
    similarity: cosineSimilarity(queryVector, item.vector)
  }));
  
  // Sort by similarity (highest first)
  withSimilarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return best match if above threshold
  if (withSimilarities[0].similarity >= threshold) {
    return withSimilarities[0];
  }
  
  return null;
}

/**
 * Sort items by similarity to a query vector
 * @param {Array<number>} queryVector The query vector to compare against
 * @param {Array<{vector: Array<number>, data: any}>} vectorItems List of vectors with associated data
 * @returns {Array} Items sorted by similarity (highest first)
 */
function rankBySimilarity(queryVector, vectorItems) {
  if (!queryVector || !vectorItems || !Array.isArray(vectorItems)) {
    return [];
  }
  
  // Calculate similarities for all items
  const withSimilarities = vectorItems.map(item => ({
    ...item,
    similarity: cosineSimilarity(queryVector, item.vector)
  }));
  
  // Sort by similarity (highest first)
  return withSimilarities.sort((a, b) => b.similarity - a.similarity);
}

module.exports = {
  cosineSimilarity,
  findBestMatch,
  rankBySimilarity
}; 