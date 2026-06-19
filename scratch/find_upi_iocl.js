const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\manpr\\.gemini\\antigravity-cli\\brain\\a2548086-4cc8-4879-9b59-6785f4dc6d58\\.system_generated\\steps\\7490\\content.md';
const content = fs.readFileSync(contentPath, 'utf8');

// Find all matches for UPI
const regex = /[^.\n]*UPI[^.\n]*/gi;
const matches = content.match(regex);
if (matches) {
  const unique = Array.from(new Set(matches.map(m => m.trim().replace(/<[^>]+>/g, ' '))));
  unique.forEach(m => console.log(' -', m));
} else {
  console.log('No UPI matches found');
}
