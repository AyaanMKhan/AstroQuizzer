import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    console.log("🔍 Fetching available Gemini models...\n");
    
    // Try to list models (if API supports it)
    try {
      const models = await genAI.listModels();
      console.log("✅ Available models:");
      models.forEach(model => {
        console.log(`   - ${model.name}`);
      });
    } catch (listError) {
      console.log("⚠️  List models endpoint not available, testing common models...\n");
      
      // Test common model names
      const modelNames = [
        "gemini-pro",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-1.0-pro",
        "models/gemini-pro",
        "models/gemini-1.5-pro"
      ];
      
      for (const modelName of modelNames) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          await model.generateContent("test");
          console.log(`✅ ${modelName} - AVAILABLE`);
        } catch (err) {
          console.log(`❌ ${modelName} - ${err.message.split('\n')[0]}`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

listModels();

