#!/usr/bin/env tsx

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: join(process.cwd(), ".env.local") });

// US States for processing
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
  { code: "PR", name: "Puerto Rico" },
  { code: "GU", name: "Guam" },
  { code: "VI", name: "U.S. Virgin Islands" },
  { code: "AS", name: "American Samoa" },
  { code: "MP", name: "Northern Mariana Islands" }
];

async function precomputeAllStates() {
  console.log("🚀 Starting precomputation of state provisions for all 56 states/territories...");
  
  const cacheDir = join(process.cwd(), "data", "state-provisions-cache");
  
  // Ensure cache directory exists
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  let completed = 0;
  let errors = 0;

  for (const state of US_STATES) {
    try {
      console.log(`📊 Processing ${state.name} (${state.code})...`);
      
      const response = await fetch(`${baseUrl}/api/state-provisions/${state.code}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Save to cache file
      const cacheFile = join(cacheDir, `${state.code.toLowerCase()}.json`);
      writeFileSync(cacheFile, JSON.stringify(data, null, 2));
      
      completed++;
      console.log(`  ✅ ${state.name}: ${data.provisions.length} provisions found (${data.processingTime}ms)`);
      
      // Small delay to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      errors++;
      console.error(`  ❌ ${state.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Generate summary
  const summary = {
    totalStates: US_STATES.length,
    completed,
    errors,
    generatedAt: new Date().toISOString(),
    cacheDirectory: cacheDir
  };

  const summaryFile = join(cacheDir, "precompute-summary.json");
  writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  console.log(`\n🎉 Precomputation complete!`);
  console.log(`📊 Summary:`);
  console.log(`  • Total states: ${summary.totalStates}`);
  console.log(`  • Successfully processed: ${summary.completed}`);
  console.log(`  • Errors: ${summary.errors}`);
  console.log(`📁 Cache saved to: ${cacheDir}`);
}

async function main() {
  try {
    await precomputeAllStates();
  } catch (error) {
    console.error("❌ Precomputation failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { precomputeAllStates };