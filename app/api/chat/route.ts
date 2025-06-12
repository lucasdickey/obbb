import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Lazy load dependencies to prevent initialization errors
let openai: any = null;
let pinecone: any = null;
let groq: any = null;
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

async function initializeGroq() {
  if (!groq) {
    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY not configured");
      }
      groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    } catch (error) {
      console.error("Failed to initialize Groq:", error);
      throw error;
    }
  }
  return groq;
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
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.UPSTASH_REDIS_REST_URL !== "your_upstash_redis_url_here" &&
    process.env.UPSTASH_REDIS_REST_URL.startsWith("https://")
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
  provider: string;
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
    const hasGroq = !!process.env.GROQ_API_KEY;

    // Configurable toggle: PREFER_GROQ=true means Groq first, OpenAI fallback
    // PREFER_GROQ=false means OpenAI first, Groq fallback
    const preferGroq = process.env.PREFER_GROQ === "true";

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

      // Step 4: Generate response with configurable primary/fallback
      const prompt = `You are a helpful assistant answering questions about the HR1 "One Big Beautiful Bill Act" (119th Congress). 

Based on the following relevant excerpts from the bill, provide a comprehensive answer with this EXACT structure:

FIRST: 3-5 bullet points using relevant emojis (each on a new line)
THEN: A blank line
THEN: A detailed prose explanation (multiple sentences, no bullets)

Use emojis that match the content (e.g., 🚫 for restrictions, 📖 for definitions, 💰 for money, 🏥 for healthcare, 📊 for reporting, ⚖️ for legal, 🛡️ for security, 🏛️ for government, etc.)

Question: ${query}

Relevant excerpts from HR1:
${relevantChunks.map((chunk: any, i: number) => `[${i + 1}] ${chunk.text}`).join("\n\n")}

EXAMPLE FORMAT:
🚫 10-year moratorium on state AI regulations for interstate commerce
📖 AI definitions referencing the National AI Initiative Act of 2020
💰 $500 million appropriation for AI/automation modernization
🏥 AI tools mandate for Medicare fraud detection
📊 Congressional reporting requirements on AI effectiveness

This is the detailed explanation that expands on the bullet points above. It should be written in paragraph form without any bullet points, providing comprehensive context and analysis based on the excerpts provided.`;

      const systemMessage =
        "You are a knowledgeable legislative assistant. You MUST follow the exact format: emoji bullet points first (each starting with an emoji), then a blank line, then prose explanation. Never mix bullets and prose together. Do not include any <think> tags or reasoning steps in your response - only provide the final answer.";

      let completion;
      let usedProvider = "";

      // Configurable primary/fallback logic
      if (preferGroq && hasGroq) {
        // Try Groq first, fallback to OpenAI
        try {
          const groqClient = await initializeGroq();
          completion = await groqClient.chat.completions.create({
            model: "deepseek-r1-distill-llama-70b", // Advanced reasoning model
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt },
            ],
            max_tokens: 800,
            temperature: 0.1,
          });
          usedProvider = "Groq (DeepSeek-R1)";
        } catch (groqError) {
          console.log("Groq failed, falling back to OpenAI:", groqError);
          completion = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt },
            ],
            max_tokens: 800,
            temperature: 0.1,
          });
          usedProvider = "OpenAI (fallback)";
        }
      } else {
        // Try OpenAI first, fallback to Groq
        try {
          completion = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt },
            ],
            max_tokens: 800,
            temperature: 0.1,
          });
          usedProvider = "OpenAI";
        } catch (openaiError) {
          if (hasGroq) {
            console.log("OpenAI failed, falling back to Groq:", openaiError);
            const groqClient = await initializeGroq();
            completion = await groqClient.chat.completions.create({
              model: "deepseek-r1-distill-llama-70b",
              messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: prompt },
              ],
              max_tokens: 800,
              temperature: 0.1,
            });
            usedProvider = "Groq (fallback)";
          } else {
            throw openaiError;
          }
        }
      }

      const response =
        completion.choices[0]?.message?.content || "No response generated";

      // Filter out <think> tags and any content within them
      const cleanResponse = response
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

      // Step 5: Return response with citations and provider info
      const chatResponse: ChatResponse = {
        response: cleanResponse,
        sources: relevantChunks,
        processingTime: Date.now() - startTime,
        provider: usedProvider, // Add provider info for debugging
      };

      return NextResponse.json(chatResponse);
    } catch (serviceError) {
      console.error("AI service error:", serviceError);

      // More detailed error logging for debugging
      const errorMessage =
        serviceError instanceof Error
          ? serviceError.message
          : String(serviceError);
      console.error("Error details:", {
        message: errorMessage,
        stack: serviceError instanceof Error ? serviceError.stack : undefined,
        query: query,
      });

      // Return a helpful fallback response with more specific error info
      return NextResponse.json({
        response: `I encountered an issue while processing your question about "${query}". Error: ${errorMessage}. This might be due to API rate limits or temporary service unavailability. Please try again in a moment.`,
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
