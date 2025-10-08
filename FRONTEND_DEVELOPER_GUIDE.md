# 🚀 Frontend Developer Guide - Zypher Trading Platform

## 📋 **Complete Guide for Building a Forex Trading Platform**

This guide provides everything a frontend developer needs to build a professional forex trading platform using the Zypher Trading Data API and TradingView integration.

---

## 🎯 **Overview**

You'll be building a modern trading platform with:
- **Real-time TradingView Charts** with live ZPH data
- **WebSocket Integration** for instant price updates
- **Admin Dashboard** for manual price control
- **Responsive Design** for desktop and mobile
- **Professional Trading Interface** with order management

---

## 🛠️ **Technology Stack Recommendations**

### **Core Frontend Framework**
```bash
# React with TypeScript (Recommended)
npx create-react-app zypher-trading-platform --template typescript

# Or Next.js for SSR/SSG
npx create-next-app@latest zypher-trading-platform --typescript

# Or Vue.js with TypeScript
npm create vue@latest zypher-trading-platform
```

### **Essential Dependencies**
```json
{
  "dependencies": {
    "@tradingview/charting_library": "^25.0.0",
    "socket.io-client": "^4.8.1",
    "axios": "^1.6.0",
    "react-query": "^3.39.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "framer-motion": "^10.16.0",
    "recharts": "^2.8.0",
    "react-hot-toast": "^2.4.0"
  }
}
```

---

## 🔌 **API Integration Setup**

### **1. Base API Configuration**

```typescript
// src/config/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
export const API_ENDPOINTS = {
  // TradingView API
  CONFIG: '/tradingview/config',
  SYMBOLS: '/tradingview/symbols',
  HISTORY: '/tradingview/history',
  TIME: '/tradingview/time',
  PRICE: '/tradingview/price',
  STATUS: '/tradingview/status',
  MODE: '/tradingview/mode',
  MANUAL_CONTROL: '/tradingview/manual-control',
  
  // System endpoints
  HEALTH: '/health',
  REDIS_TEST: '/redis/test',
} as const;
```

### **2. TypeScript Types**

```typescript
// src/types/trading.ts
export interface Candle {
  id?: number;
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  mode: 'auto' | 'manual';
  resolution: string;
}

export interface TradingViewConfig {
  supports_search: boolean;
  supports_group_request: boolean;
  supports_marks: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
  exchanges: Array<{
    value: string;
    name: string;
    desc: string;
  }>;
  symbols_types: Array<{
    name: string;
    value: string;
  }>;
  supported_resolutions: string[];
}

export interface TradingViewSymbol {
  name: string;
  ticker: string;
  type: string;
  session: string;
  timezone: string;
  pricescale: number;
  minmov: number;
  fractional: boolean;
  has_intraday: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
}

export interface SystemStatus {
  mode: 'auto' | 'manual';
  isRunning: boolean;
  lastCandleTime: number;
  currentPrice: number;
  totalCandles: number;
  uptime: number;
  activeManualControl?: {
    id: number;
    direction: 'up' | 'down' | 'neutral';
    speed: number;
    intensity: number;
    duration_seconds: number;
    is_active: boolean;
    created_at: string;
    expires_at: string;
  };
}

export interface WebSocketCandleUpdate {
  symbol: string;
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  mode: 'auto' | 'manual';
  resolution: string;
}
```

---

## 📊 **TradingView Integration**

### **1. TradingView Chart Setup**

