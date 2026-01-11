
import React, { useState } from 'react';
import { Position, Order, OrderSide, OrderType } from '../types';

interface TerminalTabsProps {
  positions: Position[];
  orders: Order[];
  onPlaceOrder?: any;
  onCancelOrder?: (orderId: string) => void;
  onSharePnL?: (position: Position) => void;
  currentPrice: number;
  balance: string;
}

const TerminalTabs: React.FC<TerminalTabsProps> = ({ positions, orders, currentPrice, balance, onCancelOrder, onSharePnL, onPlaceOrder }) => {
  const [activeTab, setActiveTab] = useState('ACTIVE POSITION');
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);

  const tabs = ['ACTIVE POSITION', 'OPEN ORDERS', 'TRADE AI', 'HISTORY'];
  const openOrders = orders.filter(o => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');

  const handleConfirmCancel = () => {
    if (cancelingOrder && onCancelOrder) {
      onCancelOrder(cancelingOrder.id);
      setCancelingOrder(null);
    }
  };

  const handleMarketClose = (p: Position) => {
    if (!onPlaceOrder) return;
    const oppositeSide = p.side === 'Buy' ? OrderSide.SELL : OrderSide.BUY;
    onPlaceOrder(oppositeSide, OrderType.MARKET, currentPrice, parseFloat(p.size), parseFloat(p.leverage), p.exchangeId);
  };

  const handleReverse = (p: Position) => {
    if (!onPlaceOrder) return;
    // 1. Close current position
    handleMarketClose(p);
    // 2. Open new position same size opposite side
    const oppositeSide = p.side === 'Buy' ? OrderSide.SELL : OrderSide.BUY;
    onPlaceOrder(oppositeSide, OrderType.MARKET, currentPrice, parseFloat(p.size), parseFloat(p.leverage), p.exchangeId);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden border-r border-[#1e293b] relative">
      {/* Cancellation Confirmation Modal */}
      {cancelingOrder && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-xs bg-[#181a20] border border-rose-500/30 rounded-lg shadow-2xl p-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/10 rounded-full">
                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Confirm Cancel</h3>
            </div>
            
            <div className="mb-6 space-y-2">
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Terminate this order? Action is non-reversible.
              </p>
              <div className="bg-black/40 p-2 rounded border border-white/5 mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">PAIR:</span>
                  <span className="text-white font-black">{cancelingOrder.pair}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">SIZE:</span>
                  <span className="text-white font-black">{cancelingOrder.amount}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={handleConfirmCancel} className="w-full py-2 bg-rose-500 hover:bg-rose-400 text-black text-[10px] font-black rounded uppercase transition-colors">KILL ORDER</button>
              <button onClick={() => setCancelingOrder(null)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black rounded uppercase transition-colors">STAND DOWN</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex bg-[#111111] border-b border-[#1e293b] shrink-0 justify-between items-center pr-2">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-[10px] font-black tracking-[0.1em] transition-all border-r border-[#1e293b] relative ${
                activeTab === tab ? 'bg-[#facc15] text-black shadow-inner' : 'text-slate-500 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {activeTab === 'ACTIVE POSITION' && positions.length > 0 && (
          <button 
            onClick={() => positions.forEach(p => handleMarketClose(p))}
            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-black text-[9px] font-black rounded border border-rose-500/30 transition-all uppercase"
          >
            Flatten All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeTab === 'ACTIVE POSITION' && (
          <table className="w-full text-left text-[11px] mono border-collapse">
            <thead className="sticky top-0 bg-[#0d1117] text-slate-500 border-b border-[#1e293b] z-20">
              <tr>
                <th className="px-4 py-2.5 font-black uppercase tracking-tighter">Asset</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-tighter">Side</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-tighter text-right">Size/Lev</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-tighter text-right">PnL (ROI%)</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-tighter text-right">Liq.</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-tighter text-center">Fast Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/20">
              {positions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-slate-800 font-black opacity-40 uppercase tracking-[0.4em] text-[10px]">No Active Exposure</td></tr>
              ) : (
                positions.map((p, i) => {
                  const pnl = parseFloat(p.unrealisedPnl || '0');
                  const isProfit = pnl >= 0;

                  return (
                    <tr key={i} className="hover:bg-[#151515] transition-colors group">
                      <td className="px-4 py-3 border-r border-[#1e293b]/30">
                        <div className="font-black text-white">{p.symbol}</div>
                        <div className="text-[7px] text-slate-600 font-black uppercase">{p.exchangeId} Node</div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#1e293b]/30">
                        <div className={`text-[10px] font-black uppercase ${p.side === 'Buy' ? 'text-[#00ffaa]' : 'text-rose-500'}`}>
                          {p.side === 'Buy' ? 'LONG' : 'SHORT'}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#1e293b]/30 text-right">
                        <div className="text-white font-bold">{p.size}</div>
                        <div className="text-[9px] text-[#facc15] font-black">{p.leverage}X</div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#1e293b]/30 text-right">
                        <div className={`font-black text-[11px] ${isProfit ? 'text-[#00ffaa]' : 'text-rose-500'}`}>
                          {isProfit ? '+' : ''}{pnl.toFixed(2)}
                        </div>
                        <div className="text-[8px] text-slate-500 font-bold uppercase">ROI: {((pnl / 100) * 100).toFixed(1)}%</div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#1e293b]/30 text-right">
                        <div className="font-black text-rose-500/60">
                          {parseFloat(p.liqPrice).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button 
                            onClick={() => handleReverse(p)}
                            className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white text-[9px] font-black rounded border border-blue-500/20 transition-all uppercase"
                          >
                            Reverse
                          </button>
                          <button 
                            onClick={() => handleMarketClose(p)}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[9px] font-black rounded border border-rose-500/20 transition-all uppercase"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* ... Rest of the tabs ... */}
        {activeTab === 'OPEN ORDERS' && (
           <div className="p-4 text-center text-slate-700 font-black uppercase tracking-widest text-[10px]">Orders View Under Construction</div>
        )}
      </div>
    </div>
  );
};

export default TerminalTabs;
