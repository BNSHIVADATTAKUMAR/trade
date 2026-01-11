
import React from 'react';
import { OrderBookLevel } from '../types';

interface OrderBookProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks }) => {
  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total),
    1
  );

  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const spreadPercent = bestAsk > 0 ? (spread / bestAsk) * 100 : 0;

  // Imbalance calculation for the top 10 levels
  const bidVolume = bids.slice(0, 10).reduce((sum, b) => sum + b.amount, 0);
  const askVolume = asks.slice(0, 10).reduce((sum, a) => sum + a.amount, 0);
  const totalVolume = bidVolume + askVolume;
  const buyPower = totalVolume > 0 ? (bidVolume / totalVolume) * 100 : 50;

  const COLOR_ASK = '248, 73, 96'; // #f84960
  const COLOR_BID = '2, 192, 118'; // #02c076

  return (
    <div className="bg-[#0a0a0a] h-full flex flex-col overflow-hidden select-none border-l border-[#1e293b]">
      {/* Power Balance Bar */}
      <div className="h-1 shrink-0 flex w-full">
         <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${buyPower}%` }} />
         <div className="h-full bg-rose-500 transition-all duration-700 flex-1" />
      </div>

      <div className="p-2 px-3 border-b border-[#1e293b] bg-[#111111] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-pulse" />
          <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Market Depth</h3>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[8px] font-black text-emerald-400 uppercase">B: {buyPower.toFixed(0)}%</span>
           <span className="text-[8px] font-black text-rose-400 uppercase">S: {(100 - buyPower).toFixed(0)}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 text-slate-600 font-black p-1.5 px-3 border-b border-[#1e293b]/30 bg-[#070707] uppercase tracking-tighter shrink-0 text-[9px]">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 flex flex-col min-h-0 text-[10px] mono">
        <div className="flex-1 flex flex-col-reverse overflow-hidden scrollbar-none border-b border-[#1e293b]/10">
          {asks.slice(0, 20).map((ask, i) => {
            const depthRatio = ask.total / maxTotal;
            return (
              <div key={`ask-${i}`} className="relative grid grid-cols-3 py-[1px] px-3 hover:bg-white/5 cursor-pointer group transition-colors shrink-0">
                <div 
                  className="absolute top-0 right-0 bottom-0 pointer-events-none transition-all duration-500 ease-out" 
                  style={{ 
                    width: `${depthRatio * 100}%`,
                    background: `linear-gradient(to left, rgba(${COLOR_ASK}, 0.15), rgba(${COLOR_ASK}, 0.01))` 
                  }} 
                />
                <span className="text-[#f84960] font-bold z-10">{ask.price.toFixed(1)}</span>
                <span className="text-slate-300 text-right z-10">{ask.amount.toFixed(3)}</span>
                <span className="text-slate-600 text-right z-10">{ask.total.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        <div className="h-12 bg-[#111111] border-y border-[#1e293b] flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(0,0,0,0.5)] z-20 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-black text-[#00ffaa] drop-shadow-[0_0_8px_rgba(0,255,170,0.3)]">
              {bestBid.toLocaleString(undefined, { minimumFractionDigits: 1 })}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">
              Spread <span className="text-slate-400">{spread.toFixed(1)} ({spreadPercent.toFixed(2)}%)</span>
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden scrollbar-none border-t border-[#1e293b]/10">
          {bids.slice(0, 20).map((bid, i) => {
            const depthRatio = bid.total / maxTotal;
            return (
              <div key={`bid-${i}`} className="relative grid grid-cols-3 py-[1px] px-3 hover:bg-white/5 cursor-pointer group transition-colors shrink-0">
                <div 
                  className="absolute top-0 right-0 bottom-0 pointer-events-none transition-all duration-500 ease-out" 
                  style={{ 
                    width: `${depthRatio * 100}%`,
                    background: `linear-gradient(to left, rgba(${COLOR_BID}, 0.15), rgba(${COLOR_BID}, 0.01))` 
                  }} 
                />
                <span className="text-[#02c076] font-bold z-10">{bid.price.toFixed(1)}</span>
                <span className="text-slate-300 text-right z-10">{bid.amount.toFixed(3)}</span>
                <span className="text-slate-600 text-right z-10">{bid.total.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="p-2 border-t border-[#1e293b] bg-[#070707] flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-tighter shrink-0">
        <span>Aggregation: 0.1</span>
        <span>Depth: {maxTotal.toFixed(0)}</span>
      </div>
    </div>
  );
};

export default OrderBook;
