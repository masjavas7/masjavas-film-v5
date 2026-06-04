import fs from 'fs';
import path from 'path';

const srcDir = 'c:\\Users\\Masjavas\\Documents\\APLIKASI MASJAVAS FILM V5\\src';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      searchDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('generateStoryboard') || content.includes('storyboard') || content.includes('generateProjectScenes')) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('generateStoryboard') || line.includes('Promise.all')) {
            console.log(`${path.relative(srcDir, filePath)}:Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchDir(srcDir);
