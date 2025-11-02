import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
const ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

console.log("🔍 Testing Google Custom Search API...\n");
console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 20) + '...' : 'MISSING'}`);
console.log(`Engine ID: ${ENGINE_ID || 'MISSING'}\n`);

if (!API_KEY || !ENGINE_ID) {
  console.error("❌ Missing API key or Engine ID");
  process.exit(1);
}

async function testSearch() {
  try {
    console.log("Testing search query: 'Saturn astronomy NASA'...\n");
    
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: API_KEY,
        cx: ENGINE_ID,
        q: 'Saturn astronomy NASA',
        num: 5
      }
    });

    console.log("✅ SUCCESS! Search API is working\n");
    console.log(`Found ${response.data.items?.length || 0} results:\n`);
    
    response.data.items?.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.title}`);
      console.log(`   ${item.link}\n`);
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:\n");
    
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(`Error: ${JSON.stringify(err.response.data, null, 2)}`);
      
      if (err.response.status === 403) {
        console.error("\n🔧 TO FIX 403 ERROR:");
        console.error("1. Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com");
        console.error("2. Make sure 'Custom Search API' is ENABLED");
        console.error("3. Go to: https://console.cloud.google.com/apis/credentials");
        console.error("4. Find your API key and make sure it has 'Custom Search API' enabled");
        console.error("5. Verify your Search Engine ID is correct at: https://programmablesearchengine.google.com/");
      }
    } else {
      console.error(err.message);
    }
    
    process.exit(1);
  }
}

testSearch();

