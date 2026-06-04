import { config } from './config/env.js';
import { createApp } from './app.js';

// Buat instansi Express dengan konfigurasi dev biasa
const app = createApp({
  port: config.PORT
});

// Jalankan server listen
app.listen(config.PORT, () => {
  console.log(`=============================================`);
  console.log(` MASJAVAS AI API Gateway proxy (DEV MODE)    `);
  console.log(` Port: ${config.PORT}                        `);
  console.log(` Base API Url: http://localhost:${config.PORT} `);
  console.log(`=============================================`);
});
