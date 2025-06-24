import { GET } from './route';
import { NextRequest } from 'next/server';
import { existsSync, readFileSync } from 'fs';

// Mock dependencies
jest.mock('fs');
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

const mockFs = {
  existsSync: existsSync as jest.MockedFunction<typeof existsSync>,
  readFileSync: readFileSync as jest.MockedFunction<typeof readFileSync>
};

describe('GET /api/state-provisions/[state]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.PINECONE_API_KEY = 'test-key';
  });

  it('returns 400 for invalid state code', async () => {
    const request = new NextRequest('http://localhost:3000/api/state-provisions/XX');
    const response = await GET(request, { params: { state: 'XX' } });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid state code');
  });

  it('returns cached data when available', async () => {
    const cachedData = {
      state: 'California',
      stateCode: 'CA',
      provisionTypes: { funding: { count: 5 } },
      keyProvisions: [],
      totalProvisions: 5
    };
    
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(cachedData));
    
    const request = new NextRequest('http://localhost:3000/api/state-provisions/CA');
    const response = await GET(request, { params: { state: 'CA' } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.state).toBe('California');
    expect(data.cached).toBe(true);
  });

  it('returns 503 when services are not configured', async () => {
    delete process.env.OPENAI_API_KEY;
    
    const request = new NextRequest('http://localhost:3000/api/state-provisions/CA');
    const response = await GET(request, { params: { state: 'CA' } });
    
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toContain('AI services are not configured');
  });

  it('handles errors gracefully', async () => {
    mockFs.existsSync.mockReturnValue(false);
    
    // Mock Pinecone to throw an error
    const { initPinecone } = require('@/lib/pinecone');
    initPinecone.mockRejectedValueOnce(new Error('Pinecone error'));
    
    const request = new NextRequest('http://localhost:3000/api/state-provisions/CA');
    const response = await GET(request, { params: { state: 'CA' } });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Failed to analyze state provisions');
  });
});

describe('State code validation', () => {
  const validStates = ['CA', 'TX', 'NY', 'FL'];
  const invalidStates = ['XX', 'ZZ', '12', '', 'CAL'];
  
  validStates.forEach(state => {
    it(`accepts valid state code: ${state}`, async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      // Mock successful Pinecone query
      const { initPinecone } = require('@/lib/pinecone');
      const mockQuery = jest.fn().mockResolvedValue({ matches: [] });
      initPinecone.mockResolvedValue({
        index: jest.fn().mockReturnValue({
          namespace: jest.fn().mockReturnValue({
            query: mockQuery
          })
        })
      });
      
      const request = new NextRequest(`http://localhost:3000/api/state-provisions/${state}`);
      const response = await GET(request, { params: { state } });
      
      expect(response.status).not.toBe(400);
    });
  });
  
  invalidStates.forEach(state => {
    it(`rejects invalid state code: ${state}`, async () => {
      const request = new NextRequest(`http://localhost:3000/api/state-provisions/${state}`);
      const response = await GET(request, { params: { state } });
      
      expect(response.status).toBe(400);
    });
  });
});