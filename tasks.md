Project: HR1 Semantic Q&A Assistant Goal
Build a minimal viable product (MVP) for a web-based chat interface that allows natural language querying of the HR1 legislative bill. The system will use semantic search (via vector embeddings) and LLM-generated answers based only on retrieved HR1 content.

Project Structure
• Frontend: Next.js (deployed via Vercel)
• Backend: Next.js API routes (Node.js / TypeScript)
• Vector Store: Pinecone (preferred), with optional fallback to Supabase pgvector
• Embedding Model: OpenAI text-embedding-ada-002
• LLM for Q&A: OpenAI o3 (latest reasoning model)
• Data Format: Plain text chunks of HR1 with metadata

Tasks

🗂 Project Setup
• [ ] Create a new Next.js 13+ project with TypeScript
• [ ] Initialize git repository and create .gitignore
• [ ] Configure .env.local with API keys for OpenAI and Pinecone
• [ ] Create .env.example with placeholder values for documentation
• [ ] Install required packages: openai, @pinecone-database/pinecone, @vercel/ai, react-markdown, dotenv
• [ ] Install dev dependencies: @types/node, eslint, prettier
• [ ] Set up Tailwind CSS for styling (optional but recommended)
• [ ] Configure TypeScript strict mode and ESLint rules
• [ ] Create /data/hr1.txt with plain text version of the bill
• [ ] Set up basic error boundary component for React

📊 HR1 Document Ingestion
• [ ] Create scripts/chunk_and_embed.ts
• [ ] Implement text preprocessing (remove extra whitespace, normalize formatting)
• [ ] Load HR1 text from /data/hr1.txt
• [ ] Split into ~500 token chunks with ~50 token overlap
• [ ] Implement smart chunking that respects sentence boundaries
• [ ] Use OpenAI embeddings to vectorize each chunk
• [ ] Add retry logic for API calls with exponential backoff
• [ ] Upsert chunks to Pinecone with metadata (chunk ID, text, section heading, page number, chunk position)
• [ ] Implement progress bar for chunking process
• [ ] Log progress and errors for verification
• [ ] Create validation script to verify all chunks were properly embedded
• [ ] Add dry-run mode for testing without API calls

🔍 Semantic Search + RAG API
• [ ] Implement /app/api/chat/route.ts as POST endpoint
• [ ] Add input validation and sanitization
• [ ] Implement rate limiting middleware (e.g., using upstash/ratelimit)
• [ ] Accept user query as input
• [ ] Add query length limits and validation
• [ ] Embed user query with OpenAI
• [ ] Implement caching for repeated queries
• [ ] Perform similarity search in Pinecone
• [ ] Add fallback to Supabase pgvector if Pinecone fails
• [ ] Retrieve top 3–5 relevant chunks
• [ ] Implement relevance threshold to filter low-quality matches
• [ ] Construct a prompt with retrieved context and question
• [ ] Add prompt engineering for better citation formatting
• [ ] Call OpenAI GPT for streaming completion
• [ ] Implement timeout handling for long-running requests
• [ ] Return assistant response along with list of cited HR1 chunks
• [ ] Add response time logging and monitoring

💬 Frontend Chat UI
• [ ] Create ChatPage in /app/page.tsx
• [ ] Implement responsive design for mobile/tablet/desktop
• [ ] Display user/assistant messages in chat format
• [ ] Add loading states with skeleton UI
• [ ] Add error states with user-friendly messages
• [ ] Input box for entering questions
• [ ] Add character limit indicator
• [ ] Implement "Enter to send, Shift+Enter for new line"
• [ ] Use @vercel/ai useChat for request/response streaming
• [ ] Add abort functionality for in-progress requests
• [ ] Render assistant responses using react-markdown
• [ ] Add syntax highlighting for any code blocks
• [ ] Display citations below assistant messages with expandable section text
• [ ] Add "Copy to clipboard" for responses
• [ ] Implement chat history with localStorage
• [ ] Add "Clear chat" functionality
• [ ] Add accessibility features (ARIA labels, keyboard navigation)
• [ ] Implement auto-scroll to latest message

🧪 Testing & Quality Assurance
• [ ] Set up Jest and React Testing Library
• [ ] Write unit tests for chunking algorithm
• [ ] Write unit tests for API endpoint logic
• [ ] Add integration tests for chat flow
• [ ] Test error scenarios (API failures, rate limits)
• [ ] Add performance benchmarks for search
• [ ] Create test dataset of common HR1 questions

🔒 Security & Performance
• [ ] Implement CORS configuration
• [ ] Add security headers (CSP, X-Frame-Options, etc.)
• [ ] Set up API request logging (without sensitive data)
• [ ] Implement cost tracking for OpenAI API usage
• [ ] Add monitoring for API response times
• [ ] Set up error tracking (e.g., Sentry)
• [ ] Implement request throttling per user/IP

🚀 Deployment
• [ ] Create production environment variables
• [ ] Deploy site to Vercel
• [ ] Configure custom domain (if applicable)
• [ ] Add required secrets (OpenAI, Pinecone keys) to Vercel environment
• [ ] Set up preview deployments for PRs
• [ ] Test chat interface end-to-end
• [ ] Validate citation traceability
• [ ] Create basic monitoring dashboard
• [ ] Set up uptime monitoring

📚 Documentation
• [ ] Create README.md with setup instructions
• [ ] Document API endpoints and request/response formats
• [ ] Add inline code comments for complex logic
• [ ] Create user guide for the chat interface
• [ ] Document chunking strategy and parameters

