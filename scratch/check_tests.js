const fs = require('fs');
const path = require('path');

const testPath = path.join(__dirname, '..', 'tests', 'reward-calculator.test.ts');
const testContent = fs.readFileSync(testPath, 'utf8');

const query = 'axis-miles-and-more';
const lines = testContent.split('\n');

const matches = [];
lines.forEach((line, index) => {
  if (line.includes(query)) {
    matches.push({ lineNum: index + 1, content: line.trim() });
  }
});

console.log(`Found ${matches.length} matches for "${query}":`);
matches.forEach(m => console.log(`Line ${m.lineNum}: ${m.content}`));
