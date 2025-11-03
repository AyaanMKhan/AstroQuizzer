import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not found in .env");
  process.exit(1);
}

console.log(`✅ API Key found (length: ${GEMINI_API_KEY.length})`);
console.log(`🔑 First 10 chars: ${GEMINI_API_KEY.substring(0, 10)}...`);

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Try the most common model names
const modelNames = [
  "gemini-pro",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.0-pro"
];

async function testModels() {
  for (const modelName of modelNames) {
    try {
      console.log(`\n🧪 Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say hello");
      const response = await result.response;
      const text = response.text();
      console.log(`✅ ${modelName} WORKS! Response: ${text.substring(0, 50)}...`);
      console.log(`✅ This is the model you should use!`);
      return modelName;
    } catch (err) {
      const errorMsg = err.message || err.toString();
      if (errorMsg.includes("404")) {
        console.log(`❌ ${modelName} - Model not found (404)`);
      } else if (errorMsg.includes("403") || errorMsg.includes("API key")) {
        console.log(`❌ ${modelName} - API key issue (403 or invalid key)`);
      } else if (errorMsg.includes("429")) {
        console.log(`❌ ${modelName} - Rate limit (429)`);
      } else {
        console.log(`❌ ${modelName} - ${errorMsg.substring(0, 100)}`);
      }
    }
  }
  return null;
}

// Also try to list models if possible
async function tryListModels() {
  try {
    console.log("\n🔍 Attempting to list available models...");
    // The SDK might not have this method, but let's try
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Available models:");
      if (data.models) {
        data.models.forEach(model => {
          console.log(`   - ${model.name}`);
        });
      }
    } else {
      console.log(`⚠️ Could not list models (${response.status})`);
    }
  } catch (err) {
    console.log(`⚠️ Could not list models: ${err.message}`);
  }
}

async function main() {
  await tryListModels();
  const workingModel = await testModels();
  
  if (!workingModel) {
    console.log("\n❌ No models worked. Possible issues:");
    console.log("1. API key is invalid or doesn't have Gemini API access");
    console.log("2. API key needs to be from: https://aistudio.google.com/app/apikey");
    console.log("3. Check your Google Cloud Console to enable Gemini API");
    console.log("4. Verify the API key format matches Google AI Studio format");
  } else {
    console.log(`\n✅ Use this model name: ${workingModel}`);
    console.log(`Update your code to use: "${workingModel}"`);
  }
}

main().catch(console.error);

