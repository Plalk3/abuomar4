import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

// NOTE: In a real production app, the API key should be handled via a backend proxy 
// to avoid exposing it in the client. For this standalone demo, we assume it's provided.

export const analyzeDataWithGemini = async (transactions: Transaction[], query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare a summarized version of data to save tokens
  const dataSummary = transactions.map(t => ({
    date: t.date.split('T')[0],
    driver: t.driverName,
    car: t.vehicleNumber,
    route: t.route,
    totalExpenses: t.totalExpenses,
    fuel: t.expenses.fuel,
    maintenance: t.expenses.maintenance,
    net: t.netBalance
  })).slice(-50); // Send last 50 for context to avoid token limits in free tier

  const prompt = `
    You are a financial assistant for a logistics/driver management system called "Abu Omar".
    Here is the recent transaction data (JSON format):
    ${JSON.stringify(dataSummary)}

    User Query: "${query}"

    Please analyze the data and provide a helpful, concise answer in Arabic.
    Focus on insights, anomalies, or specific values requested.
    If the answer involves money, use EGP currency format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، حدث خطأ أثناء تحليل البيانات. تأكد من صحة مفتاح API.";
  }
};