
import React from 'react';

interface AccountSummaryCardProps {
  balance: string;
  totalUnrealizedPnl: number;
  status?: 'ONLINE' | 'OFFLINE' | 'CORS_ERROR';
}

const AccountSummaryCard: React.FC<AccountSummaryCardProps> = ({ balance, totalUnrealizedPnl, status = 'OFFLINE' }) => {
  const availableBalance = parseFloat(balance);
  const totalEquity = availableBalance + totalUnrealizedPnl;
  const isProfit = totalUnrealizedPnl >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-[#0a0a0a] border-b border-[#1e293b] p-1">
      {/* Total Equity */}
      <div className="bg-[#111111] p-3 border border-[#1e293b]/50 group hover:border-[#facc15]/50 transition-all">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Equity</span>
          <div className="flex items-center gap-1.5">
             <span className="text-[8px] font-black text-slate-600 uppercase mono">GATEWAY</span>
             <span className={`w-1.5 h-1.5 rounded-full ${status === 'ONLINE' ? 'bg-[#00ffaa]' : status === 'CORS_ERROR' ? 'bg-orange-500 animate-pulse' : 'bg-rose-500'}`}></span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black mono tracking-tighter ${status === 'ONLINE' ? 'text-white' : 'text-slate-700'}`}>
            {status === 'ONLINE' ? totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-500 font-bold mono uppercase">USDT</span>
        </div>
      </div>

      {/* Available Balance */}
      <div className="bg-[#111111] p-3 border border-[#1e293b]/50 group hover:border-blue-500/50 transition-all">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available Balance</span>
          {status === 'CORS_ERROR' && (
            <span className="text-[7px] bg-rose-500/10 text-rose-500 px-1 font-black rounded uppercase">CORS BLOCK</span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black mono tracking-tighter ${status === 'ONLINE' ? 'text-white' : 'text-slate-700'}`}>
            {status === 'ONLINE' ? availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-500 font-bold mono uppercase">USDT</span>
        </div>
      </div>

      {/* Total Unrealized PnL */}
      <div className={`bg-[#111111] p-3 border border-[#1e293b]/50 group transition-all ${isProfit ? 'hover:border-[#00ffaa]/50' : 'hover:border-rose-500/50'}`}>
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Unrealized PnL</span>
          <span className={`text-[10px] font-bold ${isProfit ? 'text-[#00ffaa]' : 'text-rose-500'}`}>
            {isProfit ? '▲' : '▼'} {status === 'ONLINE' && availableBalance > 0 ? Math.abs((totalUnrealizedPnl / availableBalance) * 100).toFixed(2) : '0.00'}%
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black mono tracking-tighter ${isProfit ? 'text-[#00ffaa]' : 'text-rose-500'}`}>
            {isProfit ? '+' : ''}{totalUnrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 font-bold mono uppercase">USDT</span>
        </div>
      </div>
    </div>
  );
};

export default AccountSummaryCard;
