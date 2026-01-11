
import React, { useState, useEffect, useRef, useMemo } from 'react';
import OrderBook from './components/OrderBook';
import MarketChart, { CandleData } from './components/MarketChart';
import TradingViewChart from './components/TradingViewChart';
import TerminalTabs from './components/TerminalTabs';
import ApiConnectionModal from './components/ApiConnectionModal';
import SharePnLModal from './components/SharePnLModal';
import TradingPanel from './components/TradingPanel';
import AIAssistant from './components/AIAssistant';
import TradeFlow from './components/TradeFlow';
import AccountSummaryCard from './components/AccountSummaryCard';
import BloombergTicker from './components/BloombergTicker';
import { 
  binanceApi, 
  bybitApi, 
  coindcxApi, 
  okxApi, 
  hyperliquidApi, 
  bingxApi, 
  coinbaseApi, 
  coinswitchApi 
} from './services/exchangeService';
import { 
  OrderSide, 
  OrderType, 
  OrderBookLevel, 
  MarketTicker, 
  Order, 
  Position,
  ExchangeConfig,
  ExchangeId,
  AssetType,
  Trade
} from './types';

interface AssetDescriptor {
  symbol: string;
  name: string;
  type: AssetType;
}

const INITIAL_ASSETS: AssetDescriptor[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO' },
  { symbol: 'SOL', name: 'Solana', type: 'CRYPTO' },
  { symbol: 'BNB', name: 'Binance', type: 'CRYPTO' },
  { symbol: 'XRP', name: 'Ripple', type: 'CRYPTO' },
];

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  details?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const App: React.FC = () => {
  const [activePair, setActivePair] = useState('BTC');
  const [timeframe, setTimeframe] = useState('1m');
  const [searchQuery, setSearchQuery] = useState('');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [viewMode, setViewMode] = useState<'dual' | 'custom' | 'tradingview'>('dual');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [assets, setAssets] = useState<AssetDescriptor[]>(INITIAL_ASSETS);
  const [ticker, setTicker] = useState<MarketTicker>({
    pair: 'BTC/USDT',
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0
  });

  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [walletBalance, setWalletBalance] = useState<string>('0.00');
  const [connStatus, setConnStatus] = useState<'ONLINE' | 'OFFLINE' | 'CORS_ERROR'>('OFFLINE');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, { price: number; change: number }>>({});
  
  const [activeExchangeId, setActiveExchangeId] = useState<ExchangeId>('binance');
  
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>([
    { id: 'binance', apiKey: '', apiSecret: '', connected: false, isTestnet: false },
    { id: 'bybit', apiKey: '', apiSecret: '', connected: false, isTestnet: false },
    { id: 'okx', apiKey: '', apiSecret: '', connected: false, isTestnet: false },
    { id: 'hyperliquid', apiKey: '', apiSecret: '', connected: false, isTestnet: false },
    { id: 'bingx', apiKey: '', apiSecret: '', connected: false, isTestnet: false },
    { id: 'coinbase', apiKey: '', apiSecret: '', connected: false, isTestnet: false },
    { id: 'coindcx', apiKey: '', apiSecret: '', connected: false, isTestnet: false },
    { id: 'coinswitch', apiKey: '', apiSecret: '', connected: false, isTestnet: false }
  ]);
  const [activeModal, setActiveModal] = useState<ExchangeId | null>(null);
  const [sharePosition, setSharePosition] = useState<Position | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const marketWsRef = useRef<WebSocket | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info', details?: string, action?: { label: string, onClick: () => void }) => {
    const id = Date.now();
    setToasts(prev => [{ id, message, type, details, action }, ...prev].slice(0, 5));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 12000);
  };

  const syncExchangeData = async () => {
    const exchange = exchanges.find(ex => ex.id === activeExchangeId);
    if (!exchange || !exchange.connected) {
      setConnStatus('OFFLINE');
      setWalletBalance('0.00');
      setPositions([]);
      setOrders([]);
      return;
    }
    
    try {
      let balanceRes: any;
      let posRes: Position[] = [];
      let ordRes: Order[] = [];

      if (activeExchangeId === 'binance') {
        balanceRes = await binanceApi.getBalance(exchange);
        posRes = await binanceApi.getPositions(exchange);
        ordRes = await binanceApi.getOrders(exchange);
      } else if (activeExchangeId === 'bybit') {
        balanceRes = await bybitApi.getBalance(exchange);
        posRes = await bybitApi.getPositions(exchange);
        ordRes = await bybitApi.getOrders(exchange);
      } else if (activeExchangeId === 'coindcx') {
        balanceRes = await coindcxApi.getBalance(exchange);
        posRes = await coindcxApi.getPositions(exchange);
        ordRes = await coindcxApi.getOrders(exchange);
      } else if (activeExchangeId === 'okx') {
        balanceRes = await okxApi.getBalance(exchange);
        posRes = await okxApi.getPositions(exchange);
        ordRes = await okxApi.getOrders(exchange);
      } else if (activeExchangeId === 'hyperliquid') balanceRes = await hyperliquidApi.getBalance(exchange);
      else if (activeExchangeId === 'bingx') balanceRes = await bingxApi.getBalance(exchange);
      else if (activeExchangeId === 'coinbase') balanceRes = await coinbaseApi.getBalance(exchange);
      else if (activeExchangeId === 'coinswitch') balanceRes = await coinswitchApi.getBalance(exchange);
      
      if (balanceRes?.error || !balanceRes) {
        const msg = balanceRes?.msg || "UNKNOWN_ERROR";
        if (msg === 'CORS_BLOCKED' || msg === 'GATEWAY_RESPONSE_NOT_JSON') {
          setConnStatus('CORS_ERROR');
          addToast("Gateway Error", "error", `Node blocked. Ensure CORS proxy is active and configured.`);
        } else if (msg === 'PROXY_OPT_IN_REQUIRED') {
          setConnStatus('CORS_ERROR');
          addToast(
            "Proxy Activation Needed", 
            "error", 
            "Your proxy node needs a manual handshake.",
            { 
              label: "ACTIVATE Handshake", 
              onClick: () => window.open(exchange.proxyUrl?.replace(/\/$/, '') + '/corsdemo', '_blank')
            }
          );
        } else {
          setConnStatus('OFFLINE');
          addToast("API Reject", "error", `${activeExchangeId.toUpperCase()}: ${msg}`);
        }
        return;
      }
      
      if (balanceRes && balanceRes.balance) {
        setWalletBalance(parseFloat(balanceRes.balance).toFixed(2));
        setPositions(posRes);
        setOrders(ordRes);
        setConnStatus('ONLINE');
      }
    } catch (err: any) { 
      console.error("Sync error", err);
      if (err.message === 'PROXY_OPT_IN_REQUIRED') {
          setConnStatus('CORS_ERROR');
          addToast("Action Required", "error", "Open the Proxy URL and click 'Opt-in' to enable access.");
      } else {
          setConnStatus('OFFLINE');
      }
    }
  };

  useEffect(() => {
    syncExchangeData();
    const timer = setInterval(syncExchangeData, 10000);
    return () => clearInterval(timer);
  }, [exchanges, activeExchangeId]);

  useEffect(() => {
    if (marketWsRef.current) marketWsRef.current.close();
    marketWsRef.current = new WebSocket('wss://fstream.binance.com/ws/!miniTicker@arr');
    marketWsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (Array.isArray(data)) {
        const updates: Record<string, { price: number; change: number }> = {};
        data.forEach((item: any) => {
          if (item.s.endsWith('USDT')) {
            const symbol = item.s.replace('USDT', '');
            updates[symbol] = { price: parseFloat(item.c), change: (parseFloat(item.c) - parseFloat(item.o)) / parseFloat(item.o) * 100 };
          }
        });
        setPriceMap(prev => ({ ...prev, ...updates }));
      }
    };
    return () => marketWsRef.current?.close();
  }, []);

  useEffect(() => {
    const fetchAllPerps = async () => {
      try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const data = await response.json();
        const perps = data.symbols
          .filter((s: any) => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT' && s.status === 'TRADING')
          .map((s: any) => ({ symbol: s.baseAsset, name: s.baseAsset, type: 'CRYPTO' as AssetType }));
        setAssets(prev => Array.from(new Map([...prev, ...perps].map(item => [item.symbol, item])).values()));
      } catch (error) { console.error("Asset list error", error); }
    };
    fetchAllPerps();
  }, []);

  useEffect(() => {
    const pairSymbol = activePair.toLowerCase() + 'usdt';
    if (wsRef.current) wsRef.current.close();
    wsRef.current = new WebSocket(`wss://fstream.binance.com/stream?streams=${pairSymbol}@ticker/${pairSymbol}@depth20@100ms/${pairSymbol}@aggTrade`);
    wsRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const stream = msg.stream;
      const d = msg.data;
      if (stream.endsWith('@ticker')) setTicker({ pair: activePair + '/USDT', lastPrice: parseFloat(d.c), change24h: parseFloat(d.P), high24h: parseFloat(d.h), low24h: parseFloat(d.l), volume24h: parseFloat(d.v) });
      if (stream.endsWith('@depth20@100ms')) {
        let bT = 0, aT = 0;
        setBids(d.b.map((b: any) => ({ price: parseFloat(b[0]), amount: parseFloat(b[1]), total: bT += parseFloat(b[1]) })));
        setAsks(d.a.map((a: any) => ({ price: parseFloat(a[0]), amount: parseFloat(a[1]), total: aT += parseFloat(a[1]) })));
      }
      if (stream.endsWith('@aggTrade')) {
        const newTrade: Trade = { id: d.a, price: parseFloat(d.p), amount: parseFloat(d.q), time: d.T, side: d.m ? OrderSide.SELL : OrderSide.BUY };
        setTrades(prev => [newTrade, ...prev].slice(0, 50));
      }
    };
    return () => wsRef.current?.close();
  }, [activePair]);

  useEffect(() => {
    fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${activePair}USDT&interval=${timeframe}&limit=200`)
      .then(r => r.json())
      .then(data => setCandles(data.map((d: any) => ({ time: new Date(d[0]).toISOString(), open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]), volume: parseFloat(d[5]) }))));
  }, [activePair, timeframe]);

  const handlePlaceOrder = async (side: OrderSide, type: OrderType, price: number, amount: number, leverage: number, exchangeId: ExchangeId, tp?: string, sl?: string) => {
    const exchange = exchanges.find(ex => ex.id === exchangeId);
    if (!exchange?.connected) {
      addToast("Exchange Not Linked", "error", "Please connect an API first.");
      return;
    }
    
    addToast(`Transmitting Order...`, "info", `Linking ${exchangeId.toUpperCase()} Gateway`);

    try {
      let apiResponse: any;
      const params = { symbol: activePair, side, type, qty: amount, price, leverage, takeProfit: tp, stopLoss: sl };

      if (exchangeId === 'binance') apiResponse = await binanceApi.placeOrder(exchange, params);
      else if (exchangeId === 'bybit') apiResponse = await bybitApi.placeOrder(exchange, params);
      else if (exchangeId === 'coindcx') apiResponse = await coindcxApi.placeOrder(exchange, params);
      else if (exchangeId === 'okx') apiResponse = await okxApi.placeOrder(exchange, params);
      else if (exchangeId === 'hyperliquid') apiResponse = await hyperliquidApi.placeOrder(exchange, params);
      else if (exchangeId === 'bingx') apiResponse = await bingxApi.placeOrder(exchange, params);
      else if (exchangeId === 'coinbase') apiResponse = await coinbaseApi.placeOrder(exchange, params);
      else if (exchangeId === 'coinswitch') apiResponse = await coinswitchApi.placeOrder(exchange, params);

      if (apiResponse?.error || apiResponse?.status === 'error' || (apiResponse?.retCode && apiResponse?.retCode !== 0)) {
        addToast(`Order Rejected`, "error", apiResponse?.msg || apiResponse?.message || "Gateway Error");
      } else {
        addToast(`Order Accepted`, "success", `${exchangeId.toUpperCase()}: ${side} ${amount} ${activePair} @ ${price}`);
        setTimeout(syncExchangeData, 1500);
      }
    } catch (e: any) { 
      addToast(`Terminal Failure`, "error", e.message || "Network error. Verify API and Proxy."); 
    }
  };

  const handleUpdateTPSL = async (id: string, isOrder: boolean, type: 'TP' | 'SL', price: number) => {
    const priceStr = price.toFixed(2);
    const target = isOrder ? orders.find(o => o.id === id) : positions.find(p => p.symbol === id);
    if (!target) return;

    const exchangeConfig = exchanges.find(ex => ex.id === target.exchangeId);
    if (!exchangeConfig || !exchangeConfig.connected) return;

    try {
      if (exchangeConfig.id === 'bybit') await bybitApi.setTPSL(exchangeConfig, target.symbol, type, price);
      else if (exchangeConfig.id === 'binance') await binanceApi.setTPSL(exchangeConfig, target.symbol, type, price);
      
      addToast("Syncing Target", "info", `Setting ${type} to ${priceStr}`);
      setTimeout(syncExchangeData, 1500);
    } catch (e) { console.error("TPSL sync error", e); }
  };

  const handleCancelOrder = (id: string) => {
    addToast("Cancel Requested", "info", `Relaying to ${activeExchangeId.toUpperCase()}`);
    setOrders(prev => prev.filter(o => o.id !== id));
  };
  
  const totalUnrealizedPnl = positions.reduce((s, p) => s + parseFloat(p.unrealisedPnl || '0'), 0);
  const filteredAssets = useMemo(() => assets.filter(a => a.symbol.toLowerCase().includes(searchQuery.toLowerCase())), [assets, searchQuery]);

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-[#eaecef] overflow-hidden select-none">
      <div className="fixed top-14 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`w-80 p-4 border rounded shadow-2xl backdrop-blur-md transition-all pointer-events-auto ${t.type === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : t.type === 'error' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800/90 border-slate-700 text-white'}`}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest">{t.type}</span>
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="text-[12px] font-bold">{t.message}</div>
            {t.details && <div className="text-[9px] opacity-60 mt-1 uppercase mono">{t.details}</div>}
            {t.action && (
              <button 
                onClick={t.action.onClick}
                className="mt-3 w-full py-1.5 bg-[#facc15] text-black text-[10px] font-black rounded uppercase hover:bg-white transition-colors"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {activeModal && (
        <ApiConnectionModal 
          exchange={exchanges.find(ex => ex.id === activeModal)!}
          onClose={() => setActiveModal(null)}
          onConnect={async (id, k, s, p_url, is_test, passphrase) => {
            if (id === 'bybit') await bybitApi.syncTime(!!is_test, p_url);
            if (id === 'binance') await binanceApi.syncTime(!!is_test, p_url);
            
            setExchanges(prev => prev.map(ex => ex.id === id ? { 
              ...ex, apiKey: k, apiSecret: s, proxyUrl: p_url, isTestnet: !!is_test, connected: true, passphrase 
            } : ex));
            
            setActiveExchangeId(id as ExchangeId);
            setActiveModal(null);
            addToast(`${id.toUpperCase()} Linked`, "success", `Terminal node active.`);
          }}
        />
      )}

      {sharePosition && (
        <SharePnLModal position={sharePosition} onClose={() => setSharePosition(null)} />
      )}

      <header className="h-14 terminal-header border-b border-[#1e293b] flex items-center px-4 shrink-0 z-[60] bg-[#0d1117] relative shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#facc15] rounded flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.3)]">
               <span className="text-black font-black text-xl italic">N</span>
            </div>
            <div className="text-white font-black text-sm mono tracking-tighter leading-tight">NEXUS<br/><span className="text-[#facc15]">CORE</span></div>
          </div>
          <div className="h-10 w-px bg-[#1e293b]"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
               <span className="text-lg font-black text-white mono uppercase">{activePair}USDT</span>
               <span className={`text-sm font-bold mono ${ticker.change24h >= 0 ? 'text-[#00ffaa]' : 'text-rose-500'}`}>
                 {ticker.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
               </span>
            </div>
            <div className="flex gap-4 text-[10px] font-bold text-slate-500 mono">
               <span>24H <span className={ticker.change24h >= 0 ? 'text-[#00ffaa]' : 'text-rose-500'}>{ticker.change24h > 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%</span></span>
               <span>VOL <span className="text-slate-300">{(ticker.volume24h / 1000000).toFixed(1)}M</span></span>
            </div>
          </div>
        </div>

        <div className="flex-1 px-8 flex gap-4 justify-center items-center overflow-hidden">
            <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full items-center">
               {exchanges.map(ex => {
                 const isActive = activeExchangeId === ex.id;
                 return (
                  <button 
                   key={ex.id} 
                   onClick={() => {
                     if (!ex.connected) setActiveModal(ex.id);
                     else setActiveExchangeId(ex.id);
                   }}
                   className={`flex flex-col items-center px-3 py-1 border transition-all rounded-sm min-w-[70px] ${ex.connected ? (isActive ? 'border-[#facc15] bg-[#facc15]/10' : 'border-[#1e293b]/50 bg-white/5') : 'border-[#1e293b] hover:bg-white/5 opacity-40'}`}
                  >
                     <span className={`text-[7px] font-black uppercase tracking-widest ${ex.connected ? (isActive ? 'text-[#facc15]' : 'text-slate-400') : 'text-slate-500'}`}>{ex.id}</span>
                     <span className={`text-[9px] font-black mono ${ex.connected ? (isActive ? 'text-white' : 'text-slate-500') : 'text-slate-700'}`}>
                       {ex.connected ? (isActive ? 'ACTIVE' : 'LINKED') : 'OFFLINE'}
                     </span>
                  </button>
                 );
               })}
            </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsAiOpen(!isAiOpen)} className={`p-2 rounded border transition-all ${isAiOpen ? 'bg-[#facc15] text-black border-[#facc15]' : 'bg-transparent text-[#facc15] border-[#facc15]/30 hover:border-[#facc15]'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-56 bg-[#0a0a0a] border-r border-[#1e293b] flex flex-col shrink-0">
           <div className="h-10 px-3 flex items-center justify-between border-b border-[#1e293b] bg-[#111111]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Watchlist</span>
              <input type="text" placeholder="FIND..." className="w-24 bg-transparent border-none text-[10px] text-right font-bold focus:ring-0 placeholder:text-slate-700" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredAssets.map(a => {
                const liveData = priceMap[a.symbol];
                const isCurrent = activePair === a.symbol;
                return (
                  <div key={a.symbol} onClick={() => setActivePair(a.symbol)} className={`px-3 py-3 border-b border-[#1e293b]/30 cursor-pointer flex justify-between items-center transition-all hover:bg-[#111111] group ${isCurrent ? 'bg-[#facc15]/5 border-l-2 border-l-[#facc15]' : ''}`}>
                     <div className="flex flex-col">
                        <span className={`text-[11px] font-black mono ${isCurrent ? 'text-white' : 'text-slate-400'}`}>{a.symbol}</span>
                        <span className="text-[8px] text-slate-600 font-black">PERPETUAL</span>
                     </div>
                     <div className="text-right">
                        <div className={`text-[10px] font-black transition-all duration-300 ${liveData ? 'text-slate-300' : 'text-slate-700'}`}>
                          {liveData ? liveData.price.toLocaleString(undefined, { minimumFractionDigits: 1 }) : '--'}
                        </div>
                        <div className={`text-[8px] font-bold ${liveData?.change >= 0 ? 'text-[#00ffaa]' : 'text-[#ff3344]'}`}>
                          {liveData ? (liveData.change >= 0 ? '+' : '') + liveData.change.toFixed(2) + '%' : '--'}
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
          <AccountSummaryCard balance={walletBalance} totalUnrealizedPnl={totalUnrealizedPnl} status={connStatus} />
          
          <div className="h-10 border-b border-[#1e293b] bg-[#0a0a0a] flex items-center px-4 justify-between shrink-0">
             <div className="flex gap-1">
                {TIMEFRAMES.map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-2 py-1 text-[10px] font-black rounded uppercase transition-colors ${timeframe === tf ? 'text-[#facc15] bg-[#facc15]/10' : 'text-slate-500 hover:text-white'}`}>
                    {tf}
                  </button>
                ))}
             </div>
             <div className="flex gap-2">
                <button onClick={() => setViewMode('dual')} className={`px-2 py-0.5 text-[9px] font-black border rounded transition-all ${viewMode === 'dual' ? 'border-[#facc15] text-[#facc15]' : 'border-slate-800 text-slate-600'}`}>SPLIT</button>
                <button onClick={() => setViewMode('custom')} className={`px-2 py-0.5 text-[9px] font-black border rounded transition-all ${viewMode === 'custom' ? 'border-[#facc15] text-[#facc15]' : 'border-slate-800 text-slate-600'}`}>CORE</button>
                <button onClick={() => setViewMode('tradingview')} className={`px-2 py-0.5 text-[9px] font-black border rounded transition-all ${viewMode === 'tradingview' ? 'border-[#facc15] text-[#facc15]' : 'border-slate-800 text-slate-600'}`}>TV</button>
             </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <div className="flex h-full">
              <div className={`flex flex-col h-full ${viewMode === 'dual' ? 'w-1/2' : viewMode === 'custom' ? 'w-full' : 'hidden'} border-r border-[#1e293b]/50`}>
                <MarketChart data={candles} pair={activePair + '/USDT'} positions={positions} orders={orders} onUpdateTPSL={handleUpdateTPSL} />
              </div>
              <div className={`flex flex-col h-full ${viewMode === 'dual' ? 'w-1/2' : viewMode === 'tradingview' ? 'w-full' : 'hidden'}`}>
                <TradingViewChart symbol={activePair} />
              </div>
            </div>
            {isAiOpen && (
              <div className="absolute top-4 right-4 w-72 h-[400px] z-50 shadow-2xl animate-in slide-in-from-right duration-300">
                <AIAssistant ticker={ticker} bids={bids} asks={asks} />
              </div>
            )}
          </div>

          <div className="h-1/3 min-h-[250px] border-t border-[#1e293b] bg-[#0a0a0a]">
            <TerminalTabs 
              positions={positions} 
              orders={orders} 
              currentPrice={ticker.lastPrice} 
              balance={walletBalance} 
              onCancelOrder={handleCancelOrder} 
              onSharePnL={setSharePosition} 
            />
          </div>
        </div>

        <div className="w-80 bg-[#0d1117] border-l border-[#1e293b] flex flex-col shrink-0">
           <div className="h-1/3 border-b border-[#1e293b] overflow-hidden">
              <OrderBook bids={bids} asks={asks} />
           </div>
           <div className="h-1/4 overflow-hidden">
              <TradeFlow trades={trades} />
           </div>
           <div className="flex-1 overflow-hidden">
              <TradingPanel 
                onPlaceOrder={handlePlaceOrder} 
                currentPrice={ticker.lastPrice} 
                balance={walletBalance} 
                connected={exchanges.find(e => e.id === activeExchangeId)?.connected || false} 
                symbol={activePair} 
                exchangeId={activeExchangeId} 
              />
           </div>
        </div>
      </main>

      <BloombergTicker priceMap={priceMap} />

      <footer className="h-7 bg-[#0d1117] border-t border-[#1e293b] px-4 flex items-center justify-between text-[9px] font-black mono uppercase text-slate-600 shrink-0">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${connStatus === 'ONLINE' ? 'bg-[#00ffaa] pulse-emerald' : 'bg-rose-500'}`}></div> GATEWAY: {connStatus}</span>
          <span>STREAMS: !miniTicker@arr / @ticker / @depth / @aggTrade</span>
          <span className="text-[#00ffaa]">LATENCY: 12ms</span>
        </div>
        <div className="flex gap-4 items-center">
           <span>API VERSION: 6.2.0-CORE-MULTI</span>
           <span className="text-slate-400">© 2025 NEXUS CORE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
