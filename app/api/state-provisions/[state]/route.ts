import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Lazy load dependencies to prevent initialization errors
let openai: any = null;
let pinecone: any = null;

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

// US States mapping for validation and display
const US_STATES: { [key: string]: string } = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
  "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
  "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
  "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
  "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
  "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
  "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
  "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
  "DC": "District of Columbia", "PR": "Puerto Rico", "GU": "Guam", "VI": "U.S. Virgin Islands",
  "AS": "American Samoa", "MP": "Northern Mariana Islands"
};

/**
 * Generate user-friendly summaries for provisions
 */
async function generateFriendlySummaries(
  provisions: StateProvision[],
  stateName: string,
  openaiClient: any
): Promise<StateProvision[]> {
  if (provisions.length === 0) return provisions;

  try {
    const prompt = `You are summarizing HR1 provisions for ${stateName} residents. For each provision below, create:
1. A clear, engaging title (max 8 words)
2. A 2-sentence explanation in plain English

Format as JSON array with this structure:
[
  {
    "title": "Short engaging title",
    "description": "First sentence explains what it does. Second sentence explains the impact on ${stateName}."
  }
]

Provisions to summarize:
${provisions.map((p, i) => `
PROVISION ${i + 1}:
Section: ${p.section}
Text: ${p.text.substring(0, 800)}...
`).join('\n')}

Return only valid JSON:`;

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a legislative expert who explains complex bills in simple terms. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn("No summary content received, using original excerpts");
      return provisions;
    }

    // Parse JSON response
    let summaries: Array<{ title: string; description: string }>;
    try {
      // Handle potential markdown code blocks
      const jsonContent = content.match(/```(?:json)?\s*([^`]+)```/)?.[1] || content;
      summaries = JSON.parse(jsonContent);
    } catch (parseError) {
      console.warn("Failed to parse summary JSON, using original excerpts:", parseError);
      return provisions;
    }

    // Apply summaries to provisions
    return provisions.map((provision, index) => ({
      ...provision,
      friendlyTitle: summaries[index]?.title || provision.section || "HR1 Provision",
      friendlyDescription: summaries[index]?.description || provision.excerpt
    }));

  } catch (error) {
    console.error("Error generating friendly summaries:", error);
    return provisions; // Return original provisions if summary generation fails
  }
}

interface StateProvision {
  id: string;
  text: string;
  section?: string;
  excerpt: string;
  relevanceScore: number;
  semanticScore: number;
  keywordScore: number;
  chatPrompt: string;
  friendlyTitle?: string;
  friendlyDescription?: string;
}

interface StateProvisionsResponse {
  state: string;
  stateName: string;
  provisions: StateProvision[];
  totalFound: number;
  processingTime: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { state: string } }
) {
  const startTime = Date.now();
  const stateCode = params.state?.toUpperCase();

  try {
    // Validate state code
    if (!stateCode || !US_STATES[stateCode]) {
      return NextResponse.json(
        { error: "Invalid state code provided" },
        { status: 400 }
      );
    }

    const stateName = US_STATES[stateCode];

    // Try to serve from cache first
    const cacheDir = join(process.cwd(), "data", "state-provisions-cache");
    const cacheFile = join(cacheDir, `${stateCode.toLowerCase()}.json`);
    
    if (existsSync(cacheFile)) {
      try {
        const cachedData = JSON.parse(readFileSync(cacheFile, "utf-8"));
        
        // Update processing time to reflect cache hit
        return NextResponse.json({
          ...cachedData,
          processingTime: Date.now() - startTime,
          cached: true
        });
      } catch (cacheError) {
        console.warn(`⚠️ Cache read failed for ${stateName}, generating fresh:`, cacheError);
      }
    }

    // Check if AI services are available
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return NextResponse.json(
        { error: "AI services not configured" },
        { status: 500 }
      );
    }

    // Initialize services
    const openaiClient = await initializeOpenAI();
    const pineconeClient = await initializePinecone();
    const index = pineconeClient.index(process.env.PINECONE_INDEX_NAME || "obbb");

    // Define semantic search queries for comprehensive coverage
    const semanticQueries = [
      `${stateName} ${stateCode} state funding programs infrastructure`,
      `${stateName} economic development tax credits incentives`,
      `${stateName} healthcare Medicare Medicaid state programs`,
      `${stateName} education funding university college grants`,
      `${stateName} transportation highway bridge airport funding`,
      `${stateName} energy renewable clean power grid`,
      `${stateName} agriculture farming rural development`,
      `${stateName} border immigration customs enforcement`,
      `federal programs targeting ${stateName} ${stateCode} specifically`,
      `state-specific provisions ${stateName} implementation requirements`
    ];

    const allMatches = new Map<string, any>();
    const semanticScores = new Map<string, number>();

    // Perform semantic searches
    for (const query of semanticQueries) {
      try {
        const embeddingResponse = await openaiClient.embeddings.create({
          model: "text-embedding-ada-002",
          input: query,
        });

        const queryEmbedding = embeddingResponse.data[0].embedding;

        const searchResponse = await index.query({
          vector: queryEmbedding,
          topK: 20, // Get more results per query for better coverage
          includeMetadata: true,
          includeValues: false,
        });

        if (searchResponse.matches) {
          for (const match of searchResponse.matches) {
            const id = match.id;
            const score = match.score || 0;
            
            // Store the match if it's new or has a better semantic score
            if (!allMatches.has(id) || (semanticScores.get(id) || 0) < score) {
              allMatches.set(id, match);
              semanticScores.set(id, score);
            }
          }
        }

        // Small delay between queries to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error with semantic query "${query}":`, error);
        // Continue with other queries even if one fails
      }
    }

    // Process and score all matches
    const scoredProvisions: StateProvision[] = [];

    allMatches.forEach((match, id) => {
      const text = match.metadata?.text || match.metadata?.content || '';
      const section = match.metadata?.section || 'HR1 Provision';
      const semanticScore = semanticScores.get(id) || 0;

      // Calculate keyword score based on state mentions and relevant terms
      let keywordScore = 0;
      const textLower = text.toLowerCase();
      const stateNameLower = stateName.toLowerCase();
      const stateCodeLower = stateCode.toLowerCase();

      // Direct state mentions (highest weight)
      if (textLower.includes(stateNameLower)) keywordScore += 1.0;
      if (textLower.includes(stateCodeLower)) keywordScore += 0.8;

      // State-relevant terms (medium weight)
      const stateTerms = [
        'state', 'states', 'funding', 'program', 'grant', 'allocation',
        'infrastructure', 'transportation', 'highway', 'bridge', 'airport',
        'healthcare', 'medicaid', 'medicare', 'education', 'school', 'university',
        'economic', 'development', 'manufacturing', 'agriculture', 'energy',
        'environmental', 'clean', 'renewable', 'rural', 'urban', 'metropolitan'
      ];

      for (const term of stateTerms) {
        if (textLower.includes(term)) keywordScore += 0.1;
      }

      // Funding amounts (high relevance)
      if (/\$\d+.*?(million|billion|thousand)/.test(textLower)) keywordScore += 0.5;

      // Normalize keyword score
      keywordScore = Math.min(keywordScore, 1.0);

      // Combined relevance score (weighted combination)
      const relevanceScore = (semanticScore * 0.7) + (keywordScore * 0.3);

      // Only include provisions with decent relevance
      if (relevanceScore > 0.5) {
        // Create excerpt (first 200 chars or until sentence end)
        let excerpt = text.substring(0, 200);
        const lastSentence = excerpt.lastIndexOf('.');
        if (lastSentence > 100) {
          excerpt = excerpt.substring(0, lastSentence + 1);
        } else {
          excerpt += '...';
        }

        // Create chat prompt
        const chatPrompt = `Tell me more about this HR1 provision that affects ${stateName}: "${excerpt}"`;

        scoredProvisions.push({
          id,
          text,
          section,
          excerpt: excerpt.trim(),
          relevanceScore,
          semanticScore,
          keywordScore,
          chatPrompt
        });
      }
    });

    // Sort by relevance score and take top 10
    const topProvisions = scoredProvisions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    // Generate user-friendly summaries for the top provisions
    const provisionsWithSummaries = await generateFriendlySummaries(topProvisions, stateName, openaiClient);

    const response: StateProvisionsResponse = {
      state: stateCode,
      stateName,
      provisions: provisionsWithSummaries,
      totalFound: scoredProvisions.length,
      processingTime: Date.now() - startTime
    };

    return NextResponse.json({
      ...response,
      cached: false
    });

  } catch (error) {
    console.error("State provisions API error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch state-specific provisions",
        details: errorMessage,
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}