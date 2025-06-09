#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { encoding_for_model } from "tiktoken";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: join(process.cwd(), ".env.local") });

// Configuration
const DATA_DIR = join(process.cwd(), "data");
const HR1_FILE = join(DATA_DIR, "hr1.txt");
const CHUNK_SIZE = 500; // tokens per chunk
const CHUNK_OVERLAP = 50; // overlap between chunks
const BATCH_SIZE = 10; // for rate limiting
const DELAY_MS = 100; // delay between batches

interface DocumentChunk {
  id: string;
  text: string;
  embedding?: number[];
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    section?: string;
    tokenCount: number;
    charCount: number;
  };
}

interface ProcessingStats {
  totalChunks: number;
  embeddedChunks: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

class TextChunker {
  private encoder;

  constructor() {
    this.encoder = encoding_for_model("text-embedding-ada-002");
  }

  private countTokens(text: string): number {
    return this.encoder.encode(text).length;
  }

  private extractSection(text: string, chunkIndex: number): string | undefined {
    // Try to identify which section this chunk belongs to
    const sectionPatterns = [
      /Division [ABC]—(.*?)(?=Division|\n|$)/i,
      /Title [IVX]+—(.*?)(?=Title|\n|$)/i,
      /Subtitle [A-Z]—(.*?)(?=Subtitle|\n|$)/i,
      /Part \d+—(.*?)(?=Part|\n|$)/i,
      /Sec\. \d+\. (.*?)(?=Sec\.|\n|$)/i,
    ];

    for (const pattern of sectionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback: try to find nearby section headers
    const words = text.split(/\s+/).slice(0, 20).join(" ");
    if (words.includes("Division A") || words.includes("Voting"))
      return "Division A - Voting";
    if (words.includes("Division B") || words.includes("Campaign Finance"))
      return "Division B - Campaign Finance";
    if (words.includes("Division C") || words.includes("Ethics"))
      return "Division C - Ethics";

    return undefined;
  }

  chunkText(text: string): DocumentChunk[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentChunk = "";
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim() + ". ";
      const testChunk = currentChunk + sentence;

      if (this.countTokens(testChunk) > CHUNK_SIZE && currentChunk.length > 0) {
        // Create chunk with current content
        const chunkId = `hr1-chunk-${chunkIndex.toString().padStart(4, "0")}`;
        const chunk: DocumentChunk = {
          id: chunkId,
          text: currentChunk.trim(),
          metadata: {
            source: "HR1 - For the People Act of 2021",
            chunkIndex,
            totalChunks: 0, // Will be updated later
            section: this.extractSection(currentChunk, chunkIndex),
            tokenCount: this.countTokens(currentChunk),
            charCount: currentChunk.length,
          },
        };
        chunks.push(chunk);

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, CHUNK_OVERLAP);
        currentChunk = overlapText + sentence;
        chunkIndex++;
      } else {
        currentChunk = testChunk;
      }
    }

    // Add final chunk if there's remaining content
    if (currentChunk.trim().length > 0) {
      const chunkId = `hr1-chunk-${chunkIndex.toString().padStart(4, "0")}`;
      const chunk: DocumentChunk = {
        id: chunkId,
        text: currentChunk.trim(),
        metadata: {
          source: "HR1 - For the People Act of 2021",
          chunkIndex,
          totalChunks: 0,
          section: this.extractSection(currentChunk, chunkIndex),
          tokenCount: this.countTokens(currentChunk),
          charCount: currentChunk.length,
        },
      };
      chunks.push(chunk);
    }

    // Update total chunks in metadata
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(/\s+/);
    const estimatedWordsPerToken = 0.75; // Rough estimation
    const overlapWords = Math.floor(overlapTokens / estimatedWordsPerToken);

    if (words.length <= overlapWords) return text;

    return words.slice(-overlapWords).join(" ") + " ";
  }
}

class EmbeddingGenerator {
  private openai?: OpenAI;
  private rateLimitDelay = DELAY_MS;

