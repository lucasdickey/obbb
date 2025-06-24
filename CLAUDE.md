# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server  
- `npm run lint` - Run ESLint linter
- `npm run type-check` - Run TypeScript type checking (use this to validate changes)

### Testing
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode

### Data Processing
- `npm run fetch-hr1-data` - Download HR1 bill text data
- `npm run ingest` - Process HR1 text and create embeddings for Pinecone
- `npm run ingest:dry-run` - Test ingestion pipeline without API calls

## Architecture Overview

This is a RAG (Retrieval-Augmented Generation) application that enables semantic Q&A about the HR1 "One Big Beautiful Bill Act". 

### Core Architecture
1. **Document Processing**: HR1 text is chunked into ~500 token segments with overlap
2. **Embeddings**: OpenAI text-embedding-ada-002 creates vector representations
3. **Vector Storage**: Pinecone stores embeddings with metadata (Supabase as fallback)
4. **Query Processing**: User questions are embedded and matched against stored vectors
5. **Response Generation**: Relevant chunks provide context for LLM responses

### Key Components

#### API Route (`app/api/chat/route.ts`)
- Handles chat requests with configurable LLM providers
- Lazy-loads dependencies to prevent initialization errors
- Implements OpenAI/Groq fallback logic controlled by `PREFER_GROQ` env var
- Filters out `<think>` tags from DeepSeek-R1 responses
- Enforces structured response format: emoji bullets → prose explanation
- Includes comprehensive error handling and logging

#### Frontend (`components/Chat.tsx`)
- Single-page chat interface with peach/yellow/black theme
- Structures AI responses as: bullet points → prose → collapsible citations
- User messages left-aligned, AI responses with copy functionality
- Responsive design that hides landing image on mobile

#### Data Pipeline (`scripts/chunk_and_embed.ts`)
- Processes HR1 text into semantic chunks with token counting
- Extracts section metadata (Division A/B/C, Titles, etc.)
- Batch processing with rate limiting for API calls
- Supports dry-run mode for testing without API usage

### Environment Configuration

Required variables:
- `OPENAI_API_KEY` - For embeddings and LLM (required)
- `PINECONE_API_KEY` - Vector database (required)
- `PINECONE_INDEX_NAME` - Defaults to "obbb"

Optional variables:
- `GROQ_API_KEY` - Alternative LLM provider
- `PREFER_GROQ` - Set to "true" to use Groq first, OpenAI fallback
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` - Rate limiting
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` - Fallback vector store and logging

## Specific Implementation Details

### LLM Provider Logic
The app supports dual LLM providers with configurable preference:
- **Groq**: Uses `deepseek-r1-distill-llama-70b` (reasoning model)
- **OpenAI**: Uses `gpt-4o-mini`
- Fallback logic ensures availability even if one provider fails

### Response Format Enforcement
AI responses must follow this exact structure:
1. 3-5 emoji bullet points (each on new line)
2. Blank line
3. Detailed prose explanation (no bullets)

### Data Processing Pipeline
1. Load HR1 text from `data/hr1.txt`
2. Chunk into ~500 tokens with 50-token overlap
3. Generate embeddings via OpenAI
4. Store in Pinecone with metadata
5. Save processing summary to `data/hr1-chunks-summary.json`

### Error Handling Patterns
- Lazy initialization prevents startup failures
- Graceful degradation when services unavailable
- Comprehensive logging for debugging production issues
- Rate limiting with Redis to prevent abuse

## Testing and Validation

Always run type checking after making changes:
```bash
npm run type-check
```

For major changes, run the full test suite:
```bash
npm run test
```

Test the data pipeline without API calls:
```bash
npm run ingest:dry-run
```