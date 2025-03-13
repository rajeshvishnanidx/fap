const { Pinecone } = require('@pinecone-database/pinecone');

class VectorStore {
  constructor() {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    if (!process.env.PINECONE_INDEX) {
      throw new Error('PINECONE_INDEX environment variable is not set');
    }

    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      
      console.log('Pinecone client initialized');
      
      this.index = this.pinecone.Index(process.env.PINECONE_INDEX);
      console.log('Pinecone index initialized:', process.env.PINECONE_INDEX);

      // Verify index configuration
      this.verifyIndex();
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      throw new Error(`Failed to initialize Pinecone: ${error.message}`);
    }
  }

  async verifyIndex() {
    try {
      console.log('Verifying Pinecone index configuration...');
      
      // Attempt to describe the index
      const description = await this.index.describeIndexStats();
      console.log('Index description:', description);

      // Verify the index exists and is ready
      if (!description) {
        throw new Error('Index not found. Please create the index in Pinecone dashboard first.');
      }

      // Log index statistics
      console.log('Index statistics:', {
        dimension: description.dimension,
        indexFullness: description.indexFullness,
        totalVectorCount: description.totalVectorCount,
        namespaces: Object.keys(description.namespaces || {})
      });

    } catch (error) {
      console.error('Error verifying Pinecone index:', error);
      if (error.response?.status === 404) {
        throw new Error(`Pinecone index '${process.env.PINECONE_INDEX}' not found. Please create it in the Pinecone dashboard.`);
      }
      throw new Error(`Failed to verify Pinecone index: ${error.message}`);
    }
  }

  async upsertVectors(vectors, metadata) {
    try {
      console.log(`Upserting ${vectors.length} vectors to Pinecone`);
      
      if (!vectors || vectors.length === 0) {
        throw new Error('No vectors provided for upserting');
      }

      if (!metadata || !metadata.agentId || !metadata.type || !metadata.timestamp) {
        throw new Error('Missing required metadata fields');
      }

      const MAX_METADATA_SIZE = 35000; // Leave some buffer from the 40KB limit

      const records = vectors.map((vector, i) => {
        if (!vector || !Array.isArray(vector)) {
          throw new Error(`Invalid vector at index ${i}`);
        }

        // Get the chunk text
        const text = metadata.texts[i];
        
        // Calculate approximate byte size of text
        const textByteSize = new TextEncoder().encode(text).length;
        
        // Truncate text if it exceeds the limit
        let truncatedText = text;
        if (textByteSize > MAX_METADATA_SIZE) {
          // Convert to UTF-8 bytes, truncate, and convert back to string
          const encoder = new TextEncoder();
          const decoder = new TextDecoder('utf-8');
          const encoded = encoder.encode(text);
          truncatedText = decoder.decode(encoded.slice(0, MAX_METADATA_SIZE));
          
          // Find last complete word
          const lastSpace = truncatedText.lastIndexOf(' ');
          if (lastSpace > 0) {
            truncatedText = truncatedText.substring(0, lastSpace);
          }
          
          truncatedText += ' [truncated]';
          console.log(`Truncated text for chunk ${i} from ${textByteSize} to ${new TextEncoder().encode(truncatedText).length} bytes`);
        }

        return {
          id: `${metadata.agentId}-${metadata.type}-${metadata.timestamp}-${i}`,
          values: vector,
          metadata: {
            agentId: metadata.agentId,
            userId: metadata.userId,
            type: metadata.type,
            source: metadata.source,
            timestamp: metadata.timestamp,
            chunkIndex: i,
            text: truncatedText,
            isDeleted: false,
          },
        };
      });

      console.log('Prepared records for upsert:', {
        count: records.length,
        sampleId: records[0].id,
        vectorDimension: records[0].values.length,
      });

      await this.index.upsert(records);
      console.log('Successfully upserted vectors to Pinecone');
      return true;
    } catch (error) {
      console.error('Error upserting vectors:', error);
      if (error.response) {
        console.error('Pinecone API error response:', error.response.data);
      }
      throw new Error(`Failed to upsert vectors: ${error.message}`);
    }
  }

  async queryVectors(queryVector, filter = {}, topK = 5) {
    try {
      console.log('Querying vectors with filter:', filter);
      
      if (!queryVector || !Array.isArray(queryVector)) {
        throw new Error('Invalid query vector');
      }

      const queryFilter = { ...filter, isDeleted: false };

      const queryResult = await this.index.query({
        vector: queryVector,
        filter: queryFilter,
        topK,
        includeMetadata: true,
      });

      console.log(`Found ${queryResult.matches.length} matches`);
      return queryResult.matches.map(match => ({
        text: match.metadata.text,
        score: match.score,
        metadata: match.metadata,
      }));
    } catch (error) {
      console.error('Error querying vectors:', error);
      if (error.response) {
        console.error('Pinecone API error response:', error.response.data);
      }
      throw new Error(`Failed to query vectors: ${error.message}`);
    }
  }

  async deleteVectors(filter) {
    try {
      console.log('Soft deleting vectors with filter:', filter);
      
      if (!filter || Object.keys(filter).length === 0) {
        throw new Error('No filter provided for deletion');
      }

      // Query existing vectors
      const queryVector = Array(1536).fill(0.1);
      const results = await this.index.query({
        vector: queryVector,
        filter: filter,  // Use the provided filter directly
        topK: 10000,
        includeValues: true,  // Important: get the actual vector values
        includeMetadata: true
      });

      const matchingVectors = results.matches;

      if (matchingVectors.length > 0) {
        console.log(`Found ${matchingVectors.length} matching vectors to soft delete`);
        
        const updates = matchingVectors.map(match => ({
          id: match.id,
          values: match.values, // Use the original vector values
          metadata: {
            ...match.metadata,
            isDeleted: true
          }
        }));

        // Batch updates in chunks of 100
        const batchSize = 100;
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);
          await this.index.upsert(batch);
          console.log(`Soft deleted batch of ${batch.length} vectors`);
        }
        
        console.log(`Successfully soft deleted ${updates.length} vectors in Pinecone`);
      } else {
        console.log('No vectors found matching the filter criteria');
      }
      
      return true;
    } catch (error) {
      console.error('Error soft deleting vectors:', error);
      if (error.response) {
        console.error('Pinecone API error response:', error.response.data);
      }
      throw new Error(`Failed to soft delete vectors: ${error.message}`);
    }
  }

  async getVectors(filter) {
    try {
      console.log('Getting vectors with filter:', filter);
      
      if (!filter || Object.keys(filter).length === 0) {
        throw new Error('No filter provided for getting vectors');
      }

      // Create a dummy query vector (required by Pinecone)
      const queryVector = Array(1536).fill(0.1);
      
      // Query with a high topK to get all matching vectors
      const results = await this.index.query({
        vector: queryVector,
        filter: { ...filter, isDeleted: false },
        topK: 10000,
        includeMetadata: true
      });

      console.log(`Found ${results.matches.length} vectors`);
      
      // Sort by chunkIndex to maintain original order
      const sortedMatches = results.matches.sort((a, b) => 
        a.metadata.chunkIndex - b.metadata.chunkIndex
      );

      return sortedMatches.map(match => ({
        text: match.metadata.text,
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Error getting vectors:', error);
      if (error.response) {
        console.error('Pinecone API error response:', error.response.data);
      }
      throw new Error(`Failed to get vectors: ${error.message}`);
    }
  }
}

// Create and export a singleton instance
const vectorStore = new VectorStore();
module.exports = vectorStore; 