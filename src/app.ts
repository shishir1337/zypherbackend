import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';

import healthRoutes from './routes/health';
import supabaseRoutes from './routes/supabase';
import redisRoutes from './routes/redis';
import tradingViewRoutes from './routes/tradingview';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { WebSocketService } from './services/websocketService';
import { TradingService } from './services/tradingService';

dotenv.config();

const app: Express = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize services
const wsService = new WebSocketService(server);
const tradingService = new TradingService();

// Connect WebSocket service to trading service
tradingService.setWebSocketService(wsService);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/supabase', supabaseRoutes);
app.use('/api/redis', redisRoutes);
app.use('/api/tradingview', tradingViewRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Make services available globally for routes
app.locals.wsService = wsService;
app.locals.tradingService = tradingService;

export default app;
export { server, wsService, tradingService };