  constructor(dryRun = false) {
    if (!dryRun) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required");
      }
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateEmbeddings(
    chunks: DocumentChunk[],
    dryRun = false
  ): Promise<DocumentChunk[]> {
    console.log(`\n🧮 Generating embeddings for ${chunks.length} chunks...`);

    if (dryRun) {
      console.log("🏃‍♂️ DRY RUN: Skipping actual API calls");
      return chunks.map((chunk) => ({
        ...chunk,
        embedding: new Array(1536).fill(0).map(() => Math.random()), // Mock embedding
      }));
    }

    const embeddedChunks: DocumentChunk[] = [];
    let processed = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      try {
        const texts = batch.map((chunk) => chunk.text);
        if (!this.openai) {
          throw new Error("OpenAI client not initialized");
        }
        const response = await this.openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: texts,
        });

        for (let j = 0; j < batch.length; j++) {
          embeddedChunks.push({
            ...batch[j],
            embedding: response.data[j].embedding,
          });
        }

        processed += batch.length;
        console.log(`  ✅ Processed ${processed}/${chunks.length} chunks`);

        // Rate limiting
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.rateLimitDelay)
          );
        }
      } catch (error) {
        console.error(
          `❌ Error processing batch ${i}-${i + batch.length}:`,
          error
        );
        // Add chunks without embeddings
        batch.forEach((chunk) => embeddedChunks.push(chunk));
      }
    }

    return embeddedChunks;
  }
}

class PineconeManager {
  private pinecone?: Pinecone;
  private indexName: string;

  constructor(dryRun = false) {
    this.indexName = process.env.PINECONE_INDEX_NAME || "hr1-semantic-search";

    if (!dryRun) {
      const apiKey = process.env.PINECONE_API_KEY;
      if (!apiKey) {
        throw new Error("PINECONE_API_KEY environment variable is required");
      }
      this.pinecone = new Pinecone({ apiKey });
    }
  }

  async ensureIndex(): Promise<void> {
    if (!this.pinecone) {
      console.log("🏃‍♂️ DRY RUN: Skipping Pinecone index creation");
      return;
    }

    try {
      const indexes = await this.pinecone.listIndexes();
      const existingIndex = indexes.indexes?.find(
        (index) => index.name === this.indexName
      );

      if (existingIndex) {
        // Check if the existing index has the wrong dimensions
        if (existingIndex.dimension !== 1536) {
          console.log(
            `🗑️ Deleting existing index with wrong dimensions (${existingIndex.dimension} != 1536)`
          );
          await this.pinecone.deleteIndex(this.indexName);
          console.log("⏳ Waiting for index deletion...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
        } else {
          console.log(
            `✅ Pinecone index ${this.indexName} already exists with correct dimensions`
          );
          return;
        }
      }

      console.log(
        `📦 Creating Pinecone index: ${this.indexName} with 1536 dimensions`
      );
      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: 1536, // OpenAI ada-002 embedding dimension
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });

      // Wait for index to be ready
      console.log("⏳ Waiting for index to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } catch (error) {
      console.error("❌ Error with Pinecone index:", error);
      throw error;
    }
  }

  async upsertChunks(chunks: DocumentChunk[], dryRun = false): Promise<void> {
    if (dryRun) {
      console.log("🏃‍♂️ DRY RUN: Skipping Pinecone upsert");
      return;
    }

    try {
      if (!this.pinecone) {
        throw new Error("Pinecone client not initialized");
      }
      const index = this.pinecone.index(this.indexName);
      const vectors = chunks
        .filter((chunk) => chunk.embedding)
        .map((chunk) => ({
          id: chunk.id,
          values: chunk.embedding!,
          metadata: {
            text: chunk.text,
            source: chunk.metadata.source,
            chunkIndex: chunk.metadata.chunkIndex,
            section: chunk.metadata.section || "",
            tokenCount: chunk.metadata.tokenCount,
            charCount: chunk.metadata.charCount,
          },
        }));

      console.log(`📤 Upserting ${vectors.length} vectors to Pinecone...`);

      // Upsert in batches
      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        await index.upsert(batch);
        console.log(
          `  ✅ Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)}`
        );
      }

      console.log("✅ All vectors upserted to Pinecone successfully");
    } catch (error) {
      console.error("❌ Error upserting to Pinecone:", error);
      throw error;
    }
  }
}

