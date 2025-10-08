# 📚 Zypher Trading Data API - Complete Reference

## 🔗 **Base URL**
```
http://localhost:3001/api
```

## 🚀 **System Status**
- ✅ **All endpoints tested and working**
- ✅ **Real-time candle generation** (60-second intervals)
- ✅ **Live price streaming** (1-second updates)
- ✅ **WebSocket support** for instant updates
- ✅ **TradingView integration** ready
- ✅ **Database overflow protection** implemented
- ✅ **Clean data reset** (removed 26,428+ old candles)
- ✅ **Price range normalized** ($10-11 range)
- ✅ **Manual control limits** (max 10% speed, 1000% intensity)

## 🔧 **Recent Fixes Applied**
- **Database Schema**: Updated to `NUMERIC(30,8)` for larger price ranges
- **Price Limits**: Added constraints to prevent exponential growth
- **Auto Reset**: Trigger resets prices if they exceed $100k threshold
- **Timestamp Fix**: Historical endpoint now returns seconds (not milliseconds)
- **WebSocket Integration**: All trading events broadcast in real-time
- **Manual Control Limits**: Reasonable constraints on speed/intensity

---

## 📊 **TradingView API Endpoints**

### **GET /tradingview/config**
Get TradingView chart configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "supports_search": true,
    "supports_group_request": false,
    "supports_marks": false,
    "supports_timescale_marks": false,
    "supports_time": true,
    "exchanges": [
      {
        "value": "ZPH",
        "name": "Zypher",
        "desc": "Zypher (ZPH) Trading Data"
      }
    ],
    "symbols_types": [
      {
        "name": "Crypto",
        "value": "crypto"
      }
    ],
    "supported_resolutions": ["1", "5", "15", "60", "1D"]
  }
}
```

### **GET /tradingview/symbols**
Get ZPH symbol metadata.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Zypher",
    "ticker": "ZPHUSD",
    "type": "crypto",
    "session": "24x7",
    "timezone": "Etc/UTC",
    "pricescale": 100,
    "minmov": 1,
    "fractional": false,
    "has_intraday": true,
    "has_weekly_and_monthly": false,
    "supported_resolutions": ["1", "5", "15", "60", "1D"],
    "volume_precision": 2,
    "data_status": "streaming"
  }
}
```

### **GET /tradingview/history**
Get historical OHLCV candles.

**Parameters:**
- `symbol` (string): Symbol name (default: ZPHUSD)
- `resolution` (string): Timeframe (1, 5, 15, 60, 1D)
- `from` (number): Start timestamp (Unix)
- `to` (number): End timestamp (Unix)
- `countback` (number): Max candles to return (default: 1000)

**Response:**
```json
{
  "s": "ok",
  "t": [1696500000, 1696500060],
  "o": [10.0, 10.2],
  "h": [10.3, 10.4],
  "l": [9.9, 10.1],
  "c": [10.2, 10.3],
  "v": [120, 130]
}
```

### **GET /tradingview/time**
Get current server timestamp.

**Response:**
```json
{
  "success": true,
  "data": 1696500300
}
```

### **GET /tradingview/price**
Get current ZPH price.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "ZPHUSD",
    "price": 10.25,
    "timestamp": 1696500300000
  }
}
```

---

## 🎛️ **Control Endpoints**

### **GET /tradingview/status**
Get system status.

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "auto",
    "isRunning": true,
    "lastCandleTime": 1696500300000,
    "currentPrice": 10.25,
    "totalCandles": 1500,
    "uptime": 3600000,
    "activeManualControl": {
      "id": 1,
      "direction": "up",
      "speed": 0.02,
      "intensity": 1.5,
      "duration_seconds": 300,
      "is_active": true,
      "created_at": "2025-10-06T10:00:00Z",
      "expires_at": "2025-10-06T10:05:00Z"
    }
  }
}
```

