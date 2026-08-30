import app from './app';
import { config } from './config';
import { checkSupabaseConnection } from './services/supabase';

// Only listen if not running as a Vercel Serverless Function
let server: any;
if (process.env.VERCEL !== '1') {
  server = app.listen(config.PORT, () => {
    console.log(`=========================================`);
    console.log(`Artisera API Node.js server running...`);
    console.log(`Port: ${config.PORT}`);
    console.log(`Environment: ${config.ENVIRONMENT}`);
    console.log(`LLM Provider: ${config.LLM_PROVIDER}`);
    console.log(`Supabase URL: ${config.SUPABASE_URL}`);
    console.log(`=========================================`);
    checkSupabaseConnection();
  });
}

// Handle graceful shutdowns
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  if (server) {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
