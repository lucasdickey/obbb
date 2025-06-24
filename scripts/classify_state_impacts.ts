#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: join(process.cwd(), ".env.local") });

// Configuration
const DATA_DIR = join(process.cwd(), "data");
const CACHE_FILE = join(DATA_DIR, "state-classifications.json");
const PROGRESS_FILE = join(DATA_DIR, "classification-progress.json");
const BATCH_SIZE = 8; // Process 8 chunks per API call for cost efficiency
const DELAY_MS = 200; // Delay between API calls
const MAX_RETRIES = 3;

// US States and territories
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "GU", "VI", "AS", "MP"
];

interface PineconeChunk {
  id: string;
  values?: number[];
  metadata?: {
    text?: string;
    content?: string;
    source?: string;
    chunkIndex?: number;
    section?: string;
    tokenCount?: number;
    charCount?: number;
    [key: string]: any;
  };
}

interface StateClassification {
  chunkId: string;
  hasStateImpact: boolean;
  affectedStates: string[];
  confidence: number;
  reasoning: string;
  processingTime: number;
}

interface ClassificationProgress {
  totalChunks: number;
  processedChunks: number;
  startTime: string;
  lastProcessedId?: string;
  apiCallCount: number;
  totalCost: number;
}

class StateImpactClassifier {
  private openai!: OpenAI;
  private pinecone!: Pinecone;
  private cache: Map<string, StateClassification> = new Map();
  private progress!: ClassificationProgress;

  constructor(dryRun = false) {
    if (!dryRun) {
      const openaiKey = process.env.OPENAI_API_KEY;
      const pineconeKey = process.env.PINECONE_API_KEY;
      
      if (!openaiKey || !pineconeKey) {
        throw new Error("Missing required API keys: OPENAI_API_KEY and PINECONE_API_KEY");
      }
      
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.pinecone = new Pinecone({ apiKey: pineconeKey });
    }

    this.loadCache();
    this.loadProgress();
  }

  private loadCache(): void {
    if (existsSync(CACHE_FILE)) {
      try {
        const cacheData = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
        this.cache = new Map(Object.entries(cacheData));
        console.log(`📦 Loaded ${this.cache.size} cached classifications`);
      } catch (error) {
        console.warn("⚠️ Failed to load cache, starting fresh");
        this.cache = new Map();
      }
    }
  }

  private saveCache(): void {
    try {
      const cacheData = Object.fromEntries(this.cache);
      writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error("❌ Failed to save cache:", error);
    }
  }

  private loadProgress(): void {
    if (existsSync(PROGRESS_FILE)) {
      try {
        this.progress = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
        console.log(`📊 Resuming from ${this.progress.processedChunks}/${this.progress.totalChunks} chunks`);
      } catch (error) {
        console.warn("⚠️ Failed to load progress, starting fresh");
        this.initializeProgress();
      }
    } else {
      this.initializeProgress();
    }
  }

  private initializeProgress(): void {
    this.progress = {
      totalChunks: 0,
      processedChunks: 0,
      startTime: new Date().toISOString(),
      apiCallCount: 0,
      totalCost: 0
    };
  }

