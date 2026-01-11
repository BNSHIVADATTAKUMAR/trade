
import { OrderSide, OrderType, ExchangeConfig, Position, Order, ExchangeId } from "../types";

// Global offsets to handle clock drift between local and exchange servers
let binanceTimeOffset = 0;
let bybitTimeOffset = 0;

async function signMessage(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function signOkx(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

const secureFetch = async (url: string, options: any, proxyUrl?: string) => {
  const targetUrl = proxyUrl ? `${proxyUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;
  try {
    const response = await fetch(targetUrl, options);
    
    // Check if response is actually JSON. Proxy servers often return HTML when opt-in is required.
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
      const text = await response.text();
      if (text.toLowerCase().includes("cors anywhere") || text.toLowerCase().includes("/corsdemo")) {
        throw new Error("PROXY_OPT_IN_REQUIRED");
      }
      throw new Error("GATEWAY_RESPONSE_NOT_JSON");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP Error ${response.status}` }));
      throw new Error(errorData.message || "REQUEST_FAILED");
    }
    return response;
  } catch (e: any) {
    if (e.message === "PROXY_OPT_IN_REQUIRED" || e.message === "GATEWAY_RESPONSE_NOT_JSON") throw e;
    throw new Error('CORS_BLOCKED');
  }
};

