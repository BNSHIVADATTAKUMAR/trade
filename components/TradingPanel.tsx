
import React, { useState, useEffect, useMemo } from 'react';
import { OrderSide, OrderType, ExchangeId } from '../types';

interface TradingPanelProps {
  onPlaceOrder: (side: OrderSide, type: OrderType, price: number, amount: number, leverage: number, exchange: ExchangeId, tp?: string, sl?: string) => void;
  currentPrice: number;
  balance: string;
  connected: boolean;
  symbol: string;
  exchangeId: ExchangeId;
}

const TradingPanel: React.FC<TradingPanelProps> = ({ onPlaceOrder, currentPrice, balance, connected, symbol, exchangeId }) => {
  const [orderType, setOrderType] = useState<OrderType>(OrderType.MARKET);
  const [marginMode, setMarginMode] = useState('Isolated');
  const [leverage, setLeverage] = useState(20);
  const [entryMargin, setEntryMargin] = useState<string>('');
  const [percentage, setPercentage] = useState(0);
  const [tpPercent, setTpPercent] = useState<number>(0); 
  const [slPercent, setSlPercent] = useState<number>(0);
  const [useTPSL, setUseTPSL] = useState(false);
  
  const currentBalance = parseFloat(balance) || 0;

  const precision = useMemo(() => {
    if (currentPrice > 1000) return 3;
    if (currentPrice > 100) return 2;
    if (currentPrice > 1) return 1;
    return 0;
  }, [currentPrice]);

  useEffect(() => {
    if (percentage > 0 && currentBalance > 0) {
      const safeMax = currentBalance * 0.98;
      setEntryMargin((safeMax * (percentage / 100)).toFixed(2));
    }
  }, [percentage, currentBalance]);

  const marginVal = parseFloat(entryMargin) || 0;
  const rawQty = (marginVal * leverage) / (currentPrice || 1);
  const qty = Number(rawQty.toFixed(precision));

  const tpPrice = useTPSL && tpPercent > 0 ? (currentPrice * (1 + (tpPercent / (100 * leverage)))).toFixed(2) : '';
  const slPrice = useTPSL && slPercent > 0 ? (currentPrice * (1 - (slPercent / (100 * leverage)))).toFixed(2) : '';

  // Risk Calculations
  const estLiqLong = currentPrice * (1 - (1 / leverage) * 0.9); // 0.9 factor for safety/maintenance margin
  const estLiqShort = currentPrice * (1 + (1 / leverage) * 0.9);
  const marginUsage = currentBalance > 0 ? (marginVal / currentBalance) * 100 : 0;

  const handleExecute = (side: OrderSide) => {
    if (qty <= 0) return;
    onPlaceOrder(side, orderType, currentPrice, qty, leverage, exchangeId, tpPrice || undefined, slPrice || undefined);
  };

  return (
    <div className="bg-[#181a20] text-[#eaecef] flex flex-col h-full overflow-hidden border-t border-[#2b2f36]">
      <div className="p-3 border-b border-[#2b2f36] space-y-3 bg-[#111111]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Terminal: {exchangeId.toUpperCase()}</span>
          <div className="flex gap-1">
            <button onClick={() => setMarginMode('Isolated')} className={`px-2 py-0.5 rounded text-[8px] font-black border ${marginMode === 'Isolated' ? 'bg-[#facc15] text-black border-[#facc15]' : 'border-[#2b2f36] text-slate-500'}`}>ISO</button>
            <button onClick={() => setMarginMode('Cross')} className={`px-2 py-0.5 rounded text-[8px] font-black border ${marginMode === 'Cross' ? 'bg-[#facc15] text-black border-[#facc15]' : 'border-[#2b2f36] text-slate-500'}`}>CROSS</button>
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-bold text-slate-500">
            <span>LEVERAGE ADJUSTMENT</span>
            <span className="text-[#facc15] font-black">{leverage}X</span>
          </div>
          <input 
            type="range" min="1" max="100" step="1" 
            value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2b2f36] rounded-lg appearance-none cursor-pointer accent-[#facc15]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Risk Visualizer Module */}
        <div className="bg-black/40 border border-[#2b2f36] rounded p-2.5 space-y-2">
           <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase">Risk Analysis</span>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${marginUsage > 50 ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {marginUsage > 50 ? 'HIGH EXPOSURE' : 'STABLE'}
              </span>
           </div>
           
           <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                 <span className="text-[8px] text-slate-600 font-bold uppercase">Est. Liq (Long)</span>
                 <span className="text-[11px] font-black text-rose-400 mono">{estLiqLong.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
              <div className="flex flex-col text-right">
                 <span className="text-[8px] text-slate-600 font-bold uppercase">Est. Liq (Short)</span>
                 <span className="text-[11px] font-black text-rose-400 mono">{estLiqShort.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
           </div>

           <div className="h-1 w-full bg-[#1e2329] rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${marginUsage > 70 ? 'bg-rose-500' : marginUsage > 40 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(marginUsage, 100)}%` }}
              />
           </div>
        </div>

        <div className="flex p-1 bg-[#0b0e11] rounded gap-1">
          {['LIMIT', 'MARKET'].map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t as OrderType)}
              className={`flex-1 py-1 text-[9px] font-black rounded transition-all ${orderType === t ? 'bg-[#2b2f36] text-white shadow' : 'text-slate-500'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="group bg-[#1e2329] border border-[#2b2f36] rounded p-2 focus-within:border-[#facc15] transition-all">
            <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase mb-1">
              <span>Order Cost</span>
              <span>USDT</span>
            </div>
            <input 
              type="text" value={entryMargin} onChange={(e) => setEntryMargin(e.target.value)}
              className="w-full bg-transparent text-base font-black mono outline-none text-white"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-between gap-1">
            {[10, 25, 50, 100].map(p => (
              <button
                key={p}
                onClick={() => setPercentage(p)}
                className={`flex-1 py-1 text-[8px] font-black rounded border ${percentage === p ? 'bg-[#facc15] text-black border-[#facc15]' : 'border-[#2b2f36] text-slate-500 hover:text-white'}`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0b0e11] rounded border border-[#2b2f36] p-2.5 space-y-2">
           <div className="flex justify-between text-[10px] font-black">
              <span className="text-slate-500 uppercase tracking-tighter">Contract Size</span>
              <span className="text-[#00ffaa] mono">{qty} {symbol}</span>
           </div>
           <div className="flex justify-between text-[9px] font-bold border-t border-[#2b2f36] pt-1.5">
              <span className="text-slate-600 uppercase">Notional Value</span>
              <span className="text-slate-400 mono">${(qty * currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
           </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2b2f36]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Exit (TP/SL)</span>
            <button onClick={() => setUseTPSL(!useTPSL)} className={`w-8 h-4 rounded-full relative transition-colors ${useTPSL ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${useTPSL ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>

          {useTPSL && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black">
                  <span className="text-emerald-500">TP Target (ROI: {tpPercent}%)</span>
                  <span className="text-slate-300 mono">{tpPrice}</span>
                </div>
                <input type="range" min="0" max="500" step="10" value={tpPercent} onChange={(e) => setTpPercent(parseInt(e.target.value))} className="w-full h-1 bg-emerald-500/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black">
                  <span className="text-rose-500">SL Target (ROI: -{slPercent}%)</span>
                  <span className="text-slate-300 mono">{slPrice}</span>
                </div>
                <input type="range" min="0" max="100" step="5" value={slPercent} onChange={(e) => setSlPercent(parseFloat(e.target.value))} className="w-full h-1 bg-rose-500/10 rounded-lg appearance-none cursor-pointer accent-rose-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-[#0b0e11] border-t border-[#2b2f36] flex gap-2">
        <button 
          onClick={() => handleExecute(OrderSide.BUY)} 
          className={`flex-1 py-3 rounded font-black text-[10px] uppercase transition-all active:scale-95 shadow-[0_4px_15px_rgba(16,185,129,0.2)] ${qty > 0 ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          BUY / LONG
        </button>
        <button 
          onClick={() => handleExecute(OrderSide.SELL)} 
          className={`flex-1 py-3 rounded font-black text-[10px] uppercase transition-all active:scale-95 shadow-[0_4px_15px_rgba(244,63,94,0.2)] ${qty > 0 ? 'bg-rose-500 hover:bg-rose-400 text-black' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          SELL / SHORT
        </button>
      </div>
    </div>
  );
};

export default TradingPanel;
