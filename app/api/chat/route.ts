import { NextRequest, NextResponse } from "next/server";

// Lazy load dependencies to prevent initialization errors
let openai: any = null;
let pinecone: any = null;
let ratelimit: any = null;

async function initializeOpenAI() {
  if (!openai) {
    try {
      const OpenAI = (await import("openai")).default;
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not configured");
      }
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (error) {
      console.error("Failed to initialize OpenAI:", error);
      throw error;
    }
  }
  return openai;
}

async function initializePinecone() {
  if (!pinecone) {
    try {
      const { Pinecone } = await import("@pinecone-database/pinecone");
      if (!process.env.PINECONE_API_KEY) {
        throw new Error("PINECONE_API_KEY not configured");
      }
      pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });
    } catch (error) {
      console.error("Failed to initialize Pinecone:", error);
      throw error;
    }
  }
  return pinecone;
}

async function initializeRateLimit() {
  if (
    !ratelimit &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");

      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
      });
    } catch (error) {
      console.error("Failed to initialize rate limiting:", error);
      // Rate limiting is optional, so don't throw
    }
  }
  return ratelimit;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

interface CitationSource {
  id: string;
  text: string;
  section?: string;
  chunkIndex: number;
  score: number;
}

interface ChatResponse {
  response: string;
  sources: CitationSource[];
  processingTime: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting (optional)
    const rateLimiter = await initializeRateLimit();
    if (rateLimiter) {
      const ip = req.ip ?? "127.0.0.1";
      const { success } = await rateLimiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    const body: ChatRequest = await req.json();
    const { messages } = body;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    const query = userMessage.content.trim();
    if (!query || query.length > 1000) {
      return NextResponse.json(
        { error: "Query must be between 1 and 1000 characters" },
        { status: 400 }
      );
    }

    // Check if AI services are available
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasPinecone = !!process.env.PINECONE_API_KEY;

    if (!hasOpenAI || !hasPinecone) {
      return NextResponse.json({
        response: `I'm currently unable to process your question about "${query}" because some AI services are not configured. Please contact the administrator to set up the required API keys.`,
        sources: [],
        processingTime: Date.now() - startTime,
      });
    }

    try {
      // Initialize services
      const openaiClient = await initializeOpenAI();
      const pineconeClient = await initializePinecone();

      // Step 1: Generate embedding for the user query
      const embeddingResponse = await openaiClient.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Step 2: Search Pinecone for relevant chunks
      const index = pineconeClient.index(
        process.env.PINECONE_INDEX_NAME || "obbb"
      );
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
        includeValues: false,
      });

      // Step 3: Filter and format results
      const relevantChunks = searchResponse.matches
        .filter((match: any) => (match.score || 0) > 0.7) // Relevance threshold
        .map((match: any) => ({
          id: match.id,
          text: match.metadata?.text as string,
          section: match.metadata?.section as string,
          chunkIndex: match.metadata?.chunkIndex as number,
          score: match.score || 0,
        }))
        .filter((chunk: any) => chunk.text && chunk.text.length > 0);

      if (relevantChunks.length === 0) {
        return NextResponse.json({
          response:
            "I couldn't find relevant information in the HR1 bill to answer your question. Please try rephrasing your question or asking about a different aspect of the bill.",
          sources: [],
          processingTime: Date.now() - startTime,
        });
      }

      // Step 4: Generate response with structured format
      const prompt = `You are a helpful assistant answering questions about the HR1 "One Big Beautiful Bill Act" (119th Congress). 

Based on the following relevant excerpts from the bill, provide a comprehensive answer with this EXACT structure:

FIRST: 3-5 bullet points starting with "•" (each on a new line)
THEN: A blank line
THEN: A detailed prose explanation (multiple sentences, no bullets)

Question: ${query}

Relevant excerpts from HR1:
${relevantChunks.map((chunk: any, i: number) => `[${i + 1}] ${chunk.text}`).join("\n\n")}

EXAMPLE FORMAT:
• Key point about the bill's main provision
• Another important aspect mentioned in the excerpts  
• Third key finding from the text
• Additional detail if relevant

This is the detailed explanation that expands on the bullet points above. It should be written in paragraph form without any bullet points, providing comprehensive context and analysis based on the excerpts provided.`;

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o as fallback until o3 is generally available
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable legislative assistant. You MUST follow the exact format: bullet points first (each starting with •), then a blank line, then prose explanation. Never mix bullets and prose together.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.1,
      });

      const response =
        completion.choices[0]?.message?.content || "No response generated";

      // Step 5: Return response with citations
      const chatResponse: ChatResponse = {
        response,
        sources: relevantChunks,
        processingTime: Date.now() - startTime,
      };

      return NextResponse.json(chatResponse);
    } catch (serviceError) {
      console.error("AI service error:", serviceError);

      // Return a helpful fallback response
      return NextResponse.json({
        response: `I encountered an issue while processing your question about "${query}". This might be due to API rate limits or temporary service unavailability. Please try again in a moment.`,
        sources: [],
        processingTime: Date.now() - startTime,
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);

    // Return appropriate error response
    if (error instanceof Error) {
      if (
        error.message.includes("API key") ||
        error.message.includes("Unauthorized")
      ) {
        return NextResponse.json(
          { error: "API configuration error. Please check your API keys." },
          { status: 500 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timeout. Please try again." },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
