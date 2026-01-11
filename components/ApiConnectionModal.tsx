
import React, { useState } from 'react';
import { ExchangeConfig } from '../types';

interface ApiConnectionModalProps {
  exchange: ExchangeConfig;
  onClose: () => void;
  onConnect: (id: string, key: string, secret: string, proxy?: string, isTestnet?: boolean, passphrase?: string) => void;
}

const ApiConnectionModal: React.FC<ApiConnectionModalProps> = ({ exchange, onClose, onConnect }) => {
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [proxy, setProxy] = useState('');
  const [testnet, setTestnet] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key && secret) {
      onConnect(exchange.id, key.trim(), secret.trim(), proxy.trim(), testnet, passphrase.trim());
    }
  };

  const isOkx = exchange.id === 'okx';
  const isCoinDcx = exchange.id === 'coindcx';

  const handleApplyProxy = () => {
    setProxy('https://cors-anywhere.herokuapp.com/');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#181a20] border border-[#2b2f36] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#2b2f36] bg-[#0b0e11]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#f0b90b]">
            Link {exchange.id.toUpperCase()} Gateway
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-3">
            <div className={`p-3 rounded border ${isCoinDcx ? 'bg-rose-500/5 border-rose-500/20' : 'bg-[#f0b90b]/5 border-[#f0b90b]/20'}`}>
              <h4 className={`text-[10px] font-black uppercase mb-1 ${isCoinDcx ? 'text-rose-400' : 'text-[#f0b90b]'}`}>
                {isCoinDcx ? 'CORS Warning:' : 'Configuration Tip:'}
              </h4>
              <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                {isCoinDcx 
                  ? "CoinDCX blocks direct browser requests. A CORS Proxy URL is MANDATORY for this exchange." 
                  : `Ensure "Futures Trading" and "Margin Trade" are enabled on your ${exchange.id} API dashboard.`}
                {isOkx && " OKX requires a Passphrase set during API creation."}
              </p>
            </div>

            <div className="flex items-center justify-between bg-[#1e2329] p-3 rounded border border-[#2b2f36]">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase">Enable Sandbox Mode</span>
                <span className="text-[8px] text-slate-500 uppercase tracking-tighter">Use Testnet Endpoints</span>
              </div>
              <button 
                type="button"
                onClick={() => setTestnet(!testnet)}
                className={`w-10 h-5 rounded-full relative transition-colors ${testnet ? 'bg-[#facc15]' : 'bg-[#2b2f36]'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${testnet ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">API Key</label>
              <input 
                type="text" 
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-[#1e2329] border border-[#2b2f36] rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-[#f0b90b] mono"
                placeholder={`Enter your ${exchange.id} API Key`}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">API Secret</label>
              <input 
                type="password" 
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-[#1e2329] border border-[#2b2f36] rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-[#f0b90b] mono"
                placeholder="Enter your Secret Key"
                required
              />
            </div>

            {isOkx && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Passphrase (OKX Only)</label>
                <input 
                  type="password" 
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full bg-[#1e2329] border border-[#2b2f36] rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-[#f0b90b] mono"
                  placeholder="Enter your API Passphrase"
                  required={isOkx}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Proxy URL (Recommended)</label>
                <button 
                  type="button" 
                  onClick={handleApplyProxy}
                  className="text-[8px] text-[#facc15] font-black hover:underline uppercase"
                >
                  Use Public Proxy
                </button>
              </div>
              <input 
                type="text" 
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                className="w-full bg-[#1e2329] border border-[#2b2f36] rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-[#f0b90b] mono"
                placeholder="e.g. https://cors-anywhere.herokuapp.com/"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2 text-xs font-bold text-slate-400 border border-[#2b2f36] hover:bg-[#2b2f36] rounded transition-all"
            >
              CANCEL
            </button>
            <button 
              type="submit"
              className="flex-1 py-2 text-xs font-bold bg-[#f0b90b] text-[#181a20] hover:bg-[#dca30a] rounded transition-all shadow-lg"
            >
              ACTIVATE NODE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiConnectionModal;
