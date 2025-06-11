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
