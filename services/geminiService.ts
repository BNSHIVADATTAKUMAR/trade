
import { GoogleGenAI, Type } from "@google/genai";
import { OrderBookLevel, MarketTicker } from "../types";

// Resilient initialization
const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const getMarketAnalysis = async (
  ticker: MarketTicker,
  bids: OrderBookLevel[],
  asks: OrderBookLevel[]
) => {
  if (!ai) {
    return "AI Module Offline: API_KEY not detected in environment. Please set your key and restart the server.";
  }

  const prompt = `
    Analyze the following crypto market data for ${ticker.pair}:
    - Current Price: ${ticker.lastPrice}
    - 24h Change: ${ticker.change24h}%
    - 24h High/Low: ${ticker.high24h} / ${ticker.low24h}
    - 24h Volume: ${ticker.volume24h}
    
    Order Book Snapshots:
    Bids (Top 5): ${JSON.stringify(bids.slice(0, 5))}
    Asks (Top 5): ${JSON.stringify(asks.slice(0, 5))}
    
    Provide a concise technical analysis including:
    1. Market Sentiment (Bullish/Bearish/Neutral)
    2. Key Support and Resistance levels based on the order book depth.
    3. A short-term trading recommendation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Unable to perform AI analysis at this time. Please check your connectivity or API project billing.";
  }
};
