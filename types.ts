
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET'
}

export type AssetType = 'CRYPTO' | 'FOREX' | 'STOCKS' | 'COMMODITIES';

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface Trade {
  id: number;
  price: number;
  amount: number;
  time: number;
  side: OrderSide;
}

export interface Order {
  id: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  filledAmount: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'PARTIALLY_FILLED';
  timestamp: number;
  takeProfit?: string;
  stopLoss?: string;
  leverage: number;
  exchangeId: ExchangeId;
  assetType: AssetType;
}

export interface Position {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: string;
  avgPrice: string;
  liqPrice: string;
  unrealisedPnl: string;
  curRealisedPnl: string;
  leverage: string;
  markPrice: string;
  takeProfit?: string;
  stopLoss?: string;
  exchangeId: ExchangeId;
  assetType: AssetType;
  orderType: OrderType;
}

export interface MarketTicker {
  pair: string;
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fundingRate?: string;
  nextFundingTime?: string;
}

export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'hyperliquid' | 'bingx' | 'coinbase' | 'nexus' | 'coindcx' | 'coinswitch';

export interface ExchangeConfig {
  id: ExchangeId;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  proxyUrl?: string;
  isTestnet: boolean;
  connected: boolean;
}