export const binanceApi = {
  getBaseUrl(isTestnet: boolean) {
    return isTestnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
  },
  async syncTime(isTestnet: boolean, proxyUrl?: string) {
    try {
      const baseUrl = this.getBaseUrl(isTestnet);
      const res = await secureFetch(`${baseUrl}/fapi/v1/time`, { method: 'GET' }, proxyUrl);
      const data = await res.json();
      if (data.serverTime) binanceTimeOffset = data.serverTime - Date.now();
    } catch (e) { console.warn("[Binance] Time sync failed."); }
  },
  getAdjustedTime() { return Date.now() + binanceTimeOffset; },
  async getBalance(config: ExchangeConfig) {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const query = `timestamp=${timestamp}`;
    const signature = await signMessage(config.apiSecret, query);
    try {
      const res = await secureFetch(`${baseUrl}/fapi/v2/account?${query}&signature=${signature}`, {
        method: 'GET',
        headers: { 'X-MBX-APIKEY': config.apiKey }
      }, config.proxyUrl);
      const data = await res.json();
      if (data.assets) {
        const usdt = data.assets.find((a: any) => a.asset === 'USDT');
        return { balance: usdt ? usdt.walletBalance : '0.00' };
      }
      return { error: true, msg: "NO_USDT_ASSET" };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const query = `timestamp=${timestamp}`;
    const signature = await signMessage(config.apiSecret, query);
    try {
      const res = await secureFetch(`${baseUrl}/fapi/v2/positionRisk?${query}&signature=${signature}`, {
        method: 'GET', headers: { 'X-MBX-APIKEY': config.apiKey }
      }, config.proxyUrl);
      const data = await res.json();
      return data.filter((p: any) => parseFloat(p.positionAmt) !== 0).map((p: any) => ({
        symbol: p.symbol,
        side: parseFloat(p.positionAmt) > 0 ? 'Buy' : 'Sell',
        size: Math.abs(parseFloat(p.positionAmt)).toString(),
        avgPrice: p.entryPrice,
        markPrice: p.markPrice,
        liqPrice: p.liquidationPrice,
        unrealisedPnl: p.unRealizedProfit,
        curRealisedPnl: '0.00',
        leverage: p.leverage,
        exchangeId: 'binance',
        assetType: 'CRYPTO',
        orderType: OrderType.MARKET
      }));
    } catch (e) { return []; }
  },
  async getOrders(config: ExchangeConfig): Promise<Order[]> {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const query = `timestamp=${timestamp}`;
    const signature = await signMessage(config.apiSecret, query);
    try {
      const res = await secureFetch(`${baseUrl}/fapi/v1/openOrders?${query}&signature=${signature}`, {
        method: 'GET', headers: { 'X-MBX-APIKEY': config.apiKey }
      }, config.proxyUrl);
      const data = await res.json();
      return data.map((o: any) => ({
        id: o.orderId.toString(),
        pair: o.symbol,
        side: o.side === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        type: o.type === 'LIMIT' ? OrderType.LIMIT : OrderType.MARKET,
        price: parseFloat(o.price),
        amount: parseFloat(o.origQty),
        filledAmount: parseFloat(o.executedQty),
        status: 'OPEN',
        timestamp: o.time,
        leverage: 1,
        exchangeId: 'binance',
        assetType: 'CRYPTO'
      }));
    } catch (e) { return []; }
  },
  async placeOrder(config: ExchangeConfig, params: any) {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const query = `symbol=${params.symbol}USDT&side=${params.side}&type=${params.type}&quantity=${params.qty}&timestamp=${timestamp}${params.type === OrderType.LIMIT ? `&price=${params.price}&timeInForce=GTC` : ''}`;
    const signature = await signMessage(config.apiSecret, query);
    try {
      const res = await secureFetch(`${baseUrl}/fapi/v1/order?${query}&signature=${signature}`, {
        method: 'POST', headers: { 'X-MBX-APIKEY': config.apiKey }
      }, config.proxyUrl);
      return await res.json();
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async setTPSL(config: ExchangeConfig, symbol: string, type: 'TP' | 'SL', price: number) {
    return { status: 'success', symbol, type, price };
  }
};

export const bybitApi = {
  getBaseUrl(isTestnet: boolean) {
    return isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  },
  async syncTime(isTestnet: boolean, proxyUrl?: string) {
    try {
      const baseUrl = this.getBaseUrl(isTestnet);
      const res = await secureFetch(`${baseUrl}/v5/market/time`, { method: 'GET' }, proxyUrl);
      const data = await res.json();
      if (data.result?.timeNano) bybitTimeOffset = Math.floor(parseInt(data.result.timeNano) / 1000000) - Date.now();
    } catch (e) { console.warn("[Bybit] Time sync failed."); }
  },
  getAdjustedTime() { return (Date.now() + bybitTimeOffset).toString(); },
  async getBalance(config: ExchangeConfig) {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const query = `accountType=UNIFIED&coin=USDT`;
    const sign = await signMessage(config.apiSecret, timestamp + config.apiKey + '20000' + query);
    try {
      const response = await secureFetch(`${baseUrl}/v5/account/wallet-balance?${query}`, {
        method: 'GET',
        headers: { 'X-BAPI-API-KEY': config.apiKey, 'X-BAPI-SIGN': sign, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': '20000' }
      }, config.proxyUrl);
      const data = await response.json();
      if (data.retCode === 0) return { balance: data.result?.list?.[0]?.totalWalletBalance || '0.00' };
      return { error: true, msg: data.retMsg };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const query = `category=linear&settleCoin=USDT`;
    const sign = await signMessage(config.apiSecret, timestamp + config.apiKey + '20000' + query);
    try {
      const res = await secureFetch(`${baseUrl}/v5/position/list?${query}`, {
        method: 'GET', headers: { 'X-BAPI-API-KEY': config.apiKey, 'X-BAPI-SIGN': sign, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': '20000' }
      }, config.proxyUrl);
      const data = await res.json();
      if (data.retCode !== 0) return [];
      return data.result.list.map((p: any) => ({
        symbol: p.symbol,
        side: p.side === 'Buy' ? 'Buy' : 'Sell',
        size: p.size,
        avgPrice: p.avgPrice,
        markPrice: p.markPrice,
        liqPrice: p.liqPrice,
        unrealisedPnl: p.unrealisedPnl,
        curRealisedPnl: p.cumRealisedPnl,
        leverage: p.leverage,
        exchangeId: 'bybit',
        assetType: 'CRYPTO',
        orderType: OrderType.MARKET
      }));
    } catch (e) { return []; }
  },
  async getOrders(config: ExchangeConfig): Promise<Order[]> {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const query = `category=linear&settleCoin=USDT`;
    const sign = await signMessage(config.apiSecret, timestamp + config.apiKey + '20000' + query);
    try {
      const res = await secureFetch(`${baseUrl}/v5/order/realtime?${query}`, {
        method: 'GET', headers: { 'X-BAPI-API-KEY': config.apiKey, 'X-BAPI-SIGN': sign, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': '20000' }
      }, config.proxyUrl);
      const data = await res.json();
      if (data.retCode !== 0) return [];
      return data.result.list.map((o: any) => ({
        id: o.orderId,
        pair: o.symbol,
        side: o.side === 'Buy' ? OrderSide.BUY : OrderSide.SELL,
        type: o.orderType === 'Limit' ? OrderType.LIMIT : OrderType.MARKET,
        price: parseFloat(o.price),
        amount: parseFloat(o.qty),
        filledAmount: parseFloat(o.cumExecQty),
        status: 'OPEN',
        timestamp: parseInt(o.createdTime),
        leverage: 1,
        exchangeId: 'bybit',
        assetType: 'CRYPTO'
      }));
    } catch (e) { return []; }
  },
  async placeOrder(config: ExchangeConfig, params: any) {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const body = { category: 'linear', symbol: params.symbol + 'USDT', side: params.side === OrderSide.BUY ? 'Buy' : 'Sell', orderType: params.type === OrderType.MARKET ? 'Market' : 'Limit', qty: params.qty.toString(), timeInForce: 'GTC' };
    const payload = JSON.stringify(body);
    const sign = await signMessage(config.apiSecret, timestamp + config.apiKey + '20000' + payload);
    try {
      const response = await secureFetch(`${baseUrl}/v5/order/create`, {
        method: 'POST',
        headers: { 'X-BAPI-API-KEY': config.apiKey, 'X-BAPI-SIGN': sign, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': '20000', 'Content-Type': 'application/json' },
        body: payload
      }, config.proxyUrl);
      return await response.json();
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async setTPSL(config: ExchangeConfig, symbol: string, type: 'TP' | 'SL', price: number) {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const timestamp = this.getAdjustedTime();
    const body: any = { category: 'linear', symbol: symbol + 'USDT', tpslMode: 'Full', tpOrderType: 'Market', slOrderType: 'Market' };
    if (type === 'TP') body.takeProfit = price.toString(); else body.stopLoss = price.toString();
    const payload = JSON.stringify(body);
    const sign = await signMessage(config.apiSecret, timestamp + config.apiKey + '20000' + payload);
    try {
      const res = await secureFetch(`${baseUrl}/v5/position/set-tpsl`, {
        method: 'POST', headers: { 'X-BAPI-API-KEY': config.apiKey, 'X-BAPI-SIGN': sign, 'X-BAPI-TIMESTAMP': timestamp, 'X-BAPI-RECV-WINDOW': '20000', 'Content-Type': 'application/json' },
        body: payload
      }, config.proxyUrl);
      return await res.json();
    } catch (e) { return { error: true }; }
  }
};

export const coindcxApi = {
  baseUrl: 'https://api.coindcx.com',
  async getBalance(config: ExchangeConfig) {
    const endpoint = '/exchange/v1/users/balances';
    const timestamp = Date.now();
    const payload = JSON.stringify({ timestamp });
    const signature = await signMessage(config.apiSecret, payload);
    try {
      const res = await secureFetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST', headers: { 
          'X-AUTH-API-KEY': config.apiKey, 
          'X-AUTH-SIGNATURE': signature, 
          'X-AUTH-TIMESTAMP': timestamp.toString(), 
          'Content-Type': 'application/json' 
        },
        body: payload
      }, config.proxyUrl);
      const data = await res.json();
      if (Array.isArray(data)) {
        const usdtPerp = data.find((b: any) => b.currency === 'USDT_PERP');
        const usdt = data.find((b: any) => b.currency === 'USDT');
        return { balance: (usdtPerp || usdt)?.balance || '0.00' };
      }
      return { error: true, msg: data.message || "UNABLE_TO_FETCH_BALANCE" };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> {
    const endpoint = '/p_v1/positions';
    const timestamp = Date.now();
    const payload = JSON.stringify({ timestamp });
    const signature = await signMessage(config.apiSecret, payload);
    try {
      const res = await secureFetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST', headers: { 
          'X-AUTH-API-KEY': config.apiKey, 
          'X-AUTH-SIGNATURE': signature, 
          'X-AUTH-TIMESTAMP': timestamp.toString(), 
          'Content-Type': 'application/json' 
        },
        body: payload
      }, config.proxyUrl);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((p: any) => ({
        symbol: p.symbol,
        side: p.side === 'buy' ? 'Buy' : 'Sell',
        size: p.quantity.toString(),
        avgPrice: p.entry_price.toString(),
        markPrice: (p.mark_price || p.entry_price).toString(),
        liqPrice: (p.liquidation_price || '0').toString(),
        unrealisedPnl: (p.unrealized_pnl || '0').toString(),
        curRealisedPnl: '0.00',
        leverage: p.leverage.toString(),
        exchangeId: 'coindcx',
        assetType: 'CRYPTO',
        orderType: OrderType.MARKET
      }));
    } catch (e) { return []; }
  },
  async getOrders(config: ExchangeConfig): Promise<Order[]> {
    const endpoint = '/p_v1/orders/active_orders';
    const timestamp = Date.now();
    const payload = JSON.stringify({ timestamp });
    const signature = await signMessage(config.apiSecret, payload);
    try {
      const res = await secureFetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST', headers: { 
          'X-AUTH-API-KEY': config.apiKey, 
          'X-AUTH-SIGNATURE': signature, 
          'X-AUTH-TIMESTAMP': timestamp.toString(), 
          'Content-Type': 'application/json' 
        },
        body: payload
      }, config.proxyUrl);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((o: any) => ({
        id: o.order_id,
        pair: o.symbol,
        side: o.side === 'buy' ? OrderSide.BUY : OrderSide.SELL,
        type: o.order_type === 'limit_order' ? OrderType.LIMIT : OrderType.MARKET,
        price: parseFloat(o.price),
        amount: parseFloat(o.quantity),
        filledAmount: 0,
        status: 'OPEN',
        timestamp: o.created_at,
        leverage: o.leverage || 1,
        exchangeId: 'coindcx',
        assetType: 'CRYPTO'
      }));
    } catch (e) { return []; }
  },
  async placeOrder(config: ExchangeConfig, params: any) {
    const endpoint = '/p_v1/orders/create';
    const timestamp = Date.now();
    const body = { 
      side: params.side.toLowerCase(), 
      order_type: params.type === OrderType.MARKET ? 'market_order' : 'limit_order', 
      symbol: params.symbol + 'USDT', 
      price: params.type === OrderType.LIMIT ? params.price : 0, 
      quantity: params.qty, 
      timestamp: timestamp, 
      leverage: params.leverage, 
      client_order_id: `NX-${Date.now()}` 
    };
    const payload = JSON.stringify(body);
    const signature = await signMessage(config.apiSecret, payload);
    try {
      const response = await secureFetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST', headers: { 
          'X-AUTH-API-KEY': config.apiKey, 
          'X-AUTH-SIGNATURE': signature, 
          'X-AUTH-TIMESTAMP': timestamp.toString(), 
          'Content-Type': 'application/json' 
        },
        body: payload
      }, config.proxyUrl);
      return await response.json();
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async setLeverage(config: ExchangeConfig, symbol: string, leverage: number) { return { status: 'success', leverage }; }
};

export const okxApi = {
  getBaseUrl(isTestnet: boolean) { return 'https://www.okx.com'; },
  async getBalance(config: ExchangeConfig) {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const endpoint = '/api/v5/account/balance?ccy=USDT';
    const timestamp = new Date().toISOString();
    const sign = await signOkx(config.apiSecret, timestamp + 'GET' + endpoint);
    try {
      const res = await secureFetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: { 
          'OK-ACCESS-KEY': config.apiKey, 
          'OK-ACCESS-SIGN': sign, 
          'OK-ACCESS-TIMESTAMP': timestamp, 
          'OK-ACCESS-PASSPHRASE': config.passphrase || '', 
          'Content-Type': 'application/json' 
        }
      }, config.proxyUrl);
      const data = await res.json();
      if (data.code === "0") return { balance: data.data?.[0]?.totalEq || '0.00' };
      return { error: true, msg: data.msg };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const endpoint = '/api/v5/account/positions';
    const timestamp = new Date().toISOString();
    const sign = await signOkx(config.apiSecret, timestamp + 'GET' + endpoint);
    try {
      const res = await secureFetch(`${baseUrl}${endpoint}`, {
        method: 'GET', headers: { 
          'OK-ACCESS-KEY': config.apiKey, 
          'OK-ACCESS-SIGN': sign, 
          'OK-ACCESS-TIMESTAMP': timestamp, 
          'OK-ACCESS-PASSPHRASE': config.passphrase || '' 
        }
      }, config.proxyUrl);
      const data = await res.json();
      if (data.code !== "0") return [];
      return data.data.map((p: any) => ({
        symbol: p.instId,
        side: p.posSide === 'long' ? 'Buy' : 'Sell',
        size: p.pos,
        avgPrice: p.avgPx,
        markPrice: p.markPx,
        liqPrice: p.liqPx,
        unrealisedPnl: p.upl,
        curRealisedPnl: '0.00',
        leverage: p.lever,
        exchangeId: 'okx',
        assetType: 'CRYPTO',
        orderType: OrderType.MARKET
      }));
    } catch (e) { return []; }
  },
  async getOrders(config: ExchangeConfig): Promise<Order[]> {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const endpoint = '/api/v5/trade/orders-pending';
    const timestamp = new Date().toISOString();
    const sign = await signOkx(config.apiSecret, timestamp + 'GET' + endpoint);
    try {
      const res = await secureFetch(`${baseUrl}${endpoint}`, {
        method: 'GET', headers: { 
          'OK-ACCESS-KEY': config.apiKey, 
          'OK-ACCESS-SIGN': sign, 
          'OK-ACCESS-TIMESTAMP': timestamp, 
          'OK-ACCESS-PASSPHRASE': config.passphrase || '' 
        }
      }, config.proxyUrl);
      const data = await res.json();
      if (data.code !== "0") return [];
      return data.data.map((o: any) => ({
        id: o.ordId,
        pair: o.instId,
        side: o.side === 'buy' ? OrderSide.BUY : OrderSide.SELL,
        type: o.ordType === 'limit' ? OrderType.LIMIT : OrderType.MARKET,
        price: parseFloat(o.px || '0'),
        amount: parseFloat(o.sz),
        filledAmount: parseFloat(o.accFillSz || '0'),
        status: 'OPEN',
        timestamp: parseInt(o.cTime),
        leverage: 1,
        exchangeId: 'okx',
        assetType: 'CRYPTO'
      }));
    } catch (e) { return []; }
  },
  async placeOrder(config: ExchangeConfig, params: any) {
    const baseUrl = this.getBaseUrl(config.isTestnet);
    const endpoint = '/api/v5/trade/order';
    const timestamp = new Date().toISOString();
    const body = { instId: params.symbol + '-USDT-SWAP', tdMode: 'cross', side: params.side.toLowerCase(), ordType: params.type.toLowerCase(), sz: params.qty.toString(), px: params.type === OrderType.LIMIT ? params.price.toString() : undefined };
    const payload = JSON.stringify(body);
    const sign = await signOkx(config.apiSecret, timestamp + 'POST' + endpoint + payload);
    try {
      const res = await secureFetch(`${baseUrl}${endpoint}`, {
        method: 'POST', headers: { 
          'OK-ACCESS-KEY': config.apiKey, 
          'OK-ACCESS-SIGN': sign, 
          'OK-ACCESS-TIMESTAMP': timestamp, 
          'OK-ACCESS-PASSPHRASE': config.passphrase || '', 
          'Content-Type': 'application/json' 
        },
        body: payload
      }, config.proxyUrl);
      return await res.json();
    } catch (e: any) { return { error: true, msg: e.message }; }
  }
};

export const hyperliquidApi = {
  baseUrl: 'https://api.hyperliquid.xyz/exchange',
  async getBalance(config: ExchangeConfig) {
    const body = { type: 'clearinghouseState', user: config.apiKey };
    try {
      const res = await secureFetch(this.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, config.proxyUrl);
      const data = await res.json();
      return { balance: data?.marginSummary?.accountValue || '0.00' };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> { return []; },
  async getOrders(config: ExchangeConfig): Promise<Order[]> { return []; },
  async placeOrder(config: ExchangeConfig, params: any) { return { status: 'simulated' }; }
};

export const bingxApi = {
  baseUrl: 'https://open-api.bingx.com',
  async getBalance(config: ExchangeConfig) {
    const endpoint = '/openApi/swap/v2/user/balance';
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = await signMessage(config.apiSecret, query);
    try {
      const res = await secureFetch(`${this.baseUrl}${endpoint}?${query}&signature=${signature}`, { method: 'GET', headers: { 'X-BX-APIKEY': config.apiKey } }, config.proxyUrl);
      const data = await res.json();
      if (data.code === 0) return { balance: data.data?.balance?.balance || '0.00' };
      return { error: true, msg: data.msg };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> { return []; },
  async getOrders(config: ExchangeConfig): Promise<Order[]> { return []; },
  async placeOrder(config: ExchangeConfig, params: any) {
    const endpoint = '/openApi/swap/v2/trade/order';
    const timestamp = Date.now();
    const query = `symbol=${params.symbol}-USDT&side=${params.side}&type=${params.type}&quantity=${params.qty}&timestamp=${timestamp}`;
    const signature = await signMessage(config.apiSecret, query);
    try {
      const res = await secureFetch(`${this.baseUrl}${endpoint}?${query}&signature=${signature}`, { method: 'POST', headers: { 'X-BX-APIKEY': config.apiKey } }, config.proxyUrl);
      return await res.json();
    } catch (e: any) { return { error: true, msg: e.message }; }
  }
};

export const coinbaseApi = {
  baseUrl: 'https://api.coinbase.com/api/v3/brokerage',
  async getBalance(config: ExchangeConfig) {
    const endpoint = '/accounts';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + 'GET' + endpoint;
    const signature = await signMessage(config.apiSecret, message);
    try {
      const res = await secureFetch(`${this.baseUrl}${endpoint}`, { method: 'GET', headers: { 'CB-ACCESS-KEY': config.apiKey, 'CB-ACCESS-SIGN': signature, 'CB-ACCESS-TIMESTAMP': timestamp } }, config.proxyUrl);
      const data = await res.json();
      const usdt = data.accounts?.find((a: any) => a.currency === 'USDT');
      return { balance: usdt?.available_balance?.value || '0.00' };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> { return []; },
  async getOrders(config: ExchangeConfig): Promise<Order[]> { return []; },
  async placeOrder(config: ExchangeConfig, params: any) { return { status: 'simulated' }; }
};

export const coinswitchApi = {
  baseUrl: 'https://api.coinswitch.co/pro/v1',
  async getBalance(config: ExchangeConfig) {
    try {
      const res = await secureFetch(`${this.baseUrl}/wallet/balances`, { method: 'GET', headers: { 'X-API-KEY': config.apiKey } }, config.proxyUrl);
      const data = await res.json();
      const usdt = data.data?.find((d: any) => d.coin === 'USDT');
      return { balance: usdt?.balance || '0.00' };
    } catch (e: any) { return { error: true, msg: e.message }; }
  },
  async getPositions(config: ExchangeConfig): Promise<Position[]> { return []; },
  async getOrders(config: ExchangeConfig): Promise<Order[]> { return []; },
  async placeOrder(config: ExchangeConfig, params: any) { return { status: 'simulated' }; }
};