```typescript
// src/components/TradingViewChart.tsx
import React, { useEffect, useRef, useState } from 'react';
import { widget } from '@tradingview/charting_library';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { TradingViewConfig, TradingViewSymbol } from '../types/trading';

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  autosize?: boolean;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = 'ZPHUSD',
  interval = '1',
  autosize = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initChart = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get TradingView configuration
        const configResponse = await apiClient.get<TradingViewConfig>(API_ENDPOINTS.CONFIG);
        const config = configResponse.data.data;

        // Get symbol information
        const symbolResponse = await apiClient.get<TradingViewSymbol>(API_ENDPOINTS.SYMBOLS);
        const symbolInfo = symbolResponse.data.data;

        if (!chartContainerRef.current) return;

        // Create TradingView widget
        const tvWidget = new widget({
          symbol: symbol,
          datafeed: new ZypherDatafeed(),
          interval: interval,
          container: chartContainerRef.current,
          library_path: '/charting_library/',
          locale: 'en',
          disabled_features: [
            'use_localstorage_for_settings',
            'volume_force_overlay',
            'create_volume_indicator_by_default',
          ],
          enabled_features: [
            'side_toolbar_in_fullscreen_mode',
            'header_in_fullscreen_mode',
            'hide_left_toolbar_by_default',
          ],
          charts_storage_url: 'https://saveload.tradingview.com',
          charts_storage_api_version: '1.1',
          client_id: 'zypher-trading-platform',
          user_id: 'public_user_id',
          fullscreen: false,
          autosize: autosize,
          studies_overrides: {},
          theme: 'dark', // or 'light'
        });

        tvWidgetRef.current = tvWidget;

        tvWidget.onChartReady(() => {
          setIsLoading(false);
          console.log('TradingView chart is ready');
        });

      } catch (err) {
        console.error('Failed to initialize TradingView chart:', err);
        setError('Failed to load chart');
        setIsLoading(false);
      }
    };

    initChart();

    return () => {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
      }
    };
  }, [symbol, interval, autosize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-white">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};
```

### **2. Custom Datafeed Implementation**

```typescript
// src/datafeed/ZypherDatafeed.ts
import { apiClient, API_ENDPOINTS } from '../config/api';
import { TradingViewSymbol, TradingViewConfig } from '../types/trading';

export class ZypherDatafeed {
  private config: TradingViewConfig | null = null;
  private symbolInfo: TradingViewSymbol | null = null;

  async onReady(callback: (config: TradingViewConfig) => void) {
    try {
      const response = await apiClient.get<TradingViewConfig>(API_ENDPOINTS.CONFIG);
      this.config = response.data.data;
      callback(this.config);
    } catch (error) {
      console.error('Failed to get TradingView config:', error);
    }
  }

  async searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (symbols: any[]) => void
  ) {
    try {
      const response = await apiClient.get<TradingViewSymbol>(API_ENDPOINTS.SYMBOLS);
      const symbol = response.data.data;
      
      // Filter symbols based on user input
      const filteredSymbols = symbol.ticker.toLowerCase().includes(userInput.toLowerCase()) 
        ? [symbol] 
        : [];
      
      onResultReadyCallback(filteredSymbols);
    } catch (error) {
      console.error('Failed to search symbols:', error);
      onResultReadyCallback([]);
    }
  }

  async resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: TradingViewSymbol) => void,
    onResolveErrorCallback: (reason: string) => void
  ) {
    try {
      const response = await apiClient.get<TradingViewSymbol>(API_ENDPOINTS.SYMBOLS);
      const symbolInfo = response.data.data;
      this.symbolInfo = symbolInfo;
      onSymbolResolvedCallback(symbolInfo);
    } catch (error) {
      console.error('Failed to resolve symbol:', error);
      onResolveErrorCallback('Symbol not found');
    }
  }

  async getBars(
    symbolInfo: TradingViewSymbol,
    resolution: string,
    periodParams: any,
    onHistoryCallback: (bars: any[], meta: any) => void,
    onErrorCallback: (reason: string) => void
  ) {
    try {
      const { from, to, firstDataRequest } = periodParams;
      
      const response = await apiClient.get(API_ENDPOINTS.HISTORY, {
        params: {
          symbol: symbolInfo.ticker,
          resolution,
          from,
          to,
          countback: 1000,
        },
      });

      const data = response.data;
      
      if (data.s === 'ok') {
        const bars = data.t.map((timestamp: number, index: number) => ({
          time: timestamp * 1000, // Convert to milliseconds
          open: data.o[index],
          high: data.h[index],
          low: data.l[index],
          close: data.c[index],
          volume: data.v[index],
        }));

        const meta = {
          noData: bars.length === 0,
        };

        onHistoryCallback(bars, meta);
      } else {
        onErrorCallback('No data available');
      }
    } catch (error) {
      console.error('Failed to get bars:', error);
      onErrorCallback('Failed to fetch data');
    }
  }

  async subscribeBars(
    symbolInfo: TradingViewSymbol,
    resolution: string,
    onRealtimeCallback: (bar: any) => void,
    subscribeUID: string,
    onResetCacheNeededCallback: () => void
  ) {
    // This will be handled by WebSocket connection
    console.log('Subscribing to real-time bars for:', symbolInfo.ticker);
  }

  async unsubscribeBars(subscribeUID: string) {
    console.log('Unsubscribing from real-time bars:', subscribeUID);
  }

  async getServerTime(callback: (time: number) => void) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TIME);
      callback(response.data.data);
    } catch (error) {
      console.error('Failed to get server time:', error);
      callback(Math.floor(Date.now() / 1000));
    }
  }
}
```

