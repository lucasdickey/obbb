import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Initialize rate limiting (optional)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
    })
  : null;

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
    // Rate limiting
    if (ratelimit) {
      const ip = req.ip ?? "127.0.0.1";
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    const body: ChatRequest = await req.json();
    const { messages, stream = false } = body;

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

    // Step 1: Generate embedding for the user query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Search Pinecone for relevant chunks
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "obbb");
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
      includeValues: false,
    });

    // Step 3: Filter and format results
    const relevantChunks = searchResponse.matches
      .filter((match) => (match.score || 0) > 0.7) // Relevance threshold
      .map((match) => ({
        id: match.id,
        text: match.metadata?.text as string,
        section: match.metadata?.section as string,
        chunkIndex: match.metadata?.chunkIndex as number,
        score: match.score || 0,
      }))
      .filter((chunk) => chunk.text && chunk.text.length > 0);

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        response:
          "I couldn't find relevant information in the HR1 bill to answer your question. Please try rephrasing your question or asking about a different aspect of the bill.",
        sources: [],
        processingTime: Date.now() - startTime,
      });
    }

    // Step 4: Construct context for the AI
    const context = relevantChunks
      .map((chunk, index) => `[${index + 1}] ${chunk.text}`)
      .join("\n\n");

    // Step 5: Generate AI response
    const systemPrompt = `You are an expert assistant that answers questions about the HR1 "For the People Act" legislative bill. You must base your answers ONLY on the provided context from the bill.

Instructions:
1. Answer the user's question using only the information provided in the context
2. Be specific and accurate, citing relevant sections when possible
3. If the context doesn't contain enough information to fully answer the question, say so
4. Use clear, accessible language that explains complex legislative concepts
5. When referencing specific parts of the bill, use the format [1], [2], etc. to cite the source numbers
6. Do not make up information or draw from knowledge outside the provided context

Context from HR1 bill:
${context}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.1,
      max_tokens: 500,
      stream: false,
    });

    const response =
      completion.choices[0]?.message?.content || "No response generated";

    // Step 6: Return response with citations
    const chatResponse: ChatResponse = {
      response,
      sources: relevantChunks,
      processingTime: Date.now() - startTime,
    };

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error("Chat API error:", error);

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
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
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
