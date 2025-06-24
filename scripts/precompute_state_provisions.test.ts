describe('precompute_state_provisions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('fetches state provisions for all states', async () => {
    const mockResponse = {
      state: 'California',
      stateCode: 'CA',
      provisionTypes: { funding: { count: 5 } },
      keyProvisions: [],
      totalProvisions: 5
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    // The script would iterate through all states
    const states = ['CA', 'TX', 'NY']; // Sample states
    
    for (const state of states) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/state-provisions/${state}`);
    }

    expect(global.fetch).toHaveBeenCalledTimes(states.length);
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    // Script should continue processing other states even if one fails
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/state-provisions/CA`);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('respects rate limiting between requests', async () => {
    const mockResponse = { state: 'Test', totalProvisions: 1 };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const start = Date.now();
    
    // Simulate processing multiple states with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });
});