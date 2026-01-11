
import React, { useState } from 'react';
import { getMarketAnalysis } from '../services/geminiService';
import { MarketTicker, OrderBookLevel } from '../types';

interface AIAssistantProps {
  ticker: MarketTicker;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ ticker, bids, asks }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await getMarketAnalysis(ticker, bids, asks);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="bg-[#181a20]/95 backdrop-blur-md border border-[#facc15]/30 rounded-lg p-4 flex flex-col h-full shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#facc15] rounded">
            <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
            </svg>
          </div>
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Nexus Intelligence</h3>
        </div>
        {loading && (
          <div className="flex gap-1">
             <div className="w-1 h-1 bg-[#facc15] rounded-full animate-bounce"></div>
             <div className="w-1 h-1 bg-[#facc15] rounded-full animate-bounce delay-75"></div>
             <div className="w-1 h-1 bg-[#facc15] rounded-full animate-bounce delay-150"></div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-[11px] leading-relaxed text-slate-300 font-medium">
        {analysis ? (
          <div className="whitespace-pre-wrap">
            {analysis}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-[10px] text-slate-500 italic uppercase tracking-widest font-black opacity-60">
              Standing by for {ticker.pair} Scan...
            </div>
            <p className="text-[9px] text-slate-600 px-4 font-bold">
              Gemini 3 Flash will analyze order book depth, sentiment, and volume clusters to provide real-time trade signals.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className={`mt-4 w-full py-2.5 rounded font-black text-[10px] uppercase tracking-widest transition-all border ${
          loading 
            ? 'bg-[#2b2f36] text-slate-500 border-transparent cursor-not-allowed' 
            : 'bg-[#facc15] text-black border-[#facc15] hover:bg-black hover:text-[#facc15] shadow-lg shadow-[#facc15]/10 active:scale-95'
        }`}
      >
        {loading ? 'PROCESSING SIGNALS...' : 'EXECUTE AI SCAN'}
      </button>
    </div>
  );
};

export default AIAssistant;
