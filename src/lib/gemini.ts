import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const gemini = genAI.getGenerativeModel({
  model: "gemini-3.8-flash",
});