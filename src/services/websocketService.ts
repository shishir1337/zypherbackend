import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Candle, WebSocketCandleUpdate } from '../types/trading';

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Set<string> = new Set();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Configure this for production
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send current status to newly connected client
      socket.emit('connected', {
        message: 'Connected to Zypher Trading Data API',
        timestamp: Date.now()
      });

      // Handle client joining symbol room
      socket.on('subscribe', (data: { symbol: string }) => {
        if (data.symbol) {
          socket.join(data.symbol);
          console.log(`Client ${socket.id} subscribed to ${data.symbol}`);
          socket.emit('subscribed', { symbol: data.symbol });
        }
      });

      // Handle client leaving symbol room
      socket.on('unsubscribe', (data: { symbol: string }) => {
        if (data.symbol) {
          socket.leave(data.symbol);
          console.log(`Client ${socket.id} unsubscribed from ${data.symbol}`);
          socket.emit('unsubscribed', { symbol: data.symbol });
        }
      });

      // Handle client disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });

    console.log('WebSocket service initialized');
  }

  /**
   * Broadcast new candle to all connected clients
   */
  public broadcastCandle(candle: Candle): void {
    const update: WebSocketCandleUpdate = {
      symbol: candle.symbol,
      t: candle.timestamp,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
      v: candle.volume,
      mode: candle.mode,
      resolution: candle.resolution
    };

    // Broadcast to all clients
    this.io.emit('candle_update', update);

    // Broadcast to specific symbol room
    this.io.to(candle.symbol).emit('candle_update', update);

    console.log(`Broadcasted candle update for ${candle.symbol}: $${candle.close}`);
  }

  /**
   * Broadcast system status update
   */
  public broadcastSystemStatus(status: any): void {
    this.io.emit('system_status', {
      ...status,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast trading mode change
   */
  public broadcastModeChange(mode: 'auto' | 'manual'): void {
    this.io.emit('mode_change', {
      mode,
      timestamp: Date.now()
    });

    console.log(`Broadcasted mode change: ${mode}`);
  }

  /**
   * Broadcast manual control update
   */
  public broadcastManualControl(control: any): void {
    this.io.emit('manual_control', {
      ...control,
      timestamp: Date.now()
    });

    console.log(`Broadcasted manual control: ${control.direction}`);
  }

  /**
   * Send message to specific client
   */
  public sendToClient(clientId: string, event: string, data: any): void {
    this.io.to(clientId).emit(event, data);
  }

  /**
   * Send message to all clients in a symbol room
   */
  public sendToSymbol(symbol: string, event: string, data: any): void {
    this.io.to(symbol).emit(event, data);
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get all connected client IDs
   */
  public getConnectedClients(): string[] {
    return Array.from(this.connectedClients);
  }

  /**
   * Broadcast error message
   */
  public broadcastError(error: string, details?: any): void {
    this.io.emit('error', {
      error,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast info message
   */
  public broadcastInfo(message: string, data?: any): void {
    this.io.emit('info', {
      message,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Broadcast real-time price update to all connected clients
   */
  public broadcastPriceUpdate(priceData: {
    symbol: string;
    price: number;
    timestamp: number;
    change: number;
    changePercent: number;
  }): void {
    this.io.emit('price_update', priceData);
  }

  /**
   * Broadcast live real-time OHLC update (current candle forming)
   */
  public broadcastLiveOHLC(ohlcData: {
    symbol: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    resolution: string;
    timeRemaining: number; // seconds until candle closes
  }): void {
    this.io.emit('live_ohlc', ohlcData);
    
    // Also broadcast to specific symbol room
    this.io.to(ohlcData.symbol).emit('live_ohlc', ohlcData);
    
    console.log(`Broadcasted live OHLC for ${ohlcData.symbol}: O=${ohlcData.open} H=${ohlcData.high} L=${ohlcData.low} C=${ohlcData.close} (${ohlcData.timeRemaining}s remaining)`);
  }

  /**
   * Close WebSocket service
   */
  public close(): void {
    this.io.close();
    console.log('WebSocket service closed');
  }
}