Stretch Goals (Optional)
• [ ] Claude integration toggle
• [ ] Sidebar or inline full HR1 viewer
• [ ] Chat UI enhancements (e.g., citation highlighting)
• [ ] Admin-only ingestion trigger (for future docs)
• [ ] Export chat history as PDF/Markdown
• [ ] Add voice input support
• [ ] Implement semantic caching for similar queries
• [ ] Add analytics for popular questions
• [ ] Multi-language support
• [ ] Dark mode toggle

Phase 2: Senatorial Value Alignment Layer (Optional)
Purpose
Compare the content of HR1 with campaign promises or stated values from each currently sitting Senate member, based on content scraped from their official or campaign websites.

Tasks
• [ ] Scrape senate.gov member list and individual pages
• [ ] Extract value/policy statements from .gov or campaign domains
• [ ] Embed statements using OpenAI embeddings
• [ ] Store with metadata: { name, party, district, text, url }
• [ ] Enable semantic comparison between HR1 sections and member values
• [ ] Add UI to explore alignment/conflict by rep, party, state, or issue

Future Enhancements
• [ ] Score alignment/conflict as a semantic distance metric
• [ ] Offer summary per representative's consistency with HR1
• [ ] Track document freshness or cache updates

🏛️ State-Specific Impact Analysis (New Feature)
Purpose
Add state-specific metadata to HR1 chunks to enable users to filter content by how it impacts their state. This allows citizens to quickly find provisions that directly affect their state's economy, rights, infrastructure, or federal programs.

Phase 1: Analysis & Preparation
• [ ] Export existing chunks from Pinecone to analyze patterns
• [ ] Manually review 50-100 chunks to identify state impact patterns
• [ ] Create classification criteria document defining "state impact"
• [ ] Identify keyword patterns for pre-filtering (funding, grants, infrastructure, etc.)
• [ ] Design prompt templates optimized for token efficiency
• [ ] Set up cost tracking spreadsheet for API usage

Phase 2: Classification Pipeline Development
• [ ] Create scripts/classify_state_impacts.ts
• [ ] Implement chunk export from Pinecone with pagination
• [ ] Build pre-filtering logic to exclude obvious non-impact chunks:
  - Procedural language (definitions, effective dates, etc.)
  - International relations without domestic impact
  - Generic federal regulations without state specificity
• [ ] Implement two-stage classification:
  - Stage 1: Binary classification (has state impact: yes/no)
  - Stage 2: State identification for impacted chunks
• [ ] Create batch processing with 5-10 chunks per API call
• [ ] Add GPT-4o-mini integration for cost-effective classification
• [ ] Implement regex/keyword matching for obvious cases:
  - Explicit state mentions
  - Federal funding formulas
  - Infrastructure projects by region
• [ ] Add progress tracking and resumability
• [ ] Create validation dataset for accuracy testing
• [ ] Implement caching to avoid reprocessing
• [ ] Add dry-run mode for testing

Phase 3: Pinecone Metadata Update
• [ ] Design new metadata schema with "states" array field
• [ ] Create backup of existing Pinecone data
• [ ] Implement batch update logic for Pinecone vectors
• [ ] Add verification step to ensure updates are successful
• [ ] Create rollback capability in case of errors
• [ ] Update data ingestion script for future chunks

Phase 4: Frontend State Filtering
• [ ] Add state selector dropdown to Chat component
• [ ] Implement all 50 states + DC + territories
• [ ] Create "My State" preference with localStorage
• [ ] Modify search query to include state metadata filter
• [ ] Update prompt engineering to mention state context
• [ ] Add visual indicator showing state filter is active
• [ ] Create "nationwide impact" option for federal-level queries
• [ ] Add state impact badges to citation display

Phase 5: Testing & Optimization
• [ ] Test classification accuracy on validation set
• [ ] Measure API costs and optimize prompts
• [ ] Performance test filtered queries
• [ ] User test state selection UX
• [ ] Create documentation for state impact criteria

Cost Optimization Strategies
• Use GPT-4o-mini ($0.15/1M input, $0.60/1M output tokens)
• Aggressive pre-filtering to reduce chunks by 40-60%
• Batch processing (5-10 chunks per API call)
• Regex/keyword matching for obvious cases (save 20-30% API calls)
• Cache all classifications to avoid reprocessing
• Skip chunks under 100 tokens (usually boilerplate)

Estimated Costs
• Assuming ~2000 chunks after filtering
• ~200-400 API calls with batching
• Estimated tokens: ~500K input, ~100K output
• Total cost: ~$0.15 (very affordable!)

Implementation Order
1. Build and test classification pipeline locally
2. Process chunks in small batches to validate approach
3. Run full classification after validation
4. Update Pinecone metadata
5. Implement frontend changes
6. Deploy and monitor

Success Metrics
• [ ] 90%+ classification accuracy on validation set
• [ ] Total API costs under $1
• [ ] State filtering reduces results by 60-80% on average
• [ ] User feedback shows improved relevance

Notes
• Use AWS credits only if Pinecone or embedding workloads exceed free tiers
• Chunking and ingestion is one-time; no recurring job needed
• Citations must be shown with each model response for transparency
• Text chunks should be capped to ~1000 tokens with overlap to maintain coherence
• Consider implementing a feedback mechanism for answer quality
• Monitor costs closely, especially during development

Next Steps
• [ ] Finalize clean HR1 plain text file
• [ ] Run chunking + embedding script once to populate Pinecone index
• [ ] Implement API route to power question answering
• [ ] Build chat UI and test citation formatting
• [ ] Conduct user testing with sample queries
