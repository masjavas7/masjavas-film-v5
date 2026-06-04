import fs from 'fs';

const filePath = 'c:\\Users\\Masjavas\\Documents\\APLIKASI MASJAVAS FILM V5\\src\\pages\\ReviewPage.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 80; i < Math.min(lines.length, 120); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
