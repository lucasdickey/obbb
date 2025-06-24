# OB3.chat HR1 Assistant

A web-based chat interface that allows natural language querying of the HR1 legislative bill using AI-powered semantic search and retrieval-augmented generation (RAG).

## What's New (June 2025)

### UI/UX Improvements
- **Modern, Compact UI**: Chat and landing interface redesigned for a compact, single-page fit.
- **Color Scheme**: Updated to a peach/yellow/black palette for accessibility (replaces original blue).
- **User Prompt Styling**: User prompts are visually distinct, left-aligned, and do not have a copy icon.
- **AI Response Structure**: Each answer is structured as: bullet summary → prose summary → citations.
- **Copy-to-Clipboard**: Copying an answer also copies the user's question; improved logic and placement of copy buttons.
- **Loading Indicator**: Animated ellipsis and a yellow-dot Lucide spinner for loading state.
- **Citations**: Collapsed by default, expandable with Lucide icons. Copy button moved to the upper right of each source. Pill-shaped containers for bullet numbers (bold, no shading) and relevancy scores (distinct color).
- **Input Field**: Improved spacing between input and Send button.
- **General Spacing**: Reduced padding/margins and font sizes for a denser, more accessible layout.
- **Accessibility**: Improved color contrast and keyboard navigation.

### State-Specific Impact Analysis (NEW)
- **🏛️ State Filtering**: Users can filter HR1 provisions by how they impact their specific state
- **🔍 Smart Classification**: AI-powered analysis identifies state-specific impacts in bill text
- **💰 Cost-Optimized Pipeline**: Pre-filtering reduces processing by 40-60%, keeping costs under $1
- **📊 Comprehensive Coverage**: Analysis covers funding, infrastructure, jobs, regulations, and economic impacts
- **⚡ Batch Processing**: Efficient GPT-4o-mini classification with caching and resumability
- **📈 Impact Tracking**: Detailed analytics on which states are most affected by different provisions

### Technical Improvements
- **Removed Files**: `test-api.js` and `test-pinecone.js` have been deleted.

## Project Overview

This application provides an intelligent Q&A interface for exploring the "For the People Act of 2021" (HR1), a comprehensive voting rights, campaign finance, and ethics reform bill. Users can ask natural language questions and receive AI-generated answers based on semantic search through the bill's content.

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API routes
- **Vector Store**: Pinecone (primary), Supabase pgvector (fallback)
- **Embedding Model**: OpenAI text-embedding-ada-002
- **LLM**: OpenAI o3 (latest reasoning model)
- **UI**: Tailwind CSS
- **Data Format**: Plain text chunks with metadata

## Features

- 🤖 AI-powered question answering about HR1
- 🔍 Semantic search through bill content
- 🏛️ **State-specific filtering** to find provisions impacting your state
- 📱 Responsive, compact, and accessible chat interface
- 🎨 Peach/yellow/black color scheme for high accessibility
- 💬 User prompts are visually distinct and left-aligned
- 📝 AI answers structured as bullet summary, prose, and citations
- 📋 Copy-to-clipboard for both question and answer
- 📖 Citation traceability with source references, collapsed by default and expandable
- ⚡ Real-time streaming responses with animated loading indicator
- 🎯 Contextually relevant answers with pill-shaped relevancy scores
- 🏷️ Pill-shaped, bold bullet numbers (no shading)
- 🖱️ Lucide icons for expand/collapse and copy actions
- 📊 **State impact analytics** showing which provisions affect different states

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key
- Pinecone API key

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hr1-semantic-qa
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp env.example .env.local
```

Then edit `.env.local` with your API keys:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=hr1-semantic-search
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Data Ingestion

Before the application can answer questions, you need to ingest the HR1 bill text:

1. Download and prepare the HR1 text:

```bash
npm run fetch-hr1-data
```

2. Process and embed the text chunks:

```bash
npm run ingest
```

For a dry run without API calls:

```bash
npm run ingest:dry-run
```

## Project Structure

```
hr1-semantic-qa/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
├── data/                  # Data files (HR1 text)
├── lib/                   # Utility functions
├── scripts/               # Data processing scripts
├── types/                 # TypeScript type definitions
└── runbooks/              # Project documentation
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run ingest` - Process and embed HR1 text
- `npm run ingest:dry-run` - Test ingestion without API calls

### State Impact Analysis Scripts
- `tsx scripts/classify_state_impacts.ts --review --limit=10` - Review sample chunks before processing
- `tsx scripts/classify_state_impacts.ts --dry-run` - Test state classification pipeline without API calls
- `tsx scripts/classify_state_impacts.ts --limit=20` - Run classification on limited subset (e.g., 20 chunks)
- `tsx scripts/classify_state_impacts.ts` - Run full state impact classification
- `tsx scripts/classify_state_impacts.ts --update-metadata` - Update Pinecone with state metadata

### Architecture

The application follows a standard RAG (Retrieval-Augmented Generation) pattern:

1. **Document Processing**: HR1 text is split into ~500 token chunks with overlap
2. **Embedding**: Each chunk is vectorized using OpenAI embeddings
3. **Storage**: Vectors stored in Pinecone with metadata
4. **Query Processing**: User questions are embedded and matched against stored vectors
5. **Generation**: Relevant chunks provide context for LLM to generate answers

## Deployment

### Vercel (Recommended)

This project is optimized for Vercel deployment with included `vercel.json` configuration.

#### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ob3-chat)

#### Manual Deployment

1. **Connect Repository**

   ```bash
   npx vercel --prod
   ```

2. **Environment Variables**

   Configure these variables in your Vercel dashboard:

   **Required:**

   - `OPENAI_API_KEY` - Your OpenAI API key
   - `PINECONE_API_KEY` - Your Pinecone API key
   - `PINECONE_ENVIRONMENT` - Your Pinecone environment URL
   - `PINECONE_INDEX_NAME` - Pinecone index name (default: `obbb`)

   **Optional (for rate limiting):**

   - `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
   - `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token

3. **Domain Configuration**

   Update the `NEXT_PUBLIC_APP_URL` if using a custom domain:

   ```
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```
