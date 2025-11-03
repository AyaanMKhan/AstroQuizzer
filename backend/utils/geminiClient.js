import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not found in .env");
}

// Initialize Gemini client
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Get a Gemini model instance
 * @param {string} modelName - Model name (default: 'gemini-2.5-flash')
 * @returns {Object|null} Model instance or null if API key is missing
 */
export function getGeminiModel(modelName = "gemini-2.5-flash") {
  if (!genAI) {
    throw new Error("Gemini API key not configured. Set GEMINI_API_KEY in .env");
  }
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Make a simple text completion request
 * @param {string} prompt - The prompt to send to the model
 * @param {string} modelName - Model name (default: 'gemini-2.5-flash')
 * @param {boolean} useWebSearch - Enable Google Search grounding (default: true for resource generation)
 * @returns {Promise<string>} The generated text response
 */
export async function generateText(prompt, modelName = "gemini-2.5-flash", useWebSearch = false) {
  try {
    if (!genAI) {
      throw new Error("Gemini API key not configured");
    }

    // Use gemini-2.5-flash as default (fast and efficient)
    // For search grounding, we'll use the model and enable the search tool
    const modelToUse = modelName; // Use provided model or default to gemini-2.5-flash
    const model = getGeminiModel(modelToUse);
    
    // Configure with Google Search grounding if requested
    let result;
    if (useWebSearch) {
      try {
        // Try to use Google Search retrieval tool to find real, current links
        // Note: This feature may not be available in all API versions
        result = await model.generateContent(prompt, {
          tools: [{ googleSearchRetrieval: {} }]
        });
      } catch (searchError) {
        // If search grounding fails, fall back to regular generation
        // The prompt is already designed to ask for real links
        console.warn("⚠️ Google Search grounding not available, using regular generation");
        result = await model.generateContent(prompt);
      }
    } else {
      result = await model.generateContent(prompt);
    }
    
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("❌ Gemini API error:", err.message);
    throw err;
  }
}

/**
 * Make a chat completion request (with conversation history)
 * @param {Array} messages - Array of message objects with 'role' and 'content'
 * @param {string} modelName - Model name (default: 'gemini-2.5-flash')
 * @returns {Promise<string>} The generated text response
 */
export async function generateChat(messages, modelName = "gemini-2.5-flash") {
  try {
    if (!genAI) {
      throw new Error("Gemini API key not configured");
    }

    const model = getGeminiModel(modelName);
    
    // Convert messages to Gemini format
    const chat = model.startChat({
      history: messages.slice(0, -1).map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }))
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("❌ Gemini Chat API error:", err.message);
    throw err;
  }
}

export default genAI;

