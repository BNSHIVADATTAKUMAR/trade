
import React from 'react';

interface BloombergTickerProps {
  priceMap: Record<string, { price: number; change: number }>;
}

const BloombergTicker: React.FC<BloombergTickerProps> = ({ priceMap }) => {
  // Fix: Explicitly type the entries to prevent 'unknown' inference in some TS versions
  const pairs = Object.entries(priceMap) as [string, { price: number; change: number }][];
  
  // News items to mix in for the Bloomberg feel
  const newsItems = [
    { label: "BREAKING", text: "WHALE WALLET MOVED 4,200 BTC TO COINBASE", color: "#ff3e3e" },
    { label: "NEXUS AI", text: "SENTIMENT SHIFT: EXTREME FEAR TO NEUTRAL", color: "#facc15" },
    { label: "MARKET", text: "TOTAL LIQUIDATIONS LAST 1H: $42.4M", color: "#00ffaa" }
  ];

  return (
    <div className="h-8 bg-black border-y border-[#1e293b] flex items-center overflow-hidden select-none font-mono relative z-50">
      {/* Bloomberg Label */}
      <div className="absolute left-0 h-full bg-[#ff9a00] px-3 flex items-center z-10 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
        <span className="text-black text-[10px] font-black tracking-tighter">NX TERMINAL</span>
      </div>

      <div className="flex whitespace-nowrap animate-marquee items-center pl-28">
        {/* Market Pairs */}
        {pairs.concat(pairs).map(([symbol, data], i) => (
          <div key={`${symbol}-${i}`} className="flex items-center mx-6 gap-2">
            <span className="text-[#ff9a00] text-[10px] font-black uppercase tracking-tight">{symbol}/USDT</span>
            <span className="text-white text-[11px] font-bold">{data.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
            <span className={`text-[9px] font-black ${data.change >= 0 ? 'text-[#00ffaa]' : 'text-[#ff3e3e]'}`}>
              {data.change >= 0 ? '▲' : '▼'}{Math.abs(data.change).toFixed(2)}%
            </span>
          </div>
        ))}

        {/* Injected News */}
        {newsItems.map((news, i) => (
          <div key={`news-${i}`} className="flex items-center mx-8 gap-2">
            <span className="px-1.5 py-0.5 rounded-sm text-black text-[9px] font-black" style={{ backgroundColor: news.color }}>{news.label}</span>
            <span className="text-white text-[10px] font-bold tracking-tight opacity-90 italic">{news.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          /* Slowed down from 40s to 120s for better tracking */
          animation: marquee 120s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default BloombergTicker;
