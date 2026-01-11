
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Position, Order, OrderSide } from '../types';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface MarketChartProps {
  data: CandleData[];
  pair: string;
  positions?: Position[];
  orders?: Order[];
  onUpdateTPSL?: (id: string, isOrder: boolean, type: 'TP' | 'SL', price: number) => void;
}

interface DragTarget {
  id: string;
  isOrder: boolean;
  type: 'TP' | 'SL';
  symbol: string;
  originalPrice: number;
}

const MarketChart: React.FC<MarketChartProps> = ({ data, pair, positions = [], orders = [], onUpdateTPSL }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);

  const COLOR_BULL = '#02c076';
  const COLOR_BEAR = '#f84960';
  const COLOR_ACCENT = '#facc15';
  const COLOR_GRID = '#1e2329';
  const COLOR_BG = '#0b0e11';

  const normalizedPair = pair.replace('/', '');

  useEffect(() => {
    if (data.length > 0 && (visibleRange.end === 0)) {
      const initialCount = Math.min(data.length, 80);
      setVisibleRange({
        start: Math.max(0, data.length - initialCount),
        end: data.length
      });
    } else if (data.length > 0) {
      const isNearEnd = visibleRange.end >= data.length - 2;
      if (isNearEnd) {
        const count = visibleRange.end - visibleRange.start;
        setVisibleRange({
          start: Math.max(0, data.length - count),
          end: data.length
        });
      }
    }
  }, [data.length]);

  const visibleData = useMemo(() => data.slice(visibleRange.start, visibleRange.end), [data, visibleRange]);

  const stats = useMemo(() => {
    if (visibleData.length === 0) return { min: 0, max: 0, maxVol: 0, center: 0 };
    const allPrices = visibleData.flatMap(d => [d.high, d.low]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    
    const lastPrice = visibleData[visibleData.length - 1]?.close || (min + max) / 2;
    const spreadFromCenter = Math.max(max - lastPrice, lastPrice - min);
    const padding = Math.max(spreadFromCenter * 1.6, lastPrice * 0.025);

    return { 
      min: lastPrice - padding, 
      max: lastPrice + padding, 
      maxVol: Math.max(...visibleData.map(d => d.volume || 0)),
      center: lastPrice
    };
  }, [visibleData]);

  const range = stats.max - stats.min;
  const getY = useCallback((price: number) => {
    if (range === 0) return 50;
    return ((stats.max - price) / range) * 100;
  }, [stats.max, range]);

  const getPriceFromY = useCallback((yPct: number) => stats.max - (yPct / 100) * range, [stats.max, range]);

  const activePositions = positions.filter(p => p.symbol === normalizedPair);
  const activeOrders = orders.filter(o => o.pair.replace('/', '') === normalizedPair);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current || visibleData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width - 64;
    const height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 0.5;
    [0.25, 0.5, 0.75].forEach(p => {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, height * p);
      ctx.lineTo(width, height * p);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    const candleCount = visibleData.length;
    const candleWidth = width / candleCount;
    const spacing = candleWidth * 0.25;

    visibleData.forEach((d, i) => {
      const isBull = d.close >= d.open;
      const color = isBull ? COLOR_BULL : COLOR_BEAR;
      const x = i * candleWidth;
      const yHigh = (getY(d.high) / 100) * height;
      const yLow = (getY(d.low) / 100) * height;
      const yOpen = (getY(d.open) / 100) * height;
      const yClose = (getY(d.close) / 100) * height;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, yHigh);
      ctx.lineTo(x + candleWidth / 2, yLow);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(x + spacing / 2, Math.min(yOpen, yClose), candleWidth - spacing, Math.max(Math.abs(yOpen - yClose), 1));
    });

    const last = data[data.length - 1];
    if (last) {
      const ly = (getY(last.close) / 100) * height;
      ctx.strokeStyle = COLOR_ACCENT;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(width, ly); ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [visibleData, stats, getY, data]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;

    // Increased tolerance to 4% for better hit detection
    const HIT_TOLERANCE = 4;

    for (const p of activePositions) {
      const entryY = getY(parseFloat(p.avgPrice));
      
      // Existing TP Hit
      if (p.takeProfit && Math.abs(getY(parseFloat(p.takeProfit)) - yPct) < HIT_TOLERANCE) {
        setDragTarget({ id: p.symbol, isOrder: false, type: 'TP', symbol: p.symbol, originalPrice: parseFloat(p.takeProfit) });
        return;
      }
      // Existing SL Hit
      if (p.stopLoss && Math.abs(getY(parseFloat(p.stopLoss)) - yPct) < HIT_TOLERANCE) {
        setDragTarget({ id: p.symbol, isOrder: false, type: 'SL', symbol: p.symbol, originalPrice: parseFloat(p.stopLoss) });
        return;
      }
      
      // Hit "Set New TP/SL" handles on the right (Increased hit area)
      if (Math.abs(entryY - yPct) < HIT_TOLERANCE && xPct > 75 && xPct < 96) {
        if (e.clientY < (rect.top + (entryY / 100) * rect.height)) {
            setDragTarget({ id: p.symbol, isOrder: false, type: 'TP', symbol: p.symbol, originalPrice: parseFloat(p.avgPrice) });
        } else {
            setDragTarget({ id: p.symbol, isOrder: false, type: 'SL', symbol: p.symbol, originalPrice: parseFloat(p.avgPrice) });
        }
        return;
      }
    }

    for (const o of activeOrders) {
      if (o.status !== 'OPEN') continue;
      const orderY = getY(o.price);
      if (Math.abs(orderY - yPct) < HIT_TOLERANCE && xPct > 75 && xPct < 96) {
          setDragTarget({ id: o.id, isOrder: true, type: 'TP', symbol: o.pair, originalPrice: o.price });
          return;
      }
    }

    setIsPanning(true);
    setLastMouseX(e.clientX);
  };

  const handleMouseUp = useCallback(() => {
    if (dragTarget && onUpdateTPSL) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const yPct = (mousePos.y / rect.height) * 100;
        const newPrice = getPriceFromY(yPct);
        if (Math.abs(newPrice - dragTarget.originalPrice) / dragTarget.originalPrice > 0.0001) {
            onUpdateTPSL(dragTarget.id, dragTarget.isOrder, dragTarget.type, newPrice);
        }
      }
    }
    setIsPanning(false);
    setDragTarget(null);
  }, [dragTarget, mousePos, onUpdateTPSL, getPriceFromY]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const candleWidth = (rect.width - 64) / visibleData.length;
    const idx = visibleRange.start + Math.floor(x / candleWidth);
    setHoveredCandle(data[idx] || null);

    if (isPanning) {
      const dx = e.clientX - lastMouseX;
      if (Math.abs(dx) > candleWidth) {
        const move = Math.round(dx / candleWidth);
        const newStart = Math.max(0, Math.min(data.length - (visibleRange.end - visibleRange.start), visibleRange.start - move));
        setVisibleRange({ start: newStart, end: newStart + (visibleRange.end - visibleRange.start) });
        setLastMouseX(e.clientX);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col relative select-none font-mono">
      <div className="absolute top-0 left-0 p-4 z-40 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-white uppercase tracking-tighter shadow-black drop-shadow-md">{pair}</span>
          <span className="px-2 py-0.5 bg-emerald-500 text-black text-[9px] font-black rounded uppercase">Live_Node</span>
        </div>
        {hoveredCandle && (
          <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase bg-black/40 px-2 py-1 rounded w-fit backdrop-blur-sm">
            <span>O <span className="text-white">{hoveredCandle.open.toFixed(1)}</span></span>
            <span>H <span className="text-emerald-400">{hoveredCandle.high.toFixed(1)}</span></span>
            <span>L <span className="text-rose-400">{hoveredCandle.low.toFixed(1)}</span></span>
            <span>C <span className="text-white">{hoveredCandle.close.toFixed(1)}</span></span>
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}>
        <canvas ref={canvasRef} className="absolute inset-0" style={{ width: 'calc(100% - 64px)', height: '100%' }} />
        
        <div className="absolute right-0 top-0 bottom-0 w-16 border-l border-[#1e2329] bg-[#0b0e11] z-30 flex flex-col justify-between py-10 px-1 text-[9px] font-black text-slate-600">
          <span>{stats.max.toFixed(1)}</span>
          <div className="bg-[#facc15] text-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(250,204,21,0.4)] text-[10px] transform -translate-x-2 font-black">
            {stats.center.toFixed(1)}
          </div>
          <span>{stats.min.toFixed(1)}</span>
        </div>

        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none z-20 overflow-visible">
          <g className="pointer-events-auto">
            
            {activePositions.map((p, idx) => {
              const y = getY(parseFloat(p.avgPrice));
              const isLong = p.side === 'Buy';
              const color = isLong ? COLOR_BULL : COLOR_BEAR;
              
              return (
                <g key={`entry-${idx}`}>
                  {/* Entry Signal */}
                  <line x1="0" y1={`${y}%`} x2="calc(100% - 64px)" y2={`${y}%`} stroke={color} strokeWidth="1.5" strokeDasharray="8 4" opacity="0.4" />
                  
                  {/* High Contrast Entry Marker */}
                  <rect x="5" y={`${y - 7}%`} width="110" height="14" rx="3" fill="#0b0e11" stroke={color} strokeWidth="1" />
                  <circle cx="15" cy={`${y}%`} r="3.5" fill={color} />
                  <text x="25" y={`${y + 3.5}%`} fill={color} fontSize="9" fontWeight="900" className="uppercase tracking-tight">
                    {isLong ? 'LONG' : 'SHORT'} --@-- {parseFloat(p.avgPrice).toFixed(1)}
                  </text>

                  {/* Enhanced "Pull-To-Set" Handles */}
                  {!p.takeProfit && (
                    <g className="cursor-ns-resize group">
                      <rect x="calc(100% - 105px)" y={`${y - 14}%`} width="42" height="12" rx="6" fill={COLOR_BULL} opacity="0.25" />
                      <text x="calc(100% - 84px)" y={`${y - 5}%`} textAnchor="middle" fill={COLOR_BULL} fontSize="8" fontWeight="900" className="group-hover:opacity-100 opacity-80 transition-opacity">+TP</text>
                      <circle cx="calc(100% - 84px)" cy={`${y - 16}%`} r="2" fill={COLOR_BULL} className="animate-pulse" />
                    </g>
                  )}
                  {!p.stopLoss && (
                    <g className="cursor-ns-resize group">
                      <rect x="calc(100% - 105px)" y={`${y + 2}%`} width="42" height="12" rx="6" fill={COLOR_BEAR} opacity="0.25" />
                      <text x="calc(100% - 84px)" y={`${y + 11}%`} textAnchor="middle" fill={COLOR_BEAR} fontSize="8" fontWeight="900" className="group-hover:opacity-100 opacity-80 transition-opacity">+SL</text>
                      <circle cx="calc(100% - 84px)" cy={`${y + 16}%`} r="2" fill={COLOR_BEAR} className="animate-pulse" />
                    </g>
                  )}

                  {/* Active TP Visualization */}
                  {p.takeProfit && (
                    <g>
                      <line x1="0" y1={`${getY(parseFloat(p.takeProfit))}%`} x2="calc(100% - 64px)" y2={`${getY(parseFloat(p.takeProfit))}%`} stroke={COLOR_BULL} strokeWidth="2" strokeDasharray="4 2" />
                      <rect x="calc(100% - 110px)" y={`${getY(parseFloat(p.takeProfit)) - 9}%`} width="48" height="18" fill={COLOR_BULL} rx="9" className="cursor-ns-resize pointer-events-auto shadow-2xl" />
                      <text x="calc(100% - 86px)" y={`${getY(parseFloat(p.takeProfit)) + 3.5}%`} textAnchor="middle" fill="black" fontSize="10" fontWeight="900">TP</text>
                    </g>
                  )}

                  {/* Active SL Visualization */}
                  {p.stopLoss && (
                    <g>
                      <line x1="0" y1={`${getY(parseFloat(p.stopLoss))}%`} x2="calc(100% - 64px)" y2={`${getY(parseFloat(p.stopLoss))}%`} stroke={COLOR_BEAR} strokeWidth="2" strokeDasharray="4 2" />
                      <rect x="calc(100% - 110px)" y={`${getY(parseFloat(p.stopLoss)) - 9}%`} width="48" height="18" fill={COLOR_BEAR} rx="9" className="cursor-ns-resize pointer-events-auto shadow-2xl" />
                      <text x="calc(100% - 86px)" y={`${getY(parseFloat(p.stopLoss)) + 3.5}%`} textAnchor="middle" fill="black" fontSize="10" fontWeight="900">SL</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Dragging Overlay (Active HUD) */}
            {dragTarget && (
              <g>
                <line x1="0" y1={mousePos.y} x2="calc(100% - 64px)" y2={mousePos.y} stroke={dragTarget.type === 'TP' ? COLOR_BULL : COLOR_BEAR} strokeWidth="3" strokeDasharray="6 3" />
                <rect x="50%" y={mousePos.y - 20} width="200" height="40" fill="#181a20" stroke={COLOR_ACCENT} strokeWidth="2" rx="10" transform="translate(-100, 0)" />
                <text x="50%" y={mousePos.y + 6} textAnchor="middle" fill={COLOR_ACCENT} fontSize="14" fontWeight="900">
                   SET {dragTarget.type}: {getPriceFromY((mousePos.y / (containerRef.current?.clientHeight || 1)) * 100).toFixed(1)}
                </text>
                <circle cx="50%" cy={mousePos.y} r="4" fill={COLOR_ACCENT} transform="translate(-115, 0)" className="animate-ping" />
              </g>
            )}
          </g>

          {/* Precision Crosshair */}
          <g opacity="0.15">
            <line x1={mousePos.x} y1="0" x2={mousePos.x} y2="100%" stroke="#fff" strokeWidth="1" />
            <line x1="0" y1={mousePos.y} x2="calc(100% - 64px)" y2={mousePos.y} stroke="#fff" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default MarketChart;
