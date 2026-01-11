
import React from 'react';
import { Trade, OrderSide } from '../types';

interface TradeFlowProps {
  trades: Trade[];
}

const TradeFlow: React.FC<TradeFlowProps> = ({ trades }) => {
  return (
    <div className="bg-[#0a0a0a] h-full flex flex-col overflow-hidden border-t border-[#1e293b]">
      <div className="p-2 px-3 border-b border-[#1e293b] bg-[#111111] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ffaa] animate-pulse" />
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Trade Flow</h3>
        </div>
        <span className="text-[8px] text-slate-600 font-bold mono">REALTIME TAPE</span>
      </div>

      <div className="grid grid-cols-3 text-slate-600 font-black p-1.5 px-3 border-b border-[#1e293b]/30 bg-[#070707] uppercase tracking-tighter shrink-0 text-[8px]">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
        {trades.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[9px] text-slate-700 font-black uppercase tracking-widest italic opacity-40">
            Waiting for tape...
          </div>
        ) : (
          trades.map((trade) => (
            <div 
              key={trade.id} 
              className="grid grid-cols-3 py-[1px] px-3 text-[10px] mono border-b border-[#1e293b]/5 hover:bg-white/5 transition-colors"
            >
              <span className={`font-bold ${trade.side === OrderSide.BUY ? 'text-[#00ffaa]' : 'text-[#ff3344]'}`}>
                {trade.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}
              </span>
              <span className="text-slate-300 text-right">
                {trade.amount.toFixed(3)}
              </span>
              <span className="text-slate-600 text-right">
                {new Date(trade.time).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TradeFlow;
