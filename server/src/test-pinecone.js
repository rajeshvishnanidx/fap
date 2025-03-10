require('dotenv').config();
const vectorStore = require('./utils/vectorStore');

async function testVectorStore() {
  try {
    console.log('Testing vector store operations...');

    // Create test vectors and metadata
    const vectors = [
      Array(1536).fill(0.1),
      Array(1536).fill(0.2)
    ];
    
    const metadata = {
      agentId: 'test-agent-123',
      userId: 'test-user-456',
      type: 'test',
      source: 'test-file.txt',
      timestamp: new Date().toISOString(),
      texts: [
        'This is test chunk 1',
        'This is test chunk 2'
      ]
    };

    // Test upsert
    console.log('\nTesting vector upsert...');
    await vectorStore.upsertVectors(vectors, metadata);

    // Test query before deletion
    console.log('\nTesting vector query before deletion...');
    let queryResults = await vectorStore.queryVectors(vectors[0], {
      agentId: metadata.agentId,
      type: metadata.type
    }, 5);
    console.log('Query results before deletion:', JSON.stringify(queryResults, null, 2));

    // Test soft delete
    console.log('\nTesting vector soft deletion...');
    await vectorStore.deleteVectors({
      agentId: metadata.agentId,
      type: metadata.type
    });

    // Test query after deletion
    console.log('\nTesting vector query after deletion...');
    queryResults = await vectorStore.queryVectors(vectors[0], {
      agentId: metadata.agentId,
      type: metadata.type
    }, 5);
    console.log('Query results after deletion:', JSON.stringify(queryResults, null, 2));

    console.log('\nAll vector store operations completed successfully!');
  } catch (error) {
    console.error('Error testing vector store:', error);
  }
}

testVectorStore(); 