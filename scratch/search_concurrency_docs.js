import fs from 'fs';
import path from 'path';

const docsDir = 'c:\\Users\\Masjavas\\Documents\\APLIKASI MASJAVAS FILM V5\\docs';
const files = fs.readdirSync(docsDir);

const keywords = ['rate', 'limit', 'antrean', 'queue', 'concurrency', 'paralel', 'concurrent', 'delay', 'detik', 'wait'];

files.forEach(file => {
  if (file.endsWith('.md')) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n=== Searching in ${file} ===`);
    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      if (keywords.some(kw => lower.includes(kw))) {
        console.log(`Line ${idx + 1}: ${line.trim().slice(0, 150)}`);
      }
    });
  }
});