---

## 🔌 **WebSocket Integration**

### **⏰ Candle Generation Timing**
- **1-Minute Candles**: New candles are generated every 60 seconds
- **Timestamp Alignment**: Candles align to minute boundaries (22:39:00, 22:40:00, etc.)
- **Real-time Updates**: WebSocket broadcasts new candles immediately when generated
- **TradingView Compatible**: Follows standard OHLCV format for professional charts

### **1. WebSocket Service**

```typescript
// src/services/websocketService.ts
import { io, Socket } from 'socket.io-client';
import { WebSocketCandleUpdate, SystemStatus } from '../types/trading';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    const serverUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
      
      // Subscribe to ZPHUSD symbol
      this.socket?.emit('subscribe', { symbol: 'ZPHUSD' });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    return this.socket;
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  // Candle update events
  onCandleUpdate(callback: (candle: WebSocketCandleUpdate) => void) {
    this.socket?.on('candle_update', callback);
  }

  onSystemStatus(callback: (status: SystemStatus) => void) {
    this.socket?.on('system_status', callback);
  }

  onModeChange(callback: (data: { mode: 'auto' | 'manual'; timestamp: number }) => void) {
    this.socket?.on('mode_change', callback);
  }

  onManualControl(callback: (control: any) => void) {
    this.socket?.on('manual_control', callback);
  }

  onError(callback: (error: { error: string; details?: any; timestamp: number }) => void) {
    this.socket?.on('error', callback);
  }

  onInfo(callback: (info: { message: string; data?: any; timestamp: number }) => void) {
    this.socket?.on('info', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
```

