#!/usr/bin/env tsx

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const HR1_URL = "https://www.govtrack.us/congress/bills/117/hr1/text/eh";

interface BillTextExtractor {
  extractTextFromHtml(html: string): string;
}

class GovTrackExtractor implements BillTextExtractor {
  extractTextFromHtml(html: string): string {
    // Remove HTML tags and extract clean text
    let text = html
      // Remove script and style elements
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove navigation and sidebar content
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      // Remove ads and widgets
      .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div[^>]*id="[^"]*widget[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
      // Remove all HTML tags
      .replace(/<[^>]*>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .replace(/\n\s+/g, "\n")
      .trim();

    // Extract the main bill text (look for the bill content markers)
    const billStartMarkers = [
      "H. R. 1",
      "For the People Act of 2021",
      "To expand Americans' access to the ballot box",
    ];

    let billText = text;

    // Find the start of the actual bill text
    for (const marker of billStartMarkers) {
      const startIndex = text.indexOf(marker);
      if (startIndex !== -1) {
        billText = text.substring(startIndex);
        break;
      }
    }

    // Remove common page elements that might remain
    billText = billText
      .replace(/Download PDF.*?(?=\n|$)/gi, "")
      .replace(/Close Comparison.*?(?=\n|$)/gi, "")
      .replace(/Primary Source.*?(?=\n|$)/gi, "")
      .replace(/Government Publishing Office.*?(?=\n|$)/gi, "")
      .replace(/Widget for your website.*?(?=\n|$)/gi, "")
      .replace(/Follow GovTrack.*?(?=\n|$)/gi, "")
      .replace(/About Ads.*?(?=\n|$)/gi, "")
      .replace(/Hide These Ads.*?(?=\n|$)/gi, "")
      .replace(/React to this bill.*?(?=\n|$)/gi, "")
      .replace(/Save your opinion.*?(?=\n|$)/gi, "")
      .replace(/Add Note.*?(?=\n|$)/gi, "")
      .replace(/Visit us on.*?(?=\n|$)/gi, "")
      .trim();

    return billText;
  }
}

async function fetchHR1Data(): Promise<void> {
  try {
    console.log("🔄 Fetching HR1 bill text from GovTrack.us...");

    const response = await fetch(HR1_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HR1-SemanticQA/1.0; Educational Research Project)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch HR1 data: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();
    console.log("✅ Successfully fetched HTML content");

    // Extract clean text
    const extractor = new GovTrackExtractor();
    const cleanText = extractor.extractTextFromHtml(html);

    if (cleanText.length < 1000) {
      throw new Error(
        "Extracted text is too short - extraction may have failed"
      );
    }

    // Ensure data directory exists
    try {
      mkdirSync(DATA_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }

    // Save the clean text
    const outputPath = join(DATA_DIR, "hr1.txt");
    writeFileSync(outputPath, cleanText, "utf-8");

    console.log("✅ Successfully saved HR1 text");
    console.log(`📁 File location: ${outputPath}`);
    console.log(
      `📊 Text length: ${cleanText.length.toLocaleString()} characters`
    );
    console.log(
      `📄 Estimated tokens: ~${Math.round(cleanText.length / 4).toLocaleString()}`
    );

    // Create a summary file with metadata
    const metadata = {
      source: HR1_URL,
      fetchDate: new Date().toISOString(),
      title: "H.R.1 - For the People Act of 2021",
      description:
        "To expand Americans' access to the ballot box, reduce the influence of big money in politics, strengthen ethics rules for public servants, and implement other anti-corruption measures for the purpose of fortifying our democracy, and for other purposes.",
      textLength: cleanText.length,
      estimatedTokens: Math.round(cleanText.length / 4),
      extractionMethod: "GovTrack HTML parsing",
    };

    const metadataPath = join(DATA_DIR, "hr1-metadata.json");
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
    console.log(`📋 Metadata saved: ${metadataPath}`);

    console.log("\n🎉 HR1 data fetch completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Review the text file to ensure quality");
    console.log("2. Run the ingestion script: npm run ingest");
  } catch (error) {
    console.error("❌ Error fetching HR1 data:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fetchHR1Data();
}

export { fetchHR1Data };
