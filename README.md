# HR1 Semantic Q&A Assistant

A web-based chat interface that allows natural language querying of the HR1 legislative bill using AI-powered semantic search and retrieval-augmented generation (RAG).

## Project Overview

This application provides an intelligent Q&A interface for exploring the "For the People Act of 2021" (HR1), a comprehensive voting rights, campaign finance, and ethics reform bill. Users can ask natural language questions and receive AI-generated answers based on semantic search through the bill's content.

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API routes
- **Vector Store**: Pinecone (primary), Supabase pgvector (fallback)
- **Embedding Model**: OpenAI text-embedding-ada-002
- **LLM**: OpenAI GPT-3.5 Turbo (default), GPT-4 optional
- **UI**: Tailwind CSS
- **Data Format**: Plain text chunks with metadata

## Features

- 🤖 AI-powered question answering about HR1
- 🔍 Semantic search through bill content
- 📱 Responsive chat interface
- 📖 Citation traceability with source references
- ⚡ Real-time streaming responses
- 🎯 Contextually relevant answers

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

### Architecture

The application follows a standard RAG (Retrieval-Augmented Generation) pattern:

1. **Document Processing**: HR1 text is split into ~500 token chunks with overlap
2. **Embedding**: Each chunk is vectorized using OpenAI embeddings
3. **Storage**: Vectors stored in Pinecone with metadata
4. **Query Processing**: User questions are embedded and matched against stored vectors
5. **Generation**: Relevant chunks provide context for LLM to generate answers

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application:

```bash
npm run build
```

2. Deploy the `.next` folder to your hosting provider

## API Endpoints

- `POST /api/chat` - Main chat endpoint for Q&A
- Additional endpoints for health checks and monitoring (planned)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- HR1 bill text from GovTrack.us
- Built with Vercel AI SDK
- Powered by OpenAI and Pinecone
