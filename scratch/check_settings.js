import { settingsService } from '../server/services/settingsService.js';
import dotenv from 'dotenv';
import path from 'path';

// Try to load server/.env manually
dotenv.config({ path: path.resolve('server/.env') });

const settings = settingsService.getSettings();
console.log('Current Settings:', {
  apiKey: settings.apiKey ? '***' + settings.apiKey.slice(-4) : 'none',
  apiBaseUrl: settings.apiBaseUrl,
  geminiApiKey: settings.geminiApiKey ? '***' + settings.geminiApiKey.slice(-4) : 'none',
  geminiBaseUrl: settings.geminiBaseUrl
});

console.log('Process Env variables:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '***' + process.env.GEMINI_API_KEY.slice(-4) : 'none');
console.log('PORT:', process.env.PORT);
