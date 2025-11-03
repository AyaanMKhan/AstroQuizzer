// Example usage of Gemini client
// This file is just for reference - you can delete it if you want

import { generateText, generateChat, getGeminiModel } from "./geminiClient.js";

// Example 1: Simple text generation
async function example1() {
  try {
    const response = await generateText("What is the capital of France?");
    console.log("Response:", response);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Example 2: Chat with history
async function example2() {
  try {
    const messages = [
      { role: "user", content: "My name is John" },
      { role: "assistant", content: "Nice to meet you, John!" },
      { role: "user", content: "What's my name?" }
    ];
    const response = await generateChat(messages);
    console.log("Response:", response);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Example 3: Direct model access
async function example3() {
  try {
    const model = getGeminiModel("gemini-pro");
    const result = await model.generateContent("Tell me a joke");
    const response = await result.response;
    console.log("Response:", response.text());
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Uncomment to test:
// example1();
// example2();
// example3();