  private saveProgress(): void {
    try {
      writeFileSync(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.error("❌ Failed to save progress:", error);
    }
  }

  /**
   * Pre-filter chunks to exclude those unlikely to have state-specific impacts
   */
  private shouldProcessChunk(chunk: PineconeChunk): boolean {
    const text = (chunk.metadata?.text || chunk.metadata?.content || '').toLowerCase();
    
    // Skip very short chunks (likely boilerplate)
    if (text.length < 100) {
      return false;
    }

    // Skip if contains procedural language patterns
    const proceduralPatterns = [
      /this act may be cited as/,
      /table of contents/,
      /effective date/,
      /definitions?\.?\s*$/,
      /sec\.\s*\d+\.\s*definitions/,
      /in this (act|section|subsection)/,
      /for purposes of this/,
      /the term ['"][\w\s]+['"] means/,
      /congressional findings/,
      /sense of (congress|the senate)/
    ];

    if (proceduralPatterns.some(pattern => pattern.test(text))) {
      return false;
    }

    // Skip international relations without domestic impact
    const internationalPatterns = [
      /foreign (government|nation|country|state)/,
      /international (law|treaty|agreement|organization)/,
      /united nations/,
      /diplomatic/,
      /embassy/,
      /consul/
    ];

    const domesticImpactPatterns = [
      /(job|employment|economic|trade|manufacturing|production)/,
      /(tax|revenue|funding|grant|appropriation)/,
      /(infrastructure|transportation|energy)/,
      /(healthcare|education|social)/,
      /(environmental|regulation|compliance)/
    ];

    if (internationalPatterns.some(pattern => pattern.test(text)) && 
        !domesticImpactPatterns.some(pattern => pattern.test(text))) {
      return false;
    }

    // Process if it contains state impact indicators
    const stateImpactPatterns = [
      /\b(state|states)\b/,
      /\b(funding|grant|appropriation|allocation)\b/,
      /\b(program|initiative|project)\b/,
      /\b(infrastructure|transportation|highway|bridge|airport)\b/,
      /\b(healthcare|medicaid|medicare|hospital)\b/,
      /\b(education|school|university|college)\b/,
      /\b(environmental|clean|energy|renewable)\b/,
      /\b(economic|job|employment|manufacturing|industry)\b/,
      /\b(tax|revenue|credit|deduction|exemption)\b/,
      /\b(rural|urban|metropolitan|county|city|municipal)\b/,
      /\b(agriculture|farming|forestry|mining)\b/,
      /\b(border|immigration|customs)\b/,
      /\$\d+.*?(million|billion|thousand)/,
      /\b(formula|distribution|allocation)\b/
    ];

    return stateImpactPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Classify a batch of chunks using GPT-4o-mini
   */
  private async classifyBatch(chunks: PineconeChunk[], dryRun = false): Promise<StateClassification[]> {
    if (dryRun) {
      return chunks.map(chunk => ({
        chunkId: chunk.id,
        hasStateImpact: Math.random() > 0.5,
        affectedStates: Math.random() > 0.7 ? ["CA", "NY", "TX"] : [],
        confidence: Math.random(),
        reasoning: "Dry run mock classification",
        processingTime: 100
      }));
    }

    const startTime = Date.now();
    
    const prompt = `You are analyzing sections of HR1 (the "One Big Beautiful Bill Act") to identify which US states are specifically impacted by each provision.

For each text chunk, determine:
1. Does this provision have DIRECT state-specific impacts? (YES/NO)
2. If YES, which states are affected? Use 2-letter state codes.

ONLY mark as having state impact if the provision:
- Provides funding/grants with state-specific allocation
- Creates programs with state-specific requirements
- Affects state-level infrastructure, economy, or rights
- Mentions specific states, regions, or state-based criteria

DO NOT mark as having state impact if:
- It's procedural language or definitions
- It affects all states equally without state-specific variation
- It's international relations without domestic economic impact
- It's general federal policy without state-specific implementation

US State codes: ${US_STATES.join(", ")}

Return your analysis in this exact JSON format:
[
  {
    "chunkId": "chunk-id",
    "hasStateImpact": true/false,
    "affectedStates": ["CA", "NY"] or [],
    "confidence": 0.85,
    "reasoning": "Brief explanation"
  }
]

Text chunks to analyze:
${chunks.map((chunk, i) => `
CHUNK ${i + 1} (ID: ${chunk.id}):
${chunk.metadata?.text || chunk.metadata?.content || 'No text available'}

---`).join('\n')}

JSON Response:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a legislative analyst specializing in federal-state policy impacts. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("No response content received");
      }

      // Parse JSON response - handle markdown code blocks
      let jsonContent = content;
      
      // Remove markdown code blocks if present
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      }
      
      let classifications: StateClassification[];
      try {
        classifications = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON response:", content);
        console.error("❌ Extracted JSON:", jsonContent);
        throw new Error("Invalid JSON response from OpenAI");
      }

      // Add processing time to each classification
      classifications.forEach(classification => {
        classification.processingTime = processingTime;
      });

      // Update API usage tracking
      this.progress.apiCallCount++;
      const inputTokens = prompt.length / 4; // Rough estimate
      const outputTokens = content.length / 4;
      const cost = (inputTokens * 0.15 + outputTokens * 0.60) / 1000000; // GPT-4o-mini pricing
      this.progress.totalCost += cost;

      return classifications;

    } catch (error) {
      console.error("❌ Classification API error:", error);
      throw error;
    }
  }

  /**
   * Export chunks from Pinecone with optional limit using query approach to get metadata
   */
  private async exportChunks(dryRun = false, limit?: number): Promise<PineconeChunk[]> {
    if (dryRun) {
      console.log("🏃‍♂️ DRY RUN: Returning mock chunks");
      const mockCount = limit || 10;
      return Array.from({ length: mockCount }, (_, i) => ({
        id: `hr1-chunk-${i.toString().padStart(4, '0')}`,
        metadata: {
          text: `This is mock chunk ${i} about federal funding for state programs and infrastructure development in various regions of the United States.`,
          source: "HR1 - For the People Act of 2021",
          chunkIndex: i,
          section: `Section ${i + 1}`,
          tokenCount: 150,
          charCount: 200
        }
      }));
    }

    console.log(`📥 Exporting chunks from Pinecone${limit ? ` (limit: ${limit})` : ''}...`);
    const indexName = process.env.PINECONE_INDEX_NAME || "obbb";
    const index = this.pinecone.index(indexName);

    try {
      // First get the list of IDs
      console.log("📋 Getting list of chunk IDs...");
      const allIds: string[] = [];
      let paginationToken: string | undefined;
      
      do {
        const response = await index.listPaginated({
          limit: Math.min(100, limit ? limit - allIds.length : 1000),
          paginationToken
        });

        if (response.vectors) {
          allIds.push(...response.vectors.map(v => v.id).filter((id): id is string => typeof id === 'string'));
        }

        paginationToken = response.pagination?.next;
        
        // Stop if we've reached the limit
        if (limit && allIds.length >= limit) {
          break;
        }
      } while (paginationToken);

      const targetIds = limit ? allIds.slice(0, limit) : allIds;
      console.log(`📝 Found ${targetIds.length} chunk IDs, fetching metadata...`);

      // For full processing, we need to fetch chunks in batches using different query vectors
      // to get comprehensive coverage of all chunks in the index
      const allChunks: PineconeChunk[] = [];
      const maxPerQuery = 1000; // Pinecone's topK limit is 10000, but we'll use smaller batches
      const targetCount = limit || targetIds.length;
      
      if (!this.openai) {
        throw new Error("OpenAI client not initialized");
      }
      
      // Use multiple diverse queries to get better coverage of the vector space
      const searchQueries = [
        "federal government state programs funding",
        "tax policy economic development",
        "healthcare education social services",
        "infrastructure transportation energy",
        "agriculture defense security",
        "immigration border control",
        "environmental regulations climate",
        "election voting rights democracy"
      ];
      
      const processedIds = new Set<string>();
      
      for (let queryIndex = 0; queryIndex < searchQueries.length && allChunks.length < targetCount; queryIndex++) {
        console.log(`🔍 Query ${queryIndex + 1}/${searchQueries.length}: "${searchQueries[queryIndex]}"`);
        
        const embeddingResponse = await this.openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: searchQueries[queryIndex]
        });
        
        const queryVector = embeddingResponse.data[0].embedding;
        
        const response = await index.query({
          vector: queryVector,
          topK: Math.min(maxPerQuery, targetCount - allChunks.length),
          includeMetadata: true,
          includeValues: false
        });
        
        if (response.matches) {
          // Add new chunks we haven't seen before
          const newChunks = response.matches
            .filter(match => !processedIds.has(match.id))
            .map(match => {
              processedIds.add(match.id);
              return {
                id: match.id,
                values: undefined,
                metadata: match.metadata
              };
            });
          
          allChunks.push(...newChunks);
          console.log(`  📦 Added ${newChunks.length} new chunks (total: ${allChunks.length})`);
        }
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (allChunks.length === 0) {
        throw new Error("No chunks retrieved from Pinecone");
      }

      console.log(`✅ Exported ${allChunks.length} chunks with metadata from Pinecone`);
      return allChunks;

    } catch (error) {
      console.error("❌ Failed to export chunks from Pinecone:", error);
      throw error;
    }
  }

  /**
   * Process chunks with state impact classification
   */
  async processAllChunks(dryRun = false, limit?: number): Promise<void> {
    console.log("🚀 Starting state impact classification pipeline...");
    
    if (dryRun) {
      console.log("🏃‍♂️ Running in DRY RUN mode - no API calls will be made");
    }

    // Export chunks from Pinecone
    const allChunks = await this.exportChunks(dryRun, limit);
    this.progress.totalChunks = allChunks.length;

    // Pre-filter chunks
    console.log("🔍 Pre-filtering chunks for state impact potential...");
    const filteredChunks = allChunks.filter(chunk => this.shouldProcessChunk(chunk));
    const filterReduction = ((allChunks.length - filteredChunks.length) / allChunks.length * 100).toFixed(1);
    console.log(`✅ Pre-filtering reduced chunks by ${filterReduction}% (${allChunks.length} → ${filteredChunks.length})`);

    // Process in batches
    const totalBatches = Math.ceil(filteredChunks.length / BATCH_SIZE);
    let processedInSession = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * BATCH_SIZE;
      const batch = filteredChunks.slice(batchStart, batchStart + BATCH_SIZE);
      
      // Skip already processed chunks
      const unprocessedBatch = batch.filter(chunk => !this.cache.has(chunk.id));
      
      if (unprocessedBatch.length === 0) {
        console.log(`⏭️ Batch ${i + 1}/${totalBatches}: All chunks already processed`);
        continue;
      }

      console.log(`🔄 Processing batch ${i + 1}/${totalBatches} (${unprocessedBatch.length} new chunks)...`);

      try {
        const classifications = await this.classifyBatch(unprocessedBatch, dryRun);
        
        // Store classifications in cache
        classifications.forEach(classification => {
          this.cache.set(classification.chunkId, classification);
        });

        processedInSession += unprocessedBatch.length;
        this.progress.processedChunks += unprocessedBatch.length;
        this.progress.lastProcessedId = batch[batch.length - 1].id;

        // Save progress every 5 batches
        if (i % 5 === 0) {
          this.saveCache();
          this.saveProgress();
        }

        console.log(`  ✅ Processed ${processedInSession} chunks this session`);
        console.log(`  💰 Total cost so far: $${this.progress.totalCost.toFixed(4)}`);

        // Rate limiting
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }

      } catch (error) {
        console.error(`❌ Failed to process batch ${i + 1}:`, error);
        
        // Save progress before potentially exiting
        this.saveCache();
        this.saveProgress();
        
        if (error instanceof Error && error.message.includes("rate limit")) {
          console.log("⏸️ Rate limit reached, waiting 60 seconds...");
          await new Promise(resolve => setTimeout(resolve, 60000));
          i--; // Retry this batch
        } else {
          throw error;
        }
      }
    }

    // Final save
    this.saveCache();
    this.saveProgress();

    // Generate summary
    this.generateSummary();
  }

  /**
   * Review chunks before processing - display sample data
   */
  async reviewChunks(limit = 10): Promise<void> {
    console.log("🔍 Reviewing sample chunks from Pinecone...");
    
    const chunks = await this.exportChunks(false, limit);
    
    console.log(`\n📊 Sample of ${chunks.length} chunks:\n`);
    
    chunks.forEach((chunk, index) => {
      console.log(`--- CHUNK ${index + 1} ---`);
      console.log(`ID: ${chunk.id}`);
      
      // Handle different metadata structures
      const text = chunk.metadata?.text || chunk.metadata?.content || 'No text found';
      const preview = text.length > 300 ? text.substring(0, 300) + "..." : text;
      const shouldProcess = this.shouldProcessChunk(chunk);
      
      console.log(`Section: ${chunk.metadata?.section || 'Unknown'}`);
      console.log(`Token Count: ${chunk.metadata?.tokenCount || 'Unknown'}`);
      console.log(`Will Process: ${shouldProcess ? '✅ YES' : '❌ NO (filtered out)'}`);
      console.log(`Preview: ${preview}`);
      console.log();
    });
    
    const filteredChunks = chunks.filter(chunk => this.shouldProcessChunk(chunk));
    const filterRate = ((chunks.length - filteredChunks.length) / chunks.length * 100).toFixed(1);
    
    console.log(`📈 Pre-filtering Summary:`);
    console.log(`  • Total chunks reviewed: ${chunks.length}`);
    console.log(`  • Chunks that would be processed: ${filteredChunks.length}`);
    console.log(`  • Chunks filtered out: ${chunks.length - filteredChunks.length} (${filterRate}%)`);
    console.log(`\n💡 Use --limit=N to process a specific number of chunks`);
    console.log(`💡 Remove --review to run actual classification`);
  }

  /**
   * Generate processing summary
   */
  private generateSummary(): void {
    const classifications = Array.from(this.cache.values());
    const withStateImpact = classifications.filter(c => c.hasStateImpact);
    const stateCount = new Map<string, number>();
    
    withStateImpact.forEach(classification => {
      classification.affectedStates.forEach(state => {
        stateCount.set(state, (stateCount.get(state) || 0) + 1);
      });
    });

    const topStates = Array.from(stateCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const summary = {
      totalChunks: this.progress.totalChunks,
      processedChunks: classifications.length,
      chunksWithStateImpact: withStateImpact.length,
      impactPercentage: (withStateImpact.length / classifications.length * 100).toFixed(1),
      uniqueStatesAffected: stateCount.size,
      topAffectedStates: topStates,
      totalApiCalls: this.progress.apiCallCount,
      totalCost: this.progress.totalCost,
      averageConfidence: (classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length).toFixed(2),
      processingTime: new Date().toISOString()
    };

    const summaryPath = join(DATA_DIR, "state-impact-summary.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log("\n🎉 State impact classification completed!");
    console.log(`📊 Summary:`);
    console.log(`  • Total chunks processed: ${summary.processedChunks}`);
    console.log(`  • Chunks with state impact: ${summary.chunksWithStateImpact} (${summary.impactPercentage}%)`);
    console.log(`  • Unique states affected: ${summary.uniqueStatesAffected}`);
    console.log(`  • Top affected states: ${topStates.slice(0, 5).map(([state, count]) => `${state}(${count})`).join(', ')}`);
    console.log(`  • Total API calls: ${summary.totalApiCalls}`);
    console.log(`  • Total cost: $${summary.totalCost.toFixed(4)}`);
    console.log(`  • Average confidence: ${summary.averageConfidence}`);
    console.log(`📁 Detailed summary saved to: ${summaryPath}`);
  }

  /**
   * Update Pinecone metadata with state classifications
   */
  async updatePineconeMetadata(dryRun = false): Promise<void> {
    if (dryRun) {
      console.log("🏃‍♂️ DRY RUN: Skipping Pinecone metadata update");
      return;
    }

    console.log("📤 Updating Pinecone metadata with state classifications...");
    
    const indexName = process.env.PINECONE_INDEX_NAME || "obbb";
    const index = this.pinecone.index(indexName);
    
    const classifications = Array.from(this.cache.values());
    const withStateImpact = classifications.filter(c => c.hasStateImpact);
    
    console.log(`Updating ${withStateImpact.length} chunks with state impact data...`);

    // Process in batches for Pinecone update
    const updateBatches = Math.ceil(withStateImpact.length / BATCH_SIZE);
    
    for (let i = 0; i < updateBatches; i++) {
      const batchStart = i * BATCH_SIZE;
      const batch = withStateImpact.slice(batchStart, batchStart + BATCH_SIZE);
      
      try {
        // Update metadata using upsert with empty values
        const updates = batch.map(classification => ({
          id: classification.chunkId,
          values: [], // Empty vector for metadata-only update
          metadata: {
            states: classification.affectedStates,
            stateImpactConfidence: classification.confidence
          }
        }));

        await index.upsert(updates);
        console.log(`  ✅ Updated batch ${i + 1}/${updateBatches}`);
        
        // Rate limiting
        if (i < updateBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        console.error(`❌ Failed to update batch ${i + 1}:`, error);
        throw error;
      }
    }

    console.log("✅ Pinecone metadata update completed!");
  }
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");
  const updateMetadata = process.argv.includes("--update-metadata");
  const reviewMode = process.argv.includes("--review");
  
  // Parse limit parameter
  const limitIndex = process.argv.findIndex(arg => arg.startsWith("--limit="));
  const limit = limitIndex >= 0 ? parseInt(process.argv[limitIndex].split("=")[1]) : undefined;
  
  if (limit) {
    console.log(`🎯 Processing limited to ${limit} chunks`);
  }
  
  try {
    const classifier = new StateImpactClassifier(isDryRun);
    
    if (reviewMode) {
      await classifier.reviewChunks(limit || 10);
    } else if (updateMetadata) {
      await classifier.updatePineconeMetadata(isDryRun);
    } else {
      await classifier.processAllChunks(isDryRun, limit);
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

export { StateImpactClassifier };