### **GET /tradingview/mode**
Get current trading mode.

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "auto",
    "lastUpdated": "2025-10-06T10:00:00Z"
  }
}
```

### **POST /tradingview/mode**
Set trading mode.

**Request Body:**
```json
{
  "mode": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trading mode set to manual",
  "data": {
    "mode": "manual"
  }
}
```

### **POST /tradingview/manual-control**
Create manual price control.

**Request Body:**
```json
{
  "direction": "up",
  "speed": 0.02,
  "intensity": 1.5,
  "duration_seconds": 300
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual control created successfully",
  "data": {
    "id": 1,
    "direction": "up",
    "speed": 0.02,
    "intensity": 1.5,
    "duration_seconds": 300,
    "is_active": true,
    "created_at": "2025-10-06T10:00:00Z",
    "expires_at": "2025-10-06T10:05:00Z"
  }
}
```

### **POST /tradingview/start**
Start trading service.

**Response:**
```json
{
  "success": true,
  "message": "Trading service started successfully"
}
```

### **POST /tradingview/stop**
Stop trading service.

**Response:**
```json
{
  "success": true,
  "message": "Trading service stopped successfully"
}
```

---

## 🔌 **WebSocket Events**

### **Connection**
```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit('subscribe', { symbol: 'ZPHUSD' });
});
```

### **Candle Updates**
```javascript
socket.on('candle_update', (candle) => {
  console.log('New candle:', candle);
  // candle: {
  //   symbol: "ZPHUSD",
  //   t: 1696500360,
  //   o: 10.3,
  //   h: 10.35,
  //   l: 10.25,
  //   c: 10.32,
  //   v: 50,
  //   mode: "auto",
  //   resolution: "1"
  // }
});
```

### **System Status Updates**
```javascript
socket.on('system_status', (status) => {
  console.log('System status:', status);
  // status: SystemStatus object
});
```

### **Mode Changes**
```javascript
socket.on('mode_change', (data) => {
  console.log('Mode changed to:', data.mode);
  // data: { mode: "manual", timestamp: 1696500300000 }
});
```

### **Manual Control Updates**
```javascript
socket.on('manual_control', (control) => {
  console.log('Manual control:', control);
  // control: ManualControl object
});
```

### **Error Handling**
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  // error: { error: "message", details: {}, timestamp: 1696500300000 }
});
```

---

## 🧪 **Testing Examples**

### **cURL Commands**

```bash
# Get TradingView config
curl http://localhost:3001/api/tradingview/config

# Get current price
curl http://localhost:3001/api/tradingview/price

# Get system status
curl http://localhost:3001/api/tradingview/status

# Set manual mode
curl -X POST http://localhost:3001/api/tradingview/mode \
  -H "Content-Type: application/json" \
  -d '{"mode":"manual"}'

# Apply manual control (upward trend)
curl -X POST http://localhost:3001/api/tradingview/manual-control \
  -H "Content-Type: application/json" \
  -d '{"direction":"up","speed":0.02,"intensity":1.5,"duration_seconds":300}'

# Get historical data
curl "http://localhost:3001/api/tradingview/history?symbol=ZPHUSD&resolution=1&from=1696500000&to=1696503600"
```

### **JavaScript Examples**

