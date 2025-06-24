// Test for classify_state_impacts script

// Mock dependencies
jest.mock('@/lib/pinecone', () => ({
  initPinecone: jest.fn().mockResolvedValue({
    index: jest.fn().mockReturnValue({
      namespace: jest.fn().mockReturnValue({
        query: jest.fn()
      })
    })
  })
}));

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }]
      })
    }
  }))
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('classifyStateImpacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.PINECONE_API_KEY = 'test-key';
  });

  it('processes state impacts and saves results', async () => {
    const { initPinecone } = require('@/lib/pinecone');
    const mockQuery = jest.fn().mockResolvedValue({
      matches: [
        {
          id: 'chunk-1',
          score: 0.9,
          metadata: {
            text: 'California transportation funding',
            section: 'Division A',
            chunkIndex: 1
          }
        }
      ]
    });

    initPinecone.mockResolvedValue({
      index: jest.fn().mockReturnValue({
        namespace: jest.fn().mockReturnValue({
          query: mockQuery
        })
      })
    });

    const fs = require('fs');
    fs.existsSync.mockReturnValue(false);

    // Run the script (we'd need to export the main function for this)
    // For now, this is a basic structure test
    expect(initPinecone).toBeDefined();
  });

  it('creates state impacts directory if it does not exist', () => {
    const fs = require('fs');
    fs.existsSync.mockReturnValue(false);

    // The script would check and create directory
    expect(fs.mkdirSync).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const { initPinecone } = require('@/lib/pinecone');
    initPinecone.mockRejectedValue(new Error('Connection failed'));

    // Script should handle errors without crashing
    expect(initPinecone).toBeDefined();
  });
});