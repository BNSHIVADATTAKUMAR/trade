
import React from 'react';
import { Position } from '../types';

interface SharePnLModalProps {
  position: Position;
  onClose: () => void;
}

const SharePnLModal: React.FC<SharePnLModalProps> = ({ position, onClose }) => {
  const pnl = parseFloat(position.unrealisedPnl);
  const isProfit = pnl >= 0;
  const margin = (parseFloat(position.size) * parseFloat(position.avgPrice)) / parseFloat(position.leverage);
  const roi = (pnl / margin) * 100;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="relative animate-in fade-in zoom-in duration-300">
        {/* The Card */}
        <div className="w-[450px] bg-[#050505] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,1)] relative">
          
          {/* Top Section - Brand & Grid */}
          <div className="h-64 relative overflow-hidden p-8 flex flex-col justify-between">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#facc15] rounded flex items-center justify-center">
                  <span className="text-black font-black text-sm italic">N</span>
                </div>
                <span className="text-white font-black text-sm tracking-tighter uppercase">Nexus Core</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Global Terminal</span>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{position.symbol}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${position.side === 'Buy' ? 'bg-[#00ffaa]/20 text-[#00ffaa]' : 'bg-rose-500/20 text-rose-500'}`}>
                  {position.side === 'Buy' ? 'Long' : 'Short'} {position.leverage}x
                </span>
              </div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">ROI</div>
              <div className={`text-6xl font-black italic tracking-tighter drop-shadow-lg ${isProfit ? 'text-[#00ffaa]' : 'text-rose-500'}`}>
                {isProfit ? '+' : ''}{roi.toFixed(2)}%
              </div>
            </div>

            {/* Floating Visual Asset - Replicating Bybit Style */}
            <div className="absolute right-[-20px] top-[60px] opacity-80 pointer-events-none scale-125">
               <div className="relative w-40 h-40">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#facc15]/20 to-transparent rounded-full blur-3xl" />
                  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                    <rect x="50" y="70" width="100" height="70" rx="10" fill="#facc15" />
                    <circle cx="100" cy="105" r="10" fill="#854d0e" />
                    {/* Floating coins */}
                    <circle cx="160" cy="40" r="12" fill="#fef08a" opacity="0.6" />
                    <circle cx="140" cy="80" r="8" fill="#fef08a" opacity="0.4" />
                  </svg>
               </div>
            </div>
          </div>

          {/* Middle Section - Prices */}
          <div className="px-8 py-6 bg-white/5 border-t border-white/5 flex gap-12 relative z-10">
            <div>
              <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Entry Price</div>
              <div className="text-white text-lg font-black mono">{parseFloat(position.avgPrice).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Mark Price</div>
              <div className="text-white text-lg font-black mono">{parseFloat(position.markPrice).toLocaleString()}</div>
            </div>
          </div>

          {/* Bottom Section - Referral/QR */}
          <div className="bg-white p-6 flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500 font-bold leading-tight">Join Nexus Core Terminal & claim</div>
              <div className="text-[11px] text-slate-800 font-black uppercase">Trade with AI Intelligence</div>
              <div className="text-xs text-slate-900 font-black mt-2">Referral Code: <span className="text-blue-600">NEXUS-PRO</span></div>
            </div>
            <div className="w-16 h-16 bg-slate-100 rounded p-1.5 border border-slate-200">
              <div className="w-full h-full bg-slate-900 flex items-center justify-center rounded-sm">
                 <div className="grid grid-cols-3 gap-0.5">
                    {[...Array(9)].map((_, i) => <div key={i} className="w-2 h-2 bg-white" />)}
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] rounded-full transition-all border border-white/10">
            Close
          </button>
          <button className="flex-1 py-3 bg-[#facc15] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-full transition-all shadow-xl shadow-[#facc15]/20">
            Download Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePnLModal;