### **2. WebSocket Hook**

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useState } from 'react';
import { wsService } from '../services/websocketService';
import { WebSocketCandleUpdate, SystemStatus } from '../types/trading';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestCandle, setLatestCandle] = useState<WebSocketCandleUpdate | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = wsService.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setError('Connection failed');
      setIsConnected(false);
    });

    wsService.onCandleUpdate((candle) => {
      setLatestCandle(candle);
    });

    wsService.onSystemStatus((status) => {
      setSystemStatus(status);
    });

    wsService.onError((errorData) => {
      setError(errorData.error);
    });

    return () => {
      wsService.disconnect();
    };
  }, []);

  return {
    isConnected,
    latestCandle,
    systemStatus,
    error,
  };
};
```

---

## 🎛️ **Admin Dashboard Components**

### **1. System Status Panel**

```typescript
// src/components/SystemStatusPanel.tsx
import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export const SystemStatusPanel: React.FC = () => {
  const { systemStatus, isConnected } = useWebSocket();

  if (!systemStatus) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-white">Loading system status...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded p-3">
          <div className="text-gray-300 text-sm">Connection</div>
          <div className={`text-lg font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="text-gray-300 text-sm">Trading Mode</div>
          <div className={`text-lg font-semibold ${
            systemStatus.mode === 'auto' ? 'text-blue-400' : 'text-yellow-400'
          }`}>
            {systemStatus.mode.toUpperCase()}
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="text-gray-300 text-sm">Current Price</div>
          <div className="text-lg font-semibold text-white">
            ${systemStatus.currentPrice.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="text-gray-300 text-sm">Total Candles</div>
          <div className="text-lg font-semibold text-white">
            {systemStatus.totalCandles.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="text-gray-300 text-sm">Uptime</div>
          <div className="text-lg font-semibold text-white">
            {Math.floor(systemStatus.uptime / 1000 / 60)}m
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3">
          <div className="text-gray-300 text-sm">Service Status</div>
          <div className={`text-lg font-semibold ${
            systemStatus.isRunning ? 'text-green-400' : 'text-red-400'
          }`}>
            {systemStatus.isRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>

      {systemStatus.activeManualControl && (
        <div className="mt-4 bg-yellow-900 rounded p-3">
          <div className="text-yellow-200 text-sm">Active Manual Control</div>
          <div className="text-white">
            Direction: {systemStatus.activeManualControl.direction.toUpperCase()} | 
            Speed: {(systemStatus.activeManualControl.speed * 100).toFixed(1)}% | 
            Intensity: {systemStatus.activeManualControl.intensity}x
          </div>
        </div>
      )}
    </div>
  );
};
```

### **2. Manual Control Panel**

```typescript
// src/components/ManualControlPanel.tsx
import React, { useState } from 'react';
import { apiClient, API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';

export const ManualControlPanel: React.FC = () => {
  const [direction, setDirection] = useState<'up' | 'down' | 'neutral'>('up');
  const [speed, setSpeed] = useState(0.02);
  const [intensity, setIntensity] = useState(1.0);
  const [duration, setDuration] = useState(300);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiClient.post(API_ENDPOINTS.MANUAL_CONTROL, {
        direction,
        speed,
        intensity,
        duration_seconds: duration,
      });

      if (response.data.success) {
        toast.success('Manual control applied successfully!');
      } else {
        toast.error('Failed to apply manual control');
      }
    } catch (error) {
      console.error('Error applying manual control:', error);
      toast.error('Error applying manual control');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Manual Price Control</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm mb-2">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as any)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2"
          >
            <option value="up">Up (Bullish)</option>
            <option value="down">Down (Bearish)</option>
            <option value="neutral">Neutral (Auto)</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Speed: {(speed * 100).toFixed(1)}%
          </label>
          <input
            type="range"
            min="0.001"
            max="0.1"
            step="0.001"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Intensity: {intensity.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Duration: {duration} seconds
          </label>
          <input
            type="range"
            min="30"
            max="3600"
            step="30"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded"
        >
          {isLoading ? 'Applying...' : 'Apply Manual Control'}
        </button>
      </form>
    </div>
  );
};
```

### **3. Trading Mode Toggle**

```typescript
// src/components/TradingModeToggle.tsx
import React, { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';

export const TradingModeToggle: React.FC = () => {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCurrentMode();
  }, []);

  const fetchCurrentMode = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MODE);
      setMode(response.data.data.mode);
    } catch (error) {
      console.error('Error fetching current mode:', error);
    }
  };

  const toggleMode = async () => {
    const newMode = mode === 'auto' ? 'manual' : 'auto';
    setIsLoading(true);

    try {
      const response = await apiClient.post(API_ENDPOINTS.MODE, { mode: newMode });
      
      if (response.data.success) {
        setMode(newMode);
        toast.success(`Switched to ${newMode} mode`);
      } else {
        toast.error('Failed to change mode');
      }
    } catch (error) {
      console.error('Error changing mode:', error);
      toast.error('Error changing mode');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-3">Trading Mode</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-gray-300 text-sm">Current Mode</div>
          <div className={`text-xl font-semibold ${
            mode === 'auto' ? 'text-blue-400' : 'text-yellow-400'
          }`}>
            {mode.toUpperCase()}
          </div>
        </div>

        <button
          onClick={toggleMode}
          disabled={isLoading}
          className={`px-6 py-2 rounded font-semibold transition-colors ${
            mode === 'auto'
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:bg-gray-600`}
        >
          {isLoading ? 'Switching...' : `Switch to ${mode === 'auto' ? 'Manual' : 'Auto'}`}
        </button>
      </div>
    </div>
  );
};
```

---

## 📱 **Main Trading Platform Layout**

### **1. Main App Component**

```typescript
// src/App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { TradingViewChart } from './components/TradingViewChart';
import { SystemStatusPanel } from './components/SystemStatusPanel';
import { ManualControlPanel } from './components/ManualControlPanel';
import { TradingModeToggle } from './components/TradingModeToggle';
import { PriceDisplay } from './components/PriceDisplay';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-2">
              Zypher Trading Platform
            </h1>
            <p className="text-gray-400 text-center">
              Real-time ZPH trading data with manual control
            </p>
          </header>

          {/* Price Display */}
          <div className="mb-6">
            <PriceDisplay />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Chart - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-4 h-96">
                <TradingViewChart symbol="ZPHUSD" interval="1" />
              </div>
            </div>

            {/* Control Panel - Takes 1 column */}
            <div className="space-y-6">
              <TradingModeToggle />
              <SystemStatusPanel />
            </div>
          </div>

          {/* Admin Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ManualControlPanel />
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded">
                  Start Trading Service
                </button>
                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded">
                  Stop Trading Service
                </button>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
                  Reset to Auto Mode
                </button>
              </div>
            </div>
          </div>
        </div>

        <Toaster position="top-right" />
      </div>
    </QueryClientProvider>
  );
}

export default App;
```

### **2. Price Display Component**

```typescript
// src/components/PriceDisplay.tsx
import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export const PriceDisplay: React.FC = () => {
  const { latestCandle, systemStatus } = useWebSocket();

  const currentPrice = latestCandle?.c || systemStatus?.currentPrice || 0;
  const previousPrice = latestCandle?.o || currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-gray-400 text-sm">ZPH/USD</div>
          <div className="text-3xl font-bold text-white">
            ${currentPrice.toFixed(2)}
          </div>
        </div>

        <div className="text-right">
          <div className={`text-lg font-semibold ${
            priceChange >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
          </div>
          <div className={`text-sm ${
            priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </div>
        </div>

        <div className="text-right">
          <div className="text-gray-400 text-sm">Mode</div>
          <div className={`text-lg font-semibold ${
            systemStatus?.mode === 'auto' ? 'text-blue-400' : 'text-yellow-400'
          }`}>
            {systemStatus?.mode?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🎨 **Styling with Tailwind CSS**

### **1. Tailwind Configuration**

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trading-green': '#00C851',
        'trading-red': '#FF4444',
        'trading-blue': '#2196F3',
        'trading-yellow': '#FFC107',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
```

### **2. Global Styles**

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-900 text-white;
  }
}

@layer components {
  .trading-card {
    @apply bg-gray-800 rounded-lg p-4 border border-gray-700;
  }
  
  .trading-button {
    @apply px-4 py-2 rounded font-semibold transition-colors duration-200;
  }
  
  .trading-button-primary {
    @apply trading-button bg-blue-600 hover:bg-blue-700 text-white;
  }
  
  .trading-button-success {
    @apply trading-button bg-green-600 hover:bg-green-700 text-white;
  }
  
  .trading-button-danger {
    @apply trading-button bg-red-600 hover:bg-red-700 text-white;
  }
}
```

---

## 🚀 **Deployment Guide**

### **1. Environment Variables**

```bash
# .env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
```

### **2. Production Build**

```bash
# Build for production
npm run build

# Serve with a static server
npx serve -s build -l 3000
```

### **3. Docker Deployment**

```dockerfile
# Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 📚 **Additional Resources**

### **1. TradingView Documentation**
- [TradingView Charting Library](https://www.tradingview.com/charting-library/)
- [Datafeed API](https://www.tradingview.com/charting-library/docs/datafeed_api)
- [Widget API](https://www.tradingview.com/charting-library/docs/widget_api)

### **2. Socket.IO Documentation**
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)
- [Socket.IO Events](https://socket.io/docs/v4/emitting-events/)

### **3. React Query Documentation**
- [React Query](https://react-query.tanstack.com/)
- [Mutations](https://react-query.tanstack.com/guides/mutations)

---

## 🎯 **Next Steps**

1. **Set up the project** with the recommended tech stack
2. **Implement the TradingView integration** using the provided datafeed
3. **Add WebSocket connectivity** for real-time updates
4. **Build the admin dashboard** with manual controls
5. **Style the interface** with Tailwind CSS
6. **Test thoroughly** with the live API
7. **Deploy to production** when ready

---

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **TradingView Chart Not Loading**
   - Check if the charting library files are properly served
   - Verify the datafeed implementation
   - Check browser console for errors

2. **WebSocket Connection Issues**
   - Verify the server is running on the correct port
   - Check CORS settings
   - Ensure Socket.IO client version matches server

3. **API Calls Failing**
   - Verify the API base URL
   - Check network connectivity
   - Review API endpoint responses

---

**🎉 You now have everything needed to build a professional forex trading platform with the Zypher Trading Data API!**
