#!/usr/bin/env tsx

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const HR1_URL =
  "https://www.congress.gov/bill/119th-congress/house-bill/1/text";

interface BillTextExtractor {
  extractTextFromHtml(html: string): string;
}

class CongressGovExtractor implements BillTextExtractor {
  extractTextFromHtml(html: string): string {
    // Congress.gov has the bill text in specific containers
    // Look for the main content area with bill text
    let text = html;

    // Try to extract just the bill content area
    const billContentMatch =
      html.match(
        /<div[^>]*class="[^"]*bill-summary-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      ) ||
      html.match(/<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

    if (billContentMatch) {
      text = billContentMatch[1];
    }

    // Remove HTML tags and extract clean text
    text = text
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
      // Remove forms and buttons
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "")
      .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
      // Remove all HTML tags but preserve line breaks
      .replace(/<br[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
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
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Extract the main bill text (look for the bill content markers)
    const billStartMarkers = [
      "H. R. 1",
      "For the People Act",
      "To expand Americans' access to the ballot box",
      "IN THE HOUSE OF REPRESENTATIVES",
      "Congress:",
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

    // Remove common Congress.gov page elements that might remain
    billText = billText
      .replace(/Text available as:.*?(?=\n|$)/gi, "")
      .replace(/Download PDF.*?(?=\n|$)/gi, "")
      .replace(/Compare.*?(?=\n|$)/gi, "")
      .replace(/Print this page.*?(?=\n|$)/gi, "")
      .replace(/Send to printer.*?(?=\n|$)/gi, "")
      .replace(/More bill information.*?(?=\n|$)/gi, "")
      .replace(/Congress.gov.*?(?=\n|$)/gi, "")
      .replace(/Library of Congress.*?(?=\n|$)/gi, "")
      .replace(/Browse by Date.*?(?=\n|$)/gi, "")
      .replace(/About this website.*?(?=\n|$)/gi, "")
      .trim();

    return billText;
  }
}

async function fetchHR1Data(): Promise<void> {
  try {
    console.log(
      "🔄 Fetching HR1 bill text from Congress.gov (119th Congress)..."
    );

    const response = await fetch(HR1_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
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
    const extractor = new CongressGovExtractor();
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
      source: "Manual download from Congress.gov",
      fetchDate: new Date().toISOString(),
      title: "H.R.1 - One Big Beautiful Bill Act (119th Congress)",
      description:
        "To provide for reconciliation pursuant to title II of H. Con. Res. 14. A comprehensive reconciliation bill covering tax relief, border security, energy policy, healthcare reforms, education funding, and government efficiency measures.",
      textLength: cleanText.length,
      estimatedTokens: Math.round(cleanText.length / 4),
      extractionMethod: "Manual download from Congress.gov",
      congress: "119th Congress (2025-2027)",
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