class DatabaseManager {
  async saveChunks(chunks: DocumentChunk[], dryRun = false): Promise<void> {
    if (dryRun) {
      console.log("🏃‍♂️ DRY RUN: Skipping database save");
      return;
    }

    // For now, save to JSON file - can be replaced with actual DB later
    const outputPath = join(DATA_DIR, "hr1-chunks.json");
    const data = {
      metadata: {
        totalChunks: chunks.length,
        generatedAt: new Date().toISOString(),
        source: "HR1 - For the People Act of 2021",
      },
      chunks: chunks.map((chunk) => ({
        ...chunk,
        embedding: chunk.embedding ? "[VECTOR_DATA]" : null, // Don't save full embeddings to JSON
      })),
    };

    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved chunk metadata to ${outputPath}`);

    // Also save a summary
    const summaryPath = join(DATA_DIR, "hr1-chunks-summary.json");
    const summary = {
      totalChunks: chunks.length,
      averageTokens: Math.round(
        chunks.reduce((sum, c) => sum + c.metadata.tokenCount, 0) /
          chunks.length
      ),
      averageChars: Math.round(
        chunks.reduce((sum, c) => sum + c.metadata.charCount, 0) / chunks.length
      ),
      sectionsFound: Array.from(
        new Set(chunks.map((c) => c.metadata.section).filter(Boolean))
      ),
      embeddedChunks: chunks.filter((c) => c.embedding).length,
      generatedAt: new Date().toISOString(),
    };

    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Saved processing summary to ${summaryPath}`);
  }
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");
  const stats: ProcessingStats = {
    totalChunks: 0,
    embeddedChunks: 0,
    errors: 0,
    startTime: new Date(),
  };

  try {
    console.log("🚀 Starting HR1 text processing and embedding pipeline...");
    if (isDryRun) {
      console.log("🏃‍♂️ Running in DRY RUN mode - no API calls will be made");
    }

    // Load HR1 text
    console.log("\n📖 Loading HR1 text...");
    const hr1Text = readFileSync(HR1_FILE, "utf-8");
    console.log(`✅ Loaded ${hr1Text.length.toLocaleString()} characters`);

    // Chunk the text
    console.log("\n✂️ Chunking text...");
    const chunker = new TextChunker();
    const chunks = chunker.chunkText(hr1Text);
    stats.totalChunks = chunks.length;

    console.log(`✅ Created ${chunks.length} chunks`);
    console.log(
      `📊 Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.metadata.tokenCount, 0) / chunks.length)} tokens`
    );

    // Generate embeddings
    const embeddingGenerator = new EmbeddingGenerator(isDryRun);
    const embeddedChunks = await embeddingGenerator.generateEmbeddings(
      chunks,
      isDryRun
    );
    stats.embeddedChunks = embeddedChunks.filter((c) => c.embedding).length;

    // Set up Pinecone
    console.log("\n🌲 Setting up Pinecone...");
    const pineconeManager = new PineconeManager(isDryRun);
    if (!isDryRun) {
      await pineconeManager.ensureIndex();
    }
    await pineconeManager.upsertChunks(embeddedChunks, isDryRun);

    // Save to database/files
    console.log("\n💾 Saving to database...");
    const dbManager = new DatabaseManager();
    await dbManager.saveChunks(embeddedChunks, isDryRun);

    stats.endTime = new Date();
    const duration = Math.round(
      (stats.endTime.getTime() - stats.startTime.getTime()) / 1000
    );

    console.log("\n🎉 Processing completed successfully!");
    console.log(`📊 Statistics:`);
    console.log(`  • Total chunks: ${stats.totalChunks}`);
    console.log(`  • Embedded chunks: ${stats.embeddedChunks}`);
    console.log(`  • Processing time: ${duration}s`);
    console.log(
      `  • Average time per chunk: ${(duration / stats.totalChunks).toFixed(2)}s`
    );

    if (!isDryRun) {
      console.log("\n🔥 Your HR1 Q&A system is ready!");
      console.log("Next steps:");
      console.log("1. Set up your .env.local file with API keys");
      console.log("2. Run: npm run dev");
      console.log("3. Start asking questions about HR1!");
    }
  } catch (error) {
    console.error("❌ Pipeline failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { main as runPipeline };