```javascript
// Fetch current price
const getCurrentPrice = async () => {
  const response = await fetch('http://localhost:3001/api/tradingview/price');
  const data = await response.json();
  return data.data.price;
};

// Apply manual control
const applyManualControl = async (direction, speed, intensity, duration) => {
  const response = await fetch('http://localhost:3001/api/tradingview/manual-control', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      direction,
      speed,
      intensity,
      duration_seconds: duration,
    }),
  });
  return response.json();
};

// Get historical candles
const getHistoricalData = async (symbol, resolution, from, to) => {
  const params = new URLSearchParams({
    symbol,
    resolution,
    from: from.toString(),
    to: to.toString(),
  });
  
  const response = await fetch(`http://localhost:3001/api/tradingview/history?${params}`);
  return response.json();
};
```

---

## 📈 **Data Formats**

### **Candle Object**
```typescript
interface Candle {
  id?: number;
  symbol: string;        // "ZPHUSD"
  timestamp: number;     // Unix timestamp in milliseconds
  open: number;          // Opening price
  high: number;          // Highest price
  low: number;           // Lowest price
  close: number;         // Closing price
  volume: number;        // Trading volume
  mode: 'auto' | 'manual';
  resolution: string;    // "1", "5", "15", "60", "1D"
}
```

### **Manual Control Object**
```typescript
interface ManualControl {
  id?: number;
  direction: 'up' | 'down' | 'neutral';
  speed: number;         // 0.001 to 0.1 (0.1% to 10%)
  intensity: number;     // 0.1 to 5.0 (multiplier)
  duration_seconds: number; // 30 to 3600 seconds
  is_active: boolean;
  created_at?: string;
  expires_at?: string;
}
```

### **System Status Object**
```typescript
interface SystemStatus {
  mode: 'auto' | 'manual';
  isRunning: boolean;
  lastCandleTime: number;
  currentPrice: number;
  totalCandles: number;
  uptime: number;        // Milliseconds since start
  activeManualControl?: ManualControl;
}
```

---

## 🔌 **WebSocket Events**

### **Connection**
```javascript
const socket = io('ws://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to Zypher Trading API');
});
```

### **Available Events**

#### **candle_update**
New candle generated (every 60 seconds)
```javascript
socket.on('candle_update', (candle) => {
  console.log('New candle:', candle);
  // {
  //   symbol: 'ZPHUSD',
  //   t: 1759774860000,    // timestamp
  //   o: 10.28,           // open
  //   h: 10.55,           // high
  //   l: 10.24,           // low
  //   c: 10.52,           // close
  //   v: 156.7,           // volume
  //   mode: 'auto',
  //   resolution: '1'
  // }
});
```

#### **price_update**
Real-time price updates (every 1 second)
```javascript
socket.on('price_update', (priceData) => {
  console.log('Price update:', priceData);
  // {
  //   symbol: 'ZPHUSD',
  //   price: 10.55,
  //   timestamp: 1759774860000,
  //   change: 0.03,
  //   changePercent: 0.28
  // }
});
```

#### **live_ohlc**
Live real-time OHLC updates (every 1 second) - Current candle forming
```javascript
socket.on('live_ohlc', (ohlcData) => {
  console.log('Live OHLC:', ohlcData);
  // {
  //   symbol: 'ZPHUSD',
  //   timestamp: 1759774860000,
  //   open: 10.28,           // Candle open price
  //   high: 10.55,           // Current highest price
  //   low: 10.24,            // Current lowest price
  //   close: 10.52,          // Current live price
  //   volume: 156.7,         // Accumulated volume
  //   resolution: '1',       // 1 minute resolution
  //   timeRemaining: 45      // Seconds until candle closes
  // }
});
```

#### **system_status**
System status updates
```javascript
socket.on('system_status', (status) => {
  console.log('System status:', status);
  // {
  //   mode: 'auto',
  //   isRunning: true,
  //   lastCandleTime: 1759774860000,
  //   currentPrice: 10.55,
  //   totalCandles: 6,
  //   uptime: 205000,
  //   activeManualControl: null
  // }
});
```

#### **mode_change**
Trading mode changes
```javascript
socket.on('mode_change', (data) => {
  console.log('Mode changed to:', data.mode);
  // { mode: 'auto', timestamp: 1759774860000 }
});
```

#### **manual_control**
Manual control updates
```javascript
socket.on('manual_control', (control) => {
  console.log('Manual control:', control);
  // {
  //   direction: 'up',
  //   speed: 0.02,
  //   intensity: 1.5,
  //   duration_seconds: 300,
  //   timestamp: 1759774860000
  // }
});
```

### **Client Events**

#### **subscribe**
Subscribe to symbol updates
```javascript
socket.emit('subscribe', { symbol: 'ZPHUSD' });
```

#### **unsubscribe**
Unsubscribe from symbol updates
```javascript
socket.emit('unsubscribe', { symbol: 'ZPHUSD' });
```

#### **ping**
Ping the server
```javascript
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Pong received:', data.timestamp);
});
```

---

## 📈 **TradingView Integration**

### **Complete Datafeed Implementation**

```javascript
class ZypherDatafeed {
  constructor() {
    this.socket = io('ws://localhost:3001');
    this.subscribers = new Map();
  }

