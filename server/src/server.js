import config from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  await connectDatabase();
  console.log('connected to MongoDB');

  const app = createApp();

  // config.host defaults to 0.0.0.0 rather than localhost: a physical phone on
  // the same Wi-Fi reaches this machine over the LAN IP, and a server bound to
  // 127.0.0.1 is invisible to it.
  const server = app.listen(config.port, config.host, () => {
    console.log(`API listening on http://${config.host}:${config.port}`);
    if (config.host === '0.0.0.0') {
      console.log('For the phone, use this machine\'s LAN IP, not 127.0.0.1.');
    }
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Failed to start:', error.message);
  if (error.message.includes('ECONNREFUSED')) {
    console.error('Is MongoDB running? Check MONGODB_URI in your .env.');
  }
  process.exit(1);
});
