import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasPinecone: !!process.env.PINECONE_API_KEY,
    hasPineconeEnv: !!process.env.PINECONE_ENVIRONMENT,
    hasPineconeIndex: !!process.env.PINECONE_INDEX_NAME,
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    // Show partial keys for debugging (first 8 chars)
    openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) || "none",
    pineconeKeyPrefix: process.env.PINECONE_API_KEY?.substring(0, 8) || "none",
    pineconeIndexName: process.env.PINECONE_INDEX_NAME || "none",
  });
}