  // TradingView Datafeed Interface
  onReady(callback) {
    fetch('http://localhost:3001/api/tradingview/config')
      .then(response => response.json())
      .then(data => {
        callback({
          exchanges: data.data.exchanges,
          symbols_types: data.data.symbols_types,
          supported_resolutions: data.data.supported_resolutions,
          supports_search: data.data.supports_search,
          supports_time: data.data.supports_time
        });
      });
  }

  resolveSymbol(symbolName, onSymbolResolvedCallback) {
    fetch(`http://localhost:3001/api/tradingview/symbols?symbol=${symbolName}`)
      .then(response => response.json())
      .then(data => {
        onSymbolResolvedCallback(data.data);
      });
  }

  getBars(symbolInfo, resolution, from, to, onHistoryCallback) {
    const url = `http://localhost:3001/api/tradingview/history?symbol=${symbolInfo.ticker}&resolution=${resolution}&from=${from}&to=${to}`;
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.s === 'ok') {
          onHistoryCallback(data.t.map((t, i) => ({
            time: t * 1000, // Convert to milliseconds
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v[i]
          })), { noData: false });
        } else {
          onHistoryCallback([], { noData: true });
        }
      });
  }

  subscribeBars(symbolInfo, resolution, onRealtimeCallback) {
    const key = `${symbolInfo.ticker}_${resolution}`;
    
    // Subscribe to WebSocket updates
    this.socket.emit('subscribe', { symbol: symbolInfo.ticker });
    
    this.socket.on('candle_update', (candle) => {
      if (candle.symbol === symbolInfo.ticker && candle.resolution === resolution) {
        onRealtimeCallback({
          time: candle.t,
          open: candle.o,
          high: candle.h,
          low: candle.l,
          close: candle.c,
          volume: candle.v
        });
      }
    });

    this.socket.on('price_update', (priceData) => {
      if (priceData.symbol === symbolInfo.ticker) {
        // Update current price for real-time display
        onRealtimeCallback({
          time: priceData.timestamp,
          close: priceData.price
        });
      }
    });

    this.socket.on('live_ohlc', (ohlcData) => {
      if (ohlcData.symbol === symbolInfo.ticker && ohlcData.resolution === resolution) {
        // Update live OHLC for current candle
        onRealtimeCallback({
          time: ohlcData.timestamp,
          open: ohlcData.open,
          high: ohlcData.high,
          low: ohlcData.low,
          close: ohlcData.close,
          volume: ohlcData.volume
        });
      }
    });

    this.subscribers.set(key, { symbolInfo, resolution, onRealtimeCallback });
  }

  unsubscribeBars(subscriberUID) {
    this.subscribers.delete(subscriberUID);
  }
}

// Initialize TradingView with Zypher Datafeed
const widget = new TradingView.widget({
  symbol: 'ZPHUSD',
  datafeed: new ZypherDatafeed(),
  interval: '1',
  container: 'tradingview_container',
  library_path: '/tradingview/',
  locale: 'en',
  disabled_features: ['use_localstorage_for_settings'],
  enabled_features: ['study_templates'],
  charts_storage_url: 'https://saveload.tradingview.com',
  charts_storage_api_version: '1.1',
  client_id: 'tradingview.com',
  user_id: 'public_user_id',
  fullscreen: false,
  autosize: true,
  studies_overrides: {}
});
```

### **Real-Time Chart Updates**

```javascript
// Connect to WebSocket for real-time updates
const socket = io('ws://localhost:3001');

// Listen for new candles (every 60 seconds)
socket.on('candle_update', (candle) => {
  console.log('New candle:', candle);
  // Update TradingView chart with new candle
  widget.chart().updateBar({
    time: candle.t,
    open: candle.o,
    high: candle.h,
    low: candle.l,
    close: candle.c,
    volume: candle.v
  });
});

// Listen for real-time price updates (every 1 second)
socket.on('price_update', (priceData) => {
  console.log('Price update:', priceData);
  // Update current price display
  document.getElementById('current-price').textContent = `$${priceData.price}`;
  document.getElementById('price-change').textContent = `${priceData.changePercent.toFixed(2)}%`;
});

// Listen for live OHLC updates (every 1 second)
socket.on('live_ohlc', (ohlcData) => {
  console.log('Live OHLC:', ohlcData);
  // Update live candle display
  document.getElementById('live-open').textContent = `$${ohlcData.open}`;
  document.getElementById('live-high').textContent = `$${ohlcData.high}`;
  document.getElementById('live-low').textContent = `$${ohlcData.low}`;
  document.getElementById('live-close').textContent = `$${ohlcData.close}`;
  document.getElementById('live-volume').textContent = ohlcData.volume.toFixed(2);
  document.getElementById('time-remaining').textContent = `${ohlcData.timeRemaining}s`;
  
  // Update TradingView chart with live OHLC
  widget.chart().updateBar({
    time: ohlcData.timestamp,
    open: ohlcData.open,
    high: ohlcData.high,
    low: ohlcData.low,
    close: ohlcData.close,
    volume: ohlcData.volume
  });
});
```

---

## ⚠️ **Error Responses**

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "data": {
    "error": "Detailed error information"
  }
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

---

## 🚀 **Quick Start Guide**

### **1. Start the Server**
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Server will be available at http://localhost:3001
```

### **2. Test Basic Endpoints**
```bash
# Health check
curl http://localhost:3001/api/health

# Get current price
curl http://localhost:3001/api/tradingview/price

# Get system status
curl http://localhost:3001/api/tradingview/status
```

### **3. Connect WebSocket**
```javascript
const socket = io('ws://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to Zypher Trading API');
  socket.emit('subscribe', { symbol: 'ZPHUSD' });
});

socket.on('candle_update', (candle) => {
  console.log('New candle:', candle);
});

socket.on('price_update', (priceData) => {
  console.log('Price update:', priceData);
});
```

### **4. Initialize TradingView Chart**
```javascript
const widget = new TradingView.widget({
  symbol: 'ZPHUSD',
  datafeed: new ZypherDatafeed(), // Use the implementation above
  interval: '1',
  container: 'tradingview_container',
  // ... other TradingView options
});
```

### **5. Monitor Real-Time Data**
- **Candles**: Generated every 60 seconds
- **Price Updates**: Every 1 second
- **WebSocket Events**: Instant updates
- **Historical Data**: Available via REST API

---

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Trading Configuration
AUTO_INTERVAL_MS=60000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### **Trading Parameters**
- **Base Price**: $10.00 (configurable)
- **Volatility**: 2% (configurable)
- **Auto Interval**: 60000ms (60 seconds = 1 minute)
- **Supported Resolutions**: 1m, 5m, 15m, 1H, 1D
- **Price Scale**: 100 (2 decimal places)
- **Symbol**: ZPHUSD
- **Candle Generation**: 1 candle per minute (proper trading intervals)

### **Candle Generation Behavior**
- **1-Minute Candles**: New candle generated every 60 seconds
- **Timestamp Alignment**: Candles are aligned to minute boundaries (e.g., 22:39:00, 22:40:00)
- **Real-time Updates**: WebSocket broadcasts new candles immediately when generated
- **Historical Data**: All candles stored with proper minute-based timestamps
- **TradingView Compatible**: Follows standard OHLCV format for professional charts

---

## 🚀 **Quick Start Summary**

### **Key Changes Made:**
- ✅ **Fixed Candle Generation**: Now generates 1 candle per minute (60 seconds) instead of 1 per second
- ✅ **Proper Timestamps**: Candles align to minute boundaries (22:39:00, 22:40:00, etc.)
- ✅ **Realistic Trading Data**: Follows standard OHLCV format for professional charts
- ✅ **Environment Configuration**: Added `AUTO_INTERVAL_MS=60000` for proper timing

### **Testing the Fix:**
```bash
# Check current status
curl http://localhost:3001/api/tradingview/status

# Switch to auto mode for proper 1-minute candles
curl -X POST http://localhost:3001/api/tradingview/mode \
  -H "Content-Type: application/json" \
  -d '{"mode":"auto"}'

# Wait 1 minute and check again - should see exactly 1 new candle
```

---

**🎯 This reference covers all the essential API endpoints and data formats for building your trading platform frontend!**
