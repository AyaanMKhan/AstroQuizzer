import axios from "axios";
import dotenv from "dotenv";

// Load environment variables from backend/.env when running this script locally
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const API_URL = process.env.API_URL || "http://localhost:5001";

async function testEndpoint() {
  try {
    console.log("🧪 Testing APOD endpoint...");
    console.log(`📍 URL: ${API_URL}/api/apod/today\n`);

    const response = await axios.get(`${API_URL}/api/apod/today`);
    
    console.log("✅ Success! Response:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📅 Date: ${response.data.date}`);
    console.log(`📰 Title: ${response.data.title}`);
    console.log(`🖼️  Media Type: ${response.data.media_type}`);
    console.log(`🔗 URL: ${response.data.url}`);
    console.log(`\n📖 Explanation (first 200 chars):`);
    console.log(response.data.explanation.substring(0, 200) + "...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error("❌ Error:", err.response.status, err.response.data);
    } else if (err.code === 'ECONNREFUSED') {
      console.error("❌ Connection refused. Is the server running?");
      console.error("   Start it with: npm run dev");
    } else {
      console.error("❌ Error:", err.message);
    }
    process.exit(1);
  }
}

testEndpoint();
