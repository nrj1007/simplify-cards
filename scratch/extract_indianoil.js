const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\manpr\\.gemini\\antigravity-cli\\brain\\a2548086-4cc8-4879-9b59-6785f4dc6d58\\.system_generated\\steps\\7490\\content.md';

if (!fs.existsSync(contentPath)) {
  console.error('File not found:', contentPath);
  process.exit(1);
}

const lines = fs.readFileSync(contentPath, 'utf8').split('\n');
console.log('Total lines:', lines.length);

const keywords = ['reward', 'point', 'cap', 'exclus', 'limit', 'fuel', 'grocer', 'utilit', 'fee', 'lounge', 'eligib', 'surcharge', 'waiver', 'joining', 'annual', 'age', 'income', 'itr'];
const matches = [];

lines.forEach((line, index) => {
  const lower = line.toLowerCase();
  if (keywords.some(k => lower.includes(k))) {
    const cleaned = line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length > 10) {
      matches.push({ lineNum: index + 1, text: cleaned });
    }
  }
});

console.log('Found matches:', matches.length);
fs.writeFileSync(path.join(__dirname, 'indianoil_matches.txt'), JSON.stringify(matches, null, 2));
console.log('Saved matches to indianoil_matches.txt');
