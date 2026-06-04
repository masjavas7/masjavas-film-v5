import fs from 'fs';
import path from 'path';

const walkthroughPath = 'C:\\Users\\Masjavas\\.gemini\\antigravity\\brain\\ed8ef459-adb3-4d6f-927e-eaba22c592c6\\walkthrough.md';
const content = fs.readFileSync(walkthroughPath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.startsWith('#')) {
    console.log(`${index + 1}: ${line}`);
  }
});
