const fs = require('fs');
const path = require('path');

const FORBIDDEN_TERMS = [/provider/i, /token/i, /queue/i, /model/i, /validator/i, /secret/i, /pipeline/i];

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(fullPath, results);
      }
    } else {
      if (/\.(tsx|ts|jsx|js)$/.test(file)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '..', 'src'));
console.log(`Searching ${files.length} files for technical terms...`);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Skip import lines, typescript type definitions, or comments if they are obviously code
    if (line.trim().startsWith('import') || line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    FORBIDDEN_TERMS.forEach(term => {
      if (term.test(line)) {
        // Exclude internal code declarations like "useProjectFlowStore" or model name params, but flag UI text or state strings
        // Just print matches so we can analyze
        console.log(`${path.basename(file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  });
});
