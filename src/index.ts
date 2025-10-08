import app, { server, wsService, tradingService } from './app';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Zypher Trading Data API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Supabase test: http://localhost:${PORT}/api/supabase/test`);
      console.log(`📈 TradingView API: http://localhost:${PORT}/api/tradingview/config`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start trading service
    await tradingService.start();

    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await tradingService.stop();
      wsService.close();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await tradingService.stop();
      wsService.close();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